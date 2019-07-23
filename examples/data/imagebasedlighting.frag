
precision lowp float;

@import ../../source/shaders/facade.frag;


uniform sampler2D u_albedoTexture;
uniform sampler2D u_roughnessTexture;
uniform sampler2D u_metallicTexture;
uniform sampler2D u_normalTexture;
uniform sampler2D u_brdfLUT;
uniform bool u_textured;

uniform vec3 u_eye;

uniform samplerCube u_cubemap;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


varying vec4 v_vertex;
varying vec2 v_uv;
varying vec3 v_normal;

const float GAMMA = 2.2;
const float INV_GAMMA = 1.0 / GAMMA;
const float MIP_COUNT = 8.0;

// sRGB to linear approximation
// see http://chilliant.blogspot.com/2012/08/srgb-approximations-for-hlsl.html
vec4 SRGBtoLINEAR(vec4 srgbIn)
{
    return vec4(pow(srgbIn.xyz, vec3(GAMMA)), srgbIn.w);
}

// linear to sRGB approximation
// see http://chilliant.blogspot.com/2012/08/srgb-approximations-for-hlsl.html
vec3 LINEARtoSRGB(vec3 color)
{
    return pow(color, vec3(INV_GAMMA));
}

// Uncharted 2 tone map
// see: http://filmicworlds.com/blog/filmic-tonemapping-operators/
vec3 toneMapUncharted2Impl(vec3 color)
{
    const float A = 0.15;
    const float B = 0.50;
    const float C = 0.10;
    const float D = 0.20;
    const float E = 0.02;
    const float F = 0.30;
    return ((color*(A*color+C*B)+D*E)/(color*(A*color+B)+D*F))-E/F;
}

// https://github.com/KhronosGroup/glTF-Sample-Viewer/blob/master/src/shaders/tonemapping.glsl
// Commit 6f1fb2d
vec3 toneMapUncharted(vec3 color)
{
    const float W = 11.2;
    color = toneMapUncharted2Impl(color * 2.0);
    vec3 whiteScale = 1.0 / toneMapUncharted2Impl(vec3(W));
    return LINEARtoSRGB(color * whiteScale);
}

// Adapted from the sample glTF viewer
// https://github.com/KhronosGroup/glTF-Sample-Viewer/blob/master/src/shaders/metallic-roughness.frag
// Commit 6f1fb2d
vec3 getIBLContribution(vec3 n, vec3 v, float perceptualRoughness, vec3 diffuseColor, vec3 specularColor)
{
    float NdotV = clamp(dot(n, v), 0.0, 1.0);

    float lod = clamp(perceptualRoughness * MIP_COUNT, 0.0, MIP_COUNT);
    vec3 reflection = normalize(reflect(-v, n));

    vec2 brdfSamplePoint = clamp(vec2(NdotV, perceptualRoughness), vec2(0.0, 0.0), vec2(1.0, 1.0));
    vec2 brdf = texture(u_brdfLUT, brdfSamplePoint).rg;

    vec4 specularSample = textureLod(u_cubemap, reflection, lod);

    // TODO: use a prefiltered diffuse environment map
    vec3 diffuseLight = vec3(0.8);
    vec3 specularLight = SRGBtoLINEAR(specularSample).rgb;

    vec3 diffuse = diffuseLight * diffuseColor;
    vec3 specular = specularLight * (specularColor * brdf.x + brdf.y);

    return diffuse + specular;
}

void main(void)
{
    vec3 N = normalize(v_normal);
    vec3 T = normalize(dFdx(v_vertex.xyz));
    vec3 B = normalize(cross(T, N));
    mat3 TBN = mat3(T, B, N);

    vec3 view = normalize(u_eye - v_vertex.xyz);

    if (u_textured) {
        vec3 albedoColor = texture(u_albedoTexture, v_uv).rgb;
        albedoColor = pow(albedoColor, vec3(GAMMA));

        vec3 normalSample = texture(u_normalTexture, v_uv).rgb;
        vec3 normal = normalize(normalSample * 2.0 - 1.0);
        normal = normalize(TBN * normal);

        float roughness = texture(u_roughnessTexture, v_uv).r;
        roughness = pow(roughness, GAMMA);

        float metallic = texture(u_metallicTexture, v_uv).r;
        metallic = pow(metallic, GAMMA);

        const vec3 f0 = vec3(0.04);
        vec3 diffuseColor = albedoColor * (vec3(1.0) - f0) * (1.0 - metallic);
        vec3 specularColor = mix(f0, albedoColor, metallic);

        vec3 IBL = getIBLContribution(normal, view, roughness, diffuseColor, specularColor);
        fragColor = vec4(IBL, 1.0);
        fragColor.rgb = toneMapUncharted(fragColor.rgb);
    } else {
        fragColor = vec4(v_vertex.xyz * 0.5 + 0.5, 1.0);
    }
}
