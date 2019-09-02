
precision lowp float;

@import ../../../source/shaders/facade.frag;
@import ./arealight;


uniform sampler2D u_albedoTexture;
uniform sampler2D u_roughnessTexture;
uniform sampler2D u_metallicTexture;
uniform sampler2D u_normalTexture;

uniform vec3 u_eye;
uniform float u_roughness;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


varying vec4 v_vertex;
varying vec2 v_uv;

const float GAMMA = 2.2;
const float INV_GAMMA = 1.0 / GAMMA;


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

void main(void)
{
    const vec3 normal = vec3(0.0, 1.0, 0.0);
    const vec3 tangent = vec3(1.0, 0.0, 0.0);
    const vec3 bitangent = vec3(0.0, 0.0, 1.0);
    mat3 TBN = mat3(tangent, bitangent, normal);

    vec3 albedoColor = texture(u_albedoTexture, v_uv).rgb;
    albedoColor = pow(albedoColor, vec3(GAMMA));

    vec3 normalSample = texture(u_normalTexture, v_uv).rgb;
    vec3 N = normalize(normalSample * 2.0 - 1.0);
    N = normalize(TBN * N);

    N = vec3(0.0, 1.0, 0.0);

    vec3 V = normalize(u_eye - v_vertex.xyz);

    float roughness = 0.5;
    float metallic = 1.0;

    LightingInfo info;
    info.incidentPosition = v_vertex.xyz;
    info.incidentNormal = N;
    info.view = V;
    info.uv = v_uv;

    const vec3 f0 = vec3(0.04);
    info.diffuseColor = albedoColor * (vec3(1.0) - f0) * (1.0 - metallic);
    info.specularColor = mix(f0, albedoColor, metallic);
    info.reflectance0 = info.specularColor;
    float reflectance = max(info.specularColor.r, max(info.specularColor.g, info.specularColor.b));
    info.reflectance90 = vec3(clamp(reflectance * 50.0, 0.0, 1.0));
    info.alphaRoughness = roughness * roughness;
    info.alphaRoughnessSq = info.alphaRoughness * info.alphaRoughness;

    vec3 lighting = vec3(0.0);

    // Directional Light
    {
        vec3 L = vec3(0.0, 1.0, 0.0);
        const vec3 lightColor = vec3(1.0, 0.9, 0.9);

        float NdotL = clamp(dot(N, L), 0.0, 1.0);

        lighting += diffuseBrdf(info) * NdotL;
        lighting += specularBrdfGGX(L, info, 1.0) * NdotL;
    }

    // Area Light Reference
    {
        const vec3 lightCenter = vec3(-1.0, 0.5, -1.0);
        const float lightRadius = 0.25;
        const vec3 lightColor = vec3(1.0, 0.5, 0.5);

        SphereLight light = SphereLight(lightCenter, lightRadius, lightColor);

        lighting += sphereLightBruteForce(light, info);
    }

    // Area Light Importance Sampling GGX
    {
        const vec3 lightCenter = vec3(1.0, 0.5, -1.0);
        const float lightRadius = 0.25;
        const vec3 lightColor = vec3(1.0, 0.5, 0.5);

        SphereLight light = SphereLight(lightCenter, lightRadius, lightColor);

        lighting += specularSphereLightImportanceSampleGGX(light, info);
    }

    // Area Light (Karis MRP approximation)
    {
        const vec3 lightCenter = vec3(-1.0, 0.5, 1.0);
        const float lightRadius = 0.25;
        const vec3 lightColor = vec3(1.0, 0.5, 0.5);

        SphereLight light = SphereLight(lightCenter, lightRadius, lightColor);

        lighting += diffuseSphereLightApproximated(light, info);
        lighting += specularSphereLightKaris(light, info);
    }

    // // Area Light - new approximation
    // {
    //     const vec3 lightColor = vec3(1.0, 0.5, 0.5);

    //     lighting += specularSphereLightNew(V, N, lightColor, reflectance0, reflectance90, alphaRoughnessSq);
    // }

    fragColor = vec4(lighting, 1.0);
    fragColor.rgb = toneMapUncharted(fragColor.rgb);
}
