
precision lowp float;

@import ../../source/shaders/facade.frag;


uniform sampler2D u_albedoTexture;
uniform sampler2D u_roughnessTexture;
uniform sampler2D u_metallicTexture;
uniform sampler2D u_normalTexture;

uniform vec3 u_eye;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


varying vec4 v_vertex;
varying vec2 v_uv;

const float GAMMA = 2.2;
const float INV_GAMMA = 1.0 / GAMMA;
const float M_PI = 3.14159265359;


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


// PBR implementation adapted from https://github.com/KhronosGroup/glTF-Sample-Viewer/blob/master/src/shaders/metallic-roughness.frag
// commit 6f1fb2d

// The following equation models the Fresnel reflectance term of the spec equation (aka F())
// Implementation of fresnel from [4], Equation 15
vec3 specularReflection(vec3 reflectance0, vec3 reflectance90, float VdotH)
{
    return reflectance0 + (reflectance90 - reflectance0) * pow(clamp(1.0 - VdotH, 0.0, 1.0), 5.0);
}

// Smith Joint GGX
// Note: Vis = G / (4 * NdotL * NdotV)
// see Eric Heitz. 2014. Understanding the Masking-Shadowing Function in Microfacet-Based BRDFs. Journal of Computer Graphics Techniques, 3
// see Real-Time Rendering. Page 331 to 336.
// see https://google.github.io/filament/Filament.md.html#materialsystem/specularbrdf/geometricshadowing(specularg)
float visibilityOcclusion(float alphaRoughnessSq, float NdotL, float NdotV)
{
    float GGXV = NdotL * sqrt(NdotV * NdotV * (1.0 - alphaRoughnessSq) + alphaRoughnessSq);
    float GGXL = NdotV * sqrt(NdotL * NdotL * (1.0 - alphaRoughnessSq) + alphaRoughnessSq);

    float GGX = GGXV + GGXL;
    if (GGX > 0.0)
    {
        return 0.5 / GGX;
    }
    return 0.0;
}

// The following equation(s) model the distribution of microfacet normals across the area being drawn (aka D())
// Implementation from "Average Irregularity Representation of a Roughened Surface for Ray Reflection" by T. S. Trowbridge, and K. P. Reitz
// Follows the distribution function recommended in the SIGGRAPH 2013 course notes from EPIC Games [1], Equation 3.
float microfacetDistribution(float alphaRoughnessSq, float NdotH)
{
    float f = (NdotH * alphaRoughnessSq - NdotH) * NdotH + 1.0;
    return alphaRoughnessSq / (M_PI * f * f);
}

vec3 pbrSpecular(vec3 V, vec3 N, vec3 L, vec3 lightColor, vec3 reflectance0, vec3 reflectance90, float alphaRoughnessSq)
{
    vec3 H = normalize(V + L);

    float VdotH = clamp(dot(V, H), 0.0, 1.0);
    float NdotL = clamp(dot(N, L), 0.0, 1.0);
    float NdotV = clamp(dot(N, V), 0.0, 1.0);
    float NdotH = clamp(dot(N, H), 0.0, 1.0);

    if (NdotL < 0.0 && NdotV < 0.0) {
        return vec3(0.0);
    }

    vec3 F = specularReflection(reflectance0, reflectance90, VdotH);
    float Vis = visibilityOcclusion(alphaRoughnessSq, NdotL, NdotV);
    float D = microfacetDistribution(alphaRoughnessSq, NdotH);

    vec3 specularContribution = F * Vis * D;

    return specularContribution * NdotL * lightColor;
}

// Adapted from "Moving Frostbite to PBR"
vec3 uniformSampleSphere(float u1, float u2)
{
    float phi = 2.0 * M_PI * u2;
    float cosTheta = 1.0 - 2.0 * u1;
    float sinTheta = sqrt(max (0.0 , 1.0 - cosTheta * cosTheta));

    return vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);
}

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec3 evaluateSphereLightBruteForce(vec3 V, vec3 N, vec3 lightColor, vec3 reflectance0, vec3 reflectance90, float alphaRoughnessSq) {
    const int SAMPLE_COUNT = 128;
    const vec3 SPHERE_POSITION = vec3(0.0, 0.5, 0.0);
    const float SPHERE_RADIUS = 0.25;

    vec3 light = vec3(0.0);

    float lightPdf = 1.0 / (4.0 * M_PI * SPHERE_RADIUS * SPHERE_RADIUS);

    for (int i = 0; i < SAMPLE_COUNT; ++i) {
        float r1 = rand(v_uv + vec2(float(i)));
        float r2 = rand(v_uv + vec2(float(i * 3)));

        vec3 sphereNormal = uniformSampleSphere(r1, r2);
        vec3 spherePosition = sphereNormal * SPHERE_RADIUS + SPHERE_POSITION;
        vec3 lightVector = spherePosition - v_vertex.xyz;
        float sqDist = dot(lightVector, lightVector);
        vec3 L = normalize(lightVector);

        vec3 illuminance = lightColor * clamp(dot(sphereNormal, -L), 0.0, 1.0) / (lightPdf * sqDist);

        light += pbrSpecular(V, N, L, illuminance, reflectance0, reflectance90, alphaRoughnessSq);
    }

    return light / float(SAMPLE_COUNT);
}

void main(void)
{
    vec2 uv = v_uv;

    const vec3 normal = vec3(0.0, 1.0, 0.0);
    const vec3 tangent = vec3(1.0, 0.0, 0.0);
    const vec3 bitangent = vec3(0.0, 0.0, 1.0);
    mat3 TBN = mat3(tangent, bitangent, normal);

    vec3 albedoColor = texture(u_albedoTexture, uv).rgb;
    albedoColor = pow(albedoColor, vec3(GAMMA));

    vec3 normalSample = texture(u_normalTexture, uv).rgb;
    vec3 N = normalize(normalSample * 2.0 - 1.0);
    N = normalize(TBN * N);

    float roughness = texture(u_roughnessTexture, uv).r;
    roughness = pow(roughness, GAMMA);

    float alphaRoughness = roughness * roughness;
    float alphaRoughnessSq = alphaRoughness * alphaRoughness;

    // Simplified material model just for metals
    vec3 reflectance0 = albedoColor;
    float reflectance = max(albedoColor.r, max(albedoColor.g, albedoColor.b));
    vec3 reflectance90 = vec3(clamp(reflectance * 50.0, 0.0, 1.0));

    vec3 V = normalize(u_eye - v_vertex.xyz);

    vec3 lighting = vec3(0.0);

    // Directional Light
    {
        vec3 L = vec3(0.0, 1.0, 0.0);
        const vec3 lightColor = vec3(1.0, 0.9, 0.9);

        lighting += pbrSpecular(V, N, L, lightColor, reflectance0, reflectance90, alphaRoughnessSq);
    }

    // Point Light
    {
        // const vec3 lightPosition = vec3(0.0, 0.5, 0.0);
        const vec3 lightColor = vec3(1.0, 0.5, 0.5);

        // vec3 L = normalize(lightPosition - v_vertex.xyz);

        // lighting += pbrSpecular(V, N, L, lightColor, reflectance0, reflectance90, alphaRoughnessSq);

        lighting += evaluateSphereLightBruteForce(V, N, lightColor, reflectance0, reflectance90, alphaRoughnessSq);
    }

    fragColor = vec4(lighting, 1.0);
    fragColor.rgb = toneMapUncharted(fragColor.rgb);
}
