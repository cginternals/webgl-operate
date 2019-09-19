precision highp float;

// Adapted from https://github.com/KhronosGroup/glTF-WebGL-PBR
// References:
// [1] Real Shading in Unreal Engine 4
//     http://blog.selfshadow.com/publications/s2013-shading-course/karis/s2013_pbs_epic_notes_v2.pdf
// [2] Physically Based Shading at Disney
//     http://blog.selfshadow.com/publications/s2012-shading-course/burley/s2012_pbs_disney_brdf_notes_v3.pdf
// [3] README.md - Environment Maps
//     https://github.com/KhronosGroup/glTF-WebGL-PBR/#environment-maps
// [4] "An Inexpensive BRDF Model for Physically based Rendering" by Christophe Schlick
//     https://www.cs.virginia.edu/~jdl/bib/appearance/analytic%20models/schlick94b.pdf

@import ../../shaders/facade.frag;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

const int HAS_NORMALS           = 1;
const int HAS_TANGENTS          = 1 << 1;
const int HAS_UV                = 1 << 2;
const int HAS_COLORS            = 1 << 3;
const int USE_IBL               = 1 << 4;
const int HAS_BASECOLORMAP      = 1 << 5;
const int HAS_NORMALMAP         = 1 << 6;
const int HAS_EMISSIVEMAP       = 1 << 7;
const int HAS_METALROUGHNESSMAP = 1 << 8;
const int HAS_OCCLUSIONMAP      = 1 << 9;
const int USE_TEX_LOD           = 1 << 10;

const vec3 u_LightDirection = vec3(0.2, 1.0, 0.2);
const vec3 u_LightColor = vec3(1, 1, 1);

const float M_PI = 3.141592653589793;
const float c_MinRoughness = 0.04;

uniform sampler2D u_baseColor;
uniform sampler2D u_metallicRoughness;
uniform sampler2D u_normal;
uniform sampler2D u_emissive;
uniform sampler2D u_occlusion;

uniform int u_baseColorTexCoord;
uniform int u_normalTexCoord;
uniform int u_metallicRoughnessTexCoord;
uniform int u_occlusionTexCoord;
uniform int u_emissiveTexCoord;

uniform vec4 u_baseColorFactor;
uniform float u_metallicFactor;
uniform float u_roughnessFactor;
uniform vec3 u_emissiveFactor;
uniform float u_normalScale;

uniform mediump int u_geometryFlags;
uniform mediump int u_pbrFlags;
uniform vec3 u_eye;

varying vec2 v_uv[2];
varying vec4 v_color;
varying vec3 v_position;

varying mat3 v_TBN;
varying vec3 v_normal;

// Encapsulate the various inputs used by the various functions in the shading equation
// We store values in this struct to simplify the integration of alternative implementations
// of the shading terms, outlined in the Readme.MD Appendix.
struct PBRInfo
{
    float NdotL;                  // cos angle between normal and light direction
    float NdotV;                  // cos angle between normal and view direction
    float NdotH;                  // cos angle between normal and half vector
    float LdotH;                  // cos angle between light direction and half vector
    float VdotH;                  // cos angle between view direction and half vector
    float perceptualRoughness;    // roughness value, as authored by the model creator (input to shader)
    float metalness;              // metallic value at the surface
    vec3 reflectance0;            // full reflectance color (normal incidence angle)
    vec3 reflectance90;           // reflectance color at grazing angle
    float alphaRoughness;         // roughness mapped to a more linear change in the roughness (proposed by [2])
    vec3 diffuseColor;            // color contribution from diffuse lighting
    vec3 specularColor;           // color contribution from specular lighting
};

bool checkGeometryFlag(int flag) {
    return (u_geometryFlags & flag) == flag;
}

bool checkFlag(int flag) {
    return (u_pbrFlags & flag) == flag;
}

vec4 SRGBtoLINEAR(vec4 srgbIn)
{
    #ifdef MANUAL_SRGB
    #ifdef SRGB_FAST_APPROXIMATION
    vec3 linOut = pow(srgbIn.xyz,vec3(2.2));
    #else //SRGB_FAST_APPROXIMATION
    vec3 bLess = step(vec3(0.04045),srgbIn.xyz);
    vec3 linOut = mix( srgbIn.xyz/vec3(12.92), pow((srgbIn.xyz+vec3(0.055))/vec3(1.055),vec3(2.4)), bLess );
    #endif //SRGB_FAST_APPROXIMATION
    return vec4(linOut,srgbIn.w);;
    #else //MANUAL_SRGB
    return srgbIn;
    #endif //MANUAL_SRGB
}

// Find the normal for this fragment, pulling either from a predefined normal map
// or from the interpolated mesh normal and tangent attributes.
vec3 getNormal()
{
    // Retrieve the tangent space matrix
    mat3 tbn;
    if (!checkGeometryFlag(HAS_TANGENTS)) {
        vec3 pos_dx = dFdx(v_position);
        vec3 pos_dy = dFdy(v_position);
        vec3 tex_dx = dFdx(vec3(v_uv[0], 0.0));
        vec3 tex_dy = dFdy(vec3(v_uv[0], 0.0));
        vec3 t = (tex_dy.t * pos_dx - tex_dx.t * pos_dy) / (tex_dx.s * tex_dy.t - tex_dy.s * tex_dx.t);

        vec3 ng;
        if (checkGeometryFlag(HAS_NORMALS))
            ng = normalize(v_normal);
        else
            ng = cross(pos_dx, pos_dy);

            t = normalize(t - ng * dot(ng, t));
            vec3 b = normalize(cross(ng, t));
            tbn = mat3(t, b, ng);
        }
    else { // HAS_TANGENTS
        tbn = v_TBN;
    }

    vec3 n;
    if (checkFlag(HAS_NORMALMAP)) {
        n = texture(u_normal, v_uv[u_normalTexCoord]).rgb;
        n = normalize(tbn * ((2.0 * n - 1.0) * vec3(u_normalScale, u_normalScale, 1.0)));
    } else {
        // The tbn matrix is linearly interpolated, so we need to re-normalize
        n = normalize(tbn[2].xyz);
    }

    // reverse backface normals
    n *= (2.0 * float(gl_FrontFacing) - 1.0);

    return n;
}

// Basic Lambertian diffuse
// Implementation from Lambert's Photometria https://archive.org/details/lambertsphotome00lambgoog
// See also [1], Equation 1
vec3 diffuse(PBRInfo pbrInputs)
{
    return pbrInputs.diffuseColor / M_PI;
}

 // The following equation models the Fresnel reflectance term of the spec equation (aka F())
// Implementation of fresnel from [4], Equation 15
vec3 specularReflection(PBRInfo pbrInputs)
{
    return pbrInputs.reflectance0 + (pbrInputs.reflectance90 - pbrInputs.reflectance0) * pow(clamp(1.0 - pbrInputs.VdotH, 0.0, 1.0), 5.0);
}

 // This calculates the specular geometric attenuation (aka G()),
// where rougher material will reflect less light back to the viewer.
// This implementation is based on [1] Equation 4, and we adopt their modifications to
// alphaRoughness as input as originally proposed in [2].
float geometricOcclusion(PBRInfo pbrInputs)
{
    float NdotL = pbrInputs.NdotL;
    float NdotV = pbrInputs.NdotV;
    float r = pbrInputs.alphaRoughness;

    float attenuationL = 2.0 * NdotL / (NdotL + sqrt(r * r + (1.0 - r * r) * (NdotL * NdotL)));
    float attenuationV = 2.0 * NdotV / (NdotV + sqrt(r * r + (1.0 - r * r) * (NdotV * NdotV)));
    return attenuationL * attenuationV;
}

 // The following equation(s) model the distribution of microfacet normals across the area being drawn (aka D())
// Implementation from "Average Irregularity Representation of a Roughened Surface for Ray Reflection" by T. S. Trowbridge, and K. P. Reitz
// Follows the distribution function recommended in the SIGGRAPH 2013 course notes from EPIC Games [1], Equation 3.
float microfacetDistribution(PBRInfo pbrInputs)
{
    float roughnessSq = pbrInputs.alphaRoughness * pbrInputs.alphaRoughness;
    float f = (pbrInputs.NdotH * roughnessSq - pbrInputs.NdotH) * pbrInputs.NdotH + 1.0;
    return roughnessSq / (M_PI * f * f);
}

void main(void)
{
    float perceptualRoughness = u_roughnessFactor;
    float metallic = u_metallicFactor;
    if (checkFlag(HAS_METALROUGHNESSMAP)) {
        // Roughness is stored in the 'g' channel, metallic is stored in the 'b' channel.
        // This layout intentionally reserves the 'r' channel for (optional) occlusion map data
        vec4 mrSample = texture(u_metallicRoughness, v_uv[u_metallicRoughnessTexCoord]);
        perceptualRoughness = mrSample.g * perceptualRoughness;
        metallic = mrSample.b * metallic;
    }
    perceptualRoughness = clamp(perceptualRoughness, c_MinRoughness, 1.0);
    metallic = clamp(metallic, 0.0, 1.0);
    // Roughness is authored as perceptual roughness; as is convention,
    // convert to material roughness by squaring the perceptual roughness [2].
    float alphaRoughness = perceptualRoughness * perceptualRoughness;

     // The albedo may be defined from a base texture or a flat color
    vec4 baseColor;
    if (checkFlag(HAS_BASECOLORMAP)) {
        baseColor = SRGBtoLINEAR(texture(u_baseColor, v_uv[u_baseColorTexCoord])) * u_baseColorFactor;
    } else {
        baseColor = u_baseColorFactor;
    }

    // spec: COLOR_0 ... acts as an additional linear multiplier to baseColor
    // TODO!: distinguish vec3/vec4 colors...
    baseColor *= vec4(v_color.rgb, 1.0);

    vec3 f0 = vec3(0.04);
    vec3 diffuseColor = baseColor.rgb * (vec3(1.0) - f0);
    diffuseColor *= 1.0 - metallic;
    vec3 specularColor = mix(f0, baseColor.rgb, metallic);

    // Compute reflectance.
    float reflectance = max(max(specularColor.r, specularColor.g), specularColor.b);

    // For typical incident reflectance range (between 4% to 100%) set the grazing reflectance to 100% for typical fresnel effect.
    // For very low reflectance range on highly diffuse objects (below 4%), incrementally reduce grazing reflecance to 0%.
    float reflectance90 = clamp(reflectance * 25.0, 0.0, 1.0);
    vec3 specularEnvironmentR0 = specularColor.rgb;
    vec3 specularEnvironmentR90 = vec3(1.0, 1.0, 1.0) * reflectance90;

    vec3 n = getNormal();                         // normal at surface point
    vec3 v = normalize(u_eye - v_position);        // Vector from surface point to camera
    vec3 l = normalize(u_LightDirection);          // Vector from surface point to light
    vec3 h = normalize(l+v);                       // Half vector between both l and v
    vec3 reflection = -normalize(reflect(v, n));

    float NdotL = clamp(dot(n, l), 0.001, 1.0);
    float NdotV = abs(dot(n, v)) + 0.001;
    float NdotH = clamp(dot(n, h), 0.0, 1.0);
    float LdotH = clamp(dot(l, h), 0.0, 1.0);
    float VdotH = clamp(dot(v, h), 0.0, 1.0);

    PBRInfo pbrInputs = PBRInfo(
        NdotL,
        NdotV,
        NdotH,
        LdotH,
        VdotH,
        perceptualRoughness,
        metallic,
        specularEnvironmentR0,
        specularEnvironmentR90,
        alphaRoughness,
        diffuseColor,
        specularColor
    );

     // Calculate the shading terms for the microfacet specular shading model
    vec3 F = specularReflection(pbrInputs);
    float G = geometricOcclusion(pbrInputs);
    float D = microfacetDistribution(pbrInputs);

     // Calculation of analytical lighting contribution
    vec3 diffuseContrib = (1.0 - F) * diffuse(pbrInputs);
    vec3 specContrib = F * G * D / (4.0 * NdotL * NdotV);
    // Obtain final intensity as reflectance (BRDF) scaled by the energy of the light (cosine law)
    vec3 color = NdotL * u_LightColor * (diffuseContrib + specContrib);

    if (checkFlag(HAS_EMISSIVEMAP)) {
        vec3 emissive = SRGBtoLINEAR(texture(u_emissive, v_uv[u_emissiveTexCoord])).rgb * u_emissiveFactor;
        color += emissive;
    }

    // NOTE: the spec mandates to ignore any alpha value in 'OPAQUE' mode
    float alpha = 1.0;
    // float alpha = mix(1.0, baseColor.a, u_AlphaBlend);
    // if (u_AlphaCutoff > 0.0) {
    //     alpha = step(u_AlphaCutoff, baseColor.a);
    // }
    fragColor = vec4(pow(color, vec3(1.0/2.2)), alpha);
}
