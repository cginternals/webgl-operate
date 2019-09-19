// PBR implementation adapted from https://github.com/KhronosGroup/glTF-Sample-Viewer/blob/master/src/shaders/metallic-roughness.frag
// commit 6f1fb2d

// References:
// [1] Real Shading in Unreal Engine 4
//     http://blog.selfshadow.com/publications/s2013-shading-course/karis/s2013_pbs_epic_notes_v2.pdf
// [2] Physically Based Shading at Disney
//     http://blog.selfshadow.com/publications/s2012-shading-course/burley/s2012_pbs_disney_brdf_notes_v3.pdf
// [3] README.md - Environment Maps
//     https://github.com/KhronosGroup/glTF-WebGL-PBR/#environment-maps
// [4] "An Inexpensive BRDF Model for Physically based Rendering" by Christophe Schlick
//     https://www.cs.virginia.edu/~jdl/bib/appearance/analytic%20models/schlick94b.pdf

#define M_PI 3.14159265359

struct LightingInfo {
    vec3 incidentPosition;
    vec3 incidentNormal;
    vec3 view;
    vec2 uv;

    vec3 diffuseColor;
    vec3 specularColor;
    vec3 reflectance0;
    vec3 reflectance90;
    float alphaRoughness;
    float alphaRoughnessSq;
};

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

vec3 diffuseBrdf(LightingInfo info)
{
    return info.diffuseColor / M_PI;
}

vec3 specularBrdfGGX(vec3 L, LightingInfo info, float D_normalization)
{
    vec3 H = normalize(info.view + L);

    float VdotH = clamp(dot(info.view, H), 0.0, 1.0);
    float NdotL = clamp(dot(info.incidentNormal, L), 0.0, 1.0);
    float NdotV = clamp(dot(info.incidentNormal, info.view), 0.0, 1.0);
    float NdotH = clamp(dot(info.incidentNormal, H), 0.0, 1.0);

    if (NdotL < 0.0 && NdotV < 0.0) {
        return vec3(0.0);
    }

    // Fix numerical issues in the microfacet distribution when alphaRoughnessSq is very close to 0
    // This still introduces some error but fixes values approching infinity, which mess up the whole calculation
    float clampedAlphaRoughness = clamp(info.alphaRoughnessSq, 0.0000001, 1.0);

    vec3 F = specularReflection(info.reflectance0, info.reflectance90, VdotH);
    float Vis = visibilityOcclusion(info.alphaRoughnessSq, NdotL, NdotV);
    float D = microfacetDistribution(clampedAlphaRoughness, NdotH) * D_normalization;

    return F * Vis * D;
}

// Importance sampling with GGX introduces the pdf: D * NdotH / (4.0 * VdotH), therefore D cancels out
// The division by NdotH / (4.0 * VdotH) still has to be applied where this function is used
vec3 specularBrdfGGXImportanceSampled(vec3 L, LightingInfo info)
{
    vec3 H = normalize(info.view + L);

    float VdotH = clamp(dot(info.view, H), 0.0, 1.0);
    float NdotL = clamp(dot(info.incidentNormal, L), 0.0, 1.0);
    float NdotV = clamp(dot(info.incidentNormal, info.view), 0.0, 1.0);
    float NdotH = clamp(dot(info.incidentNormal, H), 0.0, 1.0);

    if (NdotL < 0.0 && NdotV < 0.0) {
        return vec3(0.0);
    }

    vec3 F = specularReflection(info.reflectance0, info.reflectance90, VdotH);
    float Vis = visibilityOcclusion(info.alphaRoughnessSq, NdotL, NdotV);

    return F * Vis;
}
