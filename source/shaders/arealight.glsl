#line 1

@import ./sampling;
@import ./brdf;

struct SphereLight {
    vec3 center;
    float radius;
    vec3 luminance;
};

struct DiskLight {
    vec3 center;
    vec3 direction;
    float radius;
    vec3 luminance;
};

// This function uses Monte Carlo integration to calculate the lighting of spherical light source.
// The rays are generated uniformly over the area of the light source.
// This can be used to generate a ground truth image or as part of a Multiple Importance Sampling (MIS) approach.
vec3 sphereLightBruteForce(const in SphereLight light, const in LightingInfo info)
{
    const int SAMPLE_COUNT = 16;

    vec3 lightAccumulator = vec3(0.0);

    float sphereArea = 4.0 * M_PI * light.radius * light.radius;
    float pdf = 1.0 / sphereArea;

    for (int i = 0; i < SAMPLE_COUNT; ++i) {
        vec2 u = weyl(int(info.uv.x * info.uv.y * 4324231.8) + i);
        // vec2 u = hammersley(uint(i), uint(SAMPLE_COUNT - 1));
        // vec2 u = vec2(rand(v_uv + vec2(float(i))), rand(v_uv + vec2(float(i * 3))));

        vec3 sphereNormal = uniformSampleSphere(u.x, u.y);

        vec3 spherePosition = sphereNormal * light.radius + light.center;
        vec3 lightVector = spherePosition - info.incidentPosition;
        float sqDist = dot(lightVector, lightVector);
        vec3 L = normalize(lightVector);

        // turn this from an area integral to a solid angle integral
        float lightPdf = pdf * sqDist / clamp(dot(sphereNormal, -L), 0.0, 1.0);
        vec3 L_i = light.luminance; // incoming lumincance from light source (unit: cd / m^2)
        vec3 integralSample = L_i / lightPdf;

        float NdotL = clamp(dot(L, info.incidentNormal), 0.0, 1.0);

        vec3 diffuse = diffuseBrdf(info);
        vec3 specular = specularBrdfGGX(L, info, 1.0);
        lightAccumulator += (diffuse + specular) * integralSample * NdotL;
    }

    return lightAccumulator / float(SAMPLE_COUNT);
}

// Fast approximation using (radius^2 / distance^2) * NdotL
// This formula does not have proper horizon handling but is cheap to evaluate
// See "Moving Frostbite to PBR" p.44
vec3 diffuseSphereLightApproximated(const in SphereLight light, const in LightingInfo info)
{
    vec3 Lunormalized = light.center - info.incidentPosition;
    vec3 L = normalize(Lunormalized);
    float sqrDist = dot(Lunormalized, Lunormalized);

    float sqrLightRadius = light.radius * light.radius;
    float illuminance = M_PI * (sqrLightRadius / (max(sqrLightRadius, sqrDist))) * clamp(dot(info.incidentNormal, L), 0.0, 1.0);

    float NdotL = clamp(dot(L, info.incidentNormal), 0.0, 1.0);

    return diffuseBrdf(info) * light.luminance * illuminance * NdotL;
}

vec3 diffuseDiskLightApproximated(const in DiskLight light, const in LightingInfo info)
{
    vec3 Lunormalized = light.center - info.incidentPosition;
    vec3 L = normalize(Lunormalized);

    SphereLight sphereLight = SphereLight(light.center, light.radius, light.luminance);
    float diskFactor = smoothstep(-0.1, 0.1, -dot(L, light.direction));
    return diffuseSphereLightApproximated(sphereLight, info) * diskFactor;
}

// This function uses Monte Carlo importance sampling to evaluate a spherical light source.
// By generating more rays towards the BRDF lobe, shiny materials are rendered with lower variance
// However, for diffuse materials the variance may increase
// This can be used alongside sampling a towards light source by using Multiple Importance Sampling (MIS)
// vec3 specularSphereLightImportanceSampleGGX(SphereLight light, LightingInfo info)
// {
//     const int SAMPLE_COUNT = 16;

//     vec3 lightAccumulator = vec3(0.0);

//     float sphereArea = 4.0 * M_PI * light.radius * light.radius;

//     for (int i = 0; i < SAMPLE_COUNT; ++i) {
//         vec2 u = weyl(int(info.uv.x * info.uv.y * 4324231.8) + i);
//         // vec2 u = hammersley(uint(i), uint(SAMPLE_COUNT));
//         // vec2 u = vec2(rand(v_uv + vec2(float(i))), rand(v_uv + vec2(float(i * 3))));

//         vec3 H = importanceSampleGGX(u, info.alphaRoughnessSq, info.incidentNormal);

//         vec3 sampleDir = reflect(info.view, H);

//         bool hit;
//         float t = raySphereIntersect(info.incidentPosition, sampleDir, light.center, light.radius, hit);

//         if (!hit || t >= 0.0) continue;

//         float NdotH = clamp(dot(info.incidentNormal, H), 0.0, 1.0);
//         float VdotH = clamp(dot(info.view, H), 0.0, 1.0);

//         // Math behind calculating the pdf: https://schuttejoe.github.io/post/ggximportancesamplingpart1/
//         // Note that the D term is not included since it cancels out with the BRDF
//         float pdf = NdotH / (4.0 * VdotH);

//         vec3 spherePosition = info.incidentPosition + t * sampleDir;
//         vec3 sphereNormal = normalize(spherePosition - light.center);

//         vec3 lightVector = spherePosition - info.incidentPosition;
//         float sqDist = dot(lightVector, lightVector);
//         vec3 L = normalize(lightVector);

//         vec3 L_i = light.luminance; // incoming radiance from light source (unit: W / sr*m^2)
//         vec3 integralSample = L_i / pdf;

//         float NdotL = clamp(dot(L, info.incidentNormal), 0.0, 1.0);

//         lightAccumulator += specularBrdfGGXImportanceSampled(L, info) * integralSample * NdotL;
//     }

//     return lightAccumulator / float(SAMPLE_COUNT);
// }

// This function approximates a spherical area light by using a "Most Representative Point", which is treated as a point light.
// This approach does not have proper energy conservation, however Karis gives an approximate normalization factor for the NDF.
// See "Real Shading in Unreal Engine 4"
vec3 specularSphereLightKaris(const in SphereLight light, const in LightingInfo info)
{
    float sphereArea = 4.0 * M_PI * light.radius * light.radius;

    vec3 R = reflect(info.view, info.incidentNormal);
    vec3 L_center = light.center - info.incidentPosition;
    vec3 centerToRay = dot(L_center, R) * R - L_center;
    vec3 closestPoint = L_center + centerToRay * clamp(light.radius / length(centerToRay), 0.0, 1.0);
    vec3 L = normalize(closestPoint);
    float sqDist = dot(closestPoint, closestPoint);

    // To approximate the area light source as a point light source, we need to convert from luminance (cd/m^2) to luminous power (lm)
    // We multiply by PI to get lm / m^2 (since we assume a lambertian light source and the integral of cos over hemisphere sums to PI)
    // Then we multiply by area to get lm
    vec3 lightPower = M_PI * sphereArea * light.luminance;
    // Estimate the irradiance from total light power
    // Note: this formula is an approximation that assumes the light source is a point light at the newly calculated light position
    vec3 irradiance = lightPower / (4.0 * M_PI * sqDist);

    // This normalization factor given by Karis should be used to scale the NDF
    float normalization = info.alphaRoughness / (info.alphaRoughness + light.radius / (2.0 * sqrt(sqDist)));
    normalization = normalization * normalization;

    float NdotL = clamp(dot(L, info.incidentNormal), 0.0, 1.0);

    return specularBrdfGGX(L, info, normalization) * irradiance * NdotL;
}

vec3 specularDiskLightKaris(const in DiskLight light, const in LightingInfo info) {
    vec3 Lunormalized = light.center - info.incidentPosition;
    vec3 L = normalize(Lunormalized);

    SphereLight sphereLight = SphereLight(light.center, light.radius, light.luminance);
    float diskFactor = smoothstep(-0.1, 0.1, -dot(L, light.direction));
    return specularSphereLightKaris(sphereLight, info) * diskFactor;
}
