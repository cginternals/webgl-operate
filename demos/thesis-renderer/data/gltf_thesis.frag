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

@import ../../../source/shaders/facade.frag;
@import ../../../source/shaders/arealight;
@import ../../../source/shaders/tonemapping;
@import ../../../source/shaders/shadowpass;

#line 17

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

const float c_MinRoughness = 0.04;

uniform sampler2D u_baseColor;
uniform sampler2D u_metallicRoughness;
uniform sampler2D u_normal;
uniform sampler2D u_emissive;
uniform sampler2D u_occlusion;

uniform samplerCube u_diffuseEnvironment;
uniform samplerCube u_specularEnvironment;
uniform sampler2D u_brdfLUT;
uniform sampler2D u_shadowMap;
uniform sampler2D u_lastFrame;
uniform sampler2D u_normalDepth;

#define MAX_LIGHTS 6
uniform int u_numSphereLights;
uniform SphereLight u_sphereLights[MAX_LIGHTS];
uniform int u_numDiskLights;
uniform DiskLight u_diskLights[MAX_LIGHTS];

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
uniform int u_blendMode;
uniform float u_blendCutoff;

uniform mediump int u_geometryFlags;
uniform mediump int u_pbrFlags;
uniform vec3 u_eye;
uniform vec2 u_lightNearFar;
uniform mat4 u_lightView;
uniform mat4 u_lightProjection;

uniform mat4 u_viewProjection;
uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat3 u_viewNormalMatrix;
uniform vec2 u_cameraNearFar;

uniform int u_frameNumber;
uniform int u_debugMode;
uniform float u_iblStrength;
uniform float u_occlusionRange;

varying vec2 v_uv[3];
varying vec4 v_color;
varying vec3 v_position;

varying mat3 v_TBN;
varying vec3 v_normal;

bool checkGeometryFlag(int flag) {
    return (u_geometryFlags & flag) == flag;
}

bool checkFlag(int flag) {
    return (u_pbrFlags & flag) == flag;
}

// Find the normal for this fragment, pulling either from a predefined normal map
// or from the interpolated mesh normal and tangent attributes.
vec3 getNormal()
{
    mat3 TBN;
    // Retrieve the tangent space matrix
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
            TBN = mat3(t, b, ng);
        }
    else { // HAS_TANGENTS
        TBN = v_TBN;
    }

    vec3 n;
    if (checkFlag(HAS_NORMALMAP)) {
        n = texture(u_normal, v_uv[u_normalTexCoord]).rgb;
        n = normalize(TBN * ((2.0 * n - 1.0) * vec3(u_normalScale, u_normalScale, 1.0)));
    } else {
        // The tbn matrix is linearly interpolated, so we need to re-normalize
        n = normalize(TBN[2].xyz);
    }

    // reverse backface normals
    n *= (2.0 * float(gl_FrontFacing) - 1.0);

    return n;
}

vec3 sampleOcclusion(LightingInfo info, vec3 viewPosition, vec3 viewSampleOffset, out bool hit) {
    vec3 viewSamplePoint = viewPosition + viewSampleOffset;
    vec4 ndcSamplePoint = u_projection * vec4(viewSamplePoint, 1.0);
    vec2 sampleUV = (ndcSamplePoint / ndcSamplePoint.w).xy * 0.5 + 0.5;
    float sampleDepth = length(viewSamplePoint);

    vec4 normalDepth = texture(u_normalDepth, sampleUV);
    vec3 hitNormal = normalDepth.rgb;
    float compareDepth = normalDepth.a;

    // TODO: figure out math to get real sampled point
    // vec3 sampledPoint = vec3(viewSamplePoint.xy, compareDepth);
    vec3 sampledPoint = viewSamplePoint;
    vec3 direction = normalize(sampledPoint - viewPosition);

    // range check fixes halos when depths are very different
    float rangeCheck = abs(compareDepth - sampleDepth) < u_occlusionRange ? 1.0 : 0.0;
    float check = step(compareDepth, sampleDepth) * rangeCheck;

    float cosOutgoing = clamp(dot(direction, normalize(u_viewNormalMatrix * -hitNormal)), 0.0, 1.0);
    float cosIncoming = clamp(dot(direction, normalize(u_viewNormalMatrix * info.incidentNormal)), 0.0, 1.0);
    float bounceDistance = max(length(sampledPoint - viewPosition), 0.5);

    hit = true;
    if (check <= 0.0) {
        hit = false;
        return vec3(0.0);
    }

    return texture(u_lastFrame, sampleUV).rgb * cosIncoming * cosOutgoing / bounceDistance;
}

mat3 generateTBN(LightingInfo info) {
    // generate matrix to transform from tangent to view space
    vec3 viewNormal = normalize(u_viewNormalMatrix * info.incidentNormal);
    vec3 random = normalize(vec3(0.0, 1.0, 1.0));
    vec3 t = normalize(random - viewNormal * dot(random, viewNormal));
    vec3 b = cross(viewNormal, t);
    return mat3(t, b, viewNormal);
}

vec3 ssaoSample(LightingInfo info, mat3 TBN, out bool hit) {
    vec3 viewPosition = (u_view * vec4(info.incidentPosition, 1.0)).xyz;

    float random1 = rand(vec2(float(u_frameNumber + 1) * 73.8, float(u_frameNumber + 1) * 54.9) * info.uv);
    float random2 = rand(vec2(float(u_frameNumber + 1) * 23.1, float(u_frameNumber + 1) * 94.3) * info.uv);
    float random3 = rand(vec2(float(u_frameNumber + 1) * 94.5, float(u_frameNumber + 1) * 23.8) * info.uv);

    vec3 viewSampleOffset = TBN * uniformSampleHemisphere(random1, random2);
    viewSampleOffset *= u_occlusionRange * random3;

    return sampleOcclusion(info, viewPosition, viewSampleOffset, hit);
}

vec3 ssrSample(LightingInfo info, mat3 TBN, out bool hit) {
    vec3 viewPosition = (u_view * vec4(info.incidentPosition, 1.0)).xyz;

    float random1 = rand(vec2(float(u_frameNumber + 1) * 73.8, float(u_frameNumber + 1) * 54.9) * info.uv);
    float random2 = rand(vec2(float(u_frameNumber + 1) * 23.1, float(u_frameNumber + 1) * 94.3) * info.uv);
    float random3 = rand(vec2(float(u_frameNumber + 1) * 94.5, float(u_frameNumber + 1) * 23.8) * info.uv);

    vec3 viewHalfNormal = TBN * importanceSampleGGX(vec2(random1, random2), info.alphaRoughnessSq);
    vec3 viewSampleOffset = reflect(-u_viewNormalMatrix * info.view, viewHalfNormal);
    viewSampleOffset *= u_occlusionRange * random3;

    return sampleOcclusion(info, viewPosition, viewSampleOffset, hit);
}

vec3 getIBLContribution(LightingInfo info, bool applyOcclusion)
{
    float NdotV = clamp(dot(info.incidentNormal, info.view), 0.0, 1.0);

    // TODO: pass uniform for mip count
    const float MIP_COUNT = 8.0;
    float lod = clamp(info.perceptualRoughness * MIP_COUNT, 0.0, MIP_COUNT);
    vec3 reflection = normalize(reflect(-info.view, info.incidentNormal));

    vec2 brdfSamplePoint = vec2(NdotV, info.perceptualRoughness);
    vec2 brdf = texture(u_brdfLUT, brdfSamplePoint).rg;

    vec4 diffuseSample = texture(u_diffuseEnvironment, info.incidentNormal);
    vec4 specularSample = textureLod(u_specularEnvironment, reflection, lod);

    vec3 diffuseLight = SRGBtoLINEAR(diffuseSample).rgb * u_iblStrength;
    vec3 specularLight = SRGBtoLINEAR(specularSample).rgb * u_iblStrength;

    mat3 TBN = generateTBN(info);

    vec3 diffuseReflection = vec3(0.0);
    bool diffuseReflectionHit = false;
    vec3 specularReflection = vec3(0.0);
    bool specularReflectionHit = false;
    if (applyOcclusion) {
        diffuseReflection = ssaoSample(info, TBN, diffuseReflectionHit);
        specularReflection = ssrSample(info, TBN, specularReflectionHit);
    }

    vec3 diffuse = diffuseLight * info.diffuseColor;
    vec3 specular = specularLight * (info.specularColor * brdf.x + brdf.y);

    if (diffuseReflectionHit) {
        diffuse = diffuseReflection * info.diffuseColor;
    }
    if (specularReflectionHit) {
        specular = specularReflection * info.specularColor;
    }

    return diffuse + specular;
}

void main(void)
{
    // The albedo may be defined from a base texture or a flat color
    vec4 baseColor;
    if (checkFlag(HAS_BASECOLORMAP)) {
        baseColor = SRGBtoLINEAR(texture(u_baseColor, v_uv[u_baseColorTexCoord])) * u_baseColorFactor;
    } else {
        baseColor = u_baseColorFactor;
    }

    if (u_debugMode == 1) { // flat
        fragColor = vec4(baseColor.rgb, 1.0);
        return;
    }

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

    if (u_debugMode == 4) { // Illuminance
        baseColor = vec4(1.0);
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

    vec3 N = getNormal(); // normal at surface point
    vec3 V = normalize(u_eye - v_position); // Vector from surface point to camera

    vec4 ndcPosition = u_viewProjection * vec4(v_position, 1.0);
    vec2 uv = (ndcPosition / ndcPosition.w).xy * 0.5 + 0.5;

    LightingInfo info = LightingInfo(
        v_position,
        N,
        V,
        uv,

        diffuseColor,
        specularColor,
        specularEnvironmentR0,
        specularEnvironmentR90,
        perceptualRoughness,
        alphaRoughness,
        alphaRoughness * alphaRoughness
    );

    vec3 color = vec3(0.0);
    vec3 lightSources = vec3(0.0);

    // Sphere lights
    for (int i = 0; i < u_numSphereLights; ++i) {
        lightSources += diffuseSphereLightApproximated(u_sphereLights[i], info);
        lightSources += specularSphereLightKaris(u_sphereLights[i], info);
    }

    // Disk lights with shadow mapping
    if (u_frameNumber > 0) {
        vec4 vLightViewSpace = u_lightView * vec4(v_position, 1.0);
        vec4 vLightViewProjectionSpace = u_lightProjection * vLightViewSpace;

        float lightDepth = clamp((length(vLightViewSpace.xyz) - u_lightNearFar[0]) / (u_lightNearFar[1] - u_lightNearFar[0]), 0.0, 1.0);
        vec2 shadowUv = (vLightViewProjectionSpace.xy / vLightViewProjectionSpace.w) * 0.5 + 0.5;

        const float shadowBias = -0.0003;
        float visibility = hardShadowCompare(u_shadowMap, shadowUv, lightDepth, shadowBias);

        if (any(greaterThan(shadowUv, vec2(1.0))) || any(lessThan(shadowUv, vec2(0.0)))) {
            visibility = 1.0;
        }

        int currentLight = u_frameNumber % u_numDiskLights;
        lightSources += diffuseDiskLightApproximated(u_diskLights[currentLight], info) * float(u_numDiskLights) * visibility;
        lightSources += specularDiskLightKaris(u_diskLights[currentLight], info) * float(u_numDiskLights) * visibility;
    }

    color += lightSources;

    // Environment lighting
    bool applyOcclusion = u_frameNumber > 0;
    vec3 environmentLight = getIBLContribution(info, applyOcclusion);
    color += environmentLight;

    // Emissive lighting
    if (checkFlag(HAS_EMISSIVEMAP)) {
        vec3 emissive = SRGBtoLINEAR(texture(u_emissive, v_uv[u_emissiveTexCoord])).rgb * u_emissiveFactor;
        color += emissive;
    }

    // NOTE: the spec mandates to ignore any alpha value in 'OPAQUE' mode
    float alpha = 1.0;
    if (u_blendMode == 1) {
        if (baseColor.a < u_blendCutoff) {
            discard;
        }
    }
    else if (u_blendMode == 2) {
        alpha = baseColor.a;
    }

    // Workaround: lighting produces inf or nan, find out where
    if (any(isinf(color)) || any(isnan(color))) {
        color = vec3(0.0);
    }

    fragColor = vec4(color * alpha, alpha);

    if (u_debugMode == 2) { // IBL
        fragColor = vec4(environmentLight, alpha);
    }
    else if (u_debugMode == 3) { // Light sources
        fragColor = vec4(lightSources, alpha);
    }
}
