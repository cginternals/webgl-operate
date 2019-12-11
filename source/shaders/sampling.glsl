
#undef M_PI
#define M_PI 3.14159265359

// Adapted from "Moving Frostbite to PBR"
vec3 uniformSampleSphere(const in float u1, const in float u2)
{
    float phi = 2.0 * M_PI * u2;
    float cosTheta = 1.0 - 2.0 * u1;
    float sinTheta = sqrt(max (0.0, 1.0 - cosTheta * cosTheta));

    return vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);
}

// Adapted from "Moving Frostbite to PBR"
vec3 uniformSampleHemisphere(const in float u1, const in float u2)
{
    float phi = 2.0 * M_PI * u2;
    float cosTheta = 1.0 - u1;
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);

    return vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);
}

// Adapted from "Moving Frostbite to PBR"
vec3 cosineSampleHemisphere(const in float u1, const in float u2)
{
    float phi = 2.0 * M_PI * u2;
    float cosTheta = sqrt(1.0 - u1);
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);

    return vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);
}

// Adapted from "Real Shading in Unreal Engine 4"
vec3 importanceSampleGGX(const in vec2 Xi, const in float alphaRoughnessSq)
{
    float Phi = 2.0 * M_PI * Xi.x;
    float CosTheta = sqrt((1.0 - Xi.y) / (1.0 + (alphaRoughnessSq - 1.0) * Xi.y));
    float SinTheta = sqrt(1.0 - CosTheta * CosTheta);

    return vec3(SinTheta * cos(Phi), SinTheta * sin(Phi), CosTheta);
}

// Calculate intersection between a ray and a sphere
// Returns only the closest distance of the two intersections if there are two
// Adapted from https://gist.github.com/wwwtyro/beecc31d65d1004f5a9d
float raySphereIntersect(const in vec3 r0, const in vec3 rd, const in vec3 s0, const in float sr, out bool hit)
{
    // - r0: ray origin
    // - rd: normalized ray direction
    // - s0: sphere center
    // - sr: sphere radius
    // - Returns distance from r0 to first intersecion with sphere,
    //   or -1.0 if no intersection.
    float a = dot(rd, rd);
    vec3 s0_r0 = r0 - s0;
    float b = 2.0 * dot(rd, s0_r0);
    float c = dot(s0_r0, s0_r0) - (sr * sr);
    if (b * b - 4.0 * a * c < 0.0) {
        hit = false;
    }

    hit = true;
    return (-b - sqrt((b * b) - 4.0 * a * c))/(2.0 * a);
}

// Returns pseudo-random number within [0,1]
float rand(const in vec2 co)
{
    return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
}

// Fast calculation of the Van Der Corpus sequence using bitshifting magic
// See https://learnopengl.com/PBR/IBL/Specular-IBL
float radicalInverse_VdC(in uint bits)
{
    bits = (bits << 16u) | (bits >> 16u);
    bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
    bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
    bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
    bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
    return float(bits) * 2.3283064365386963e-10; // / 0x100000000
}

// Returns 2D points according to the quasirandom Hammersley distribution
vec2 hammersley(const in uint i, const in uint N)
{
    return vec2(float(i)/float(N), radicalInverse_VdC(i));
}

// Returns 2D points according to the quasirandom Weyl distribution
vec2 weyl(const in int n) { // borrowed from https://www.shadertoy.com/view/3lsXW2
    return fract(vec2(n*12664745, n*9560333)/exp2(24.));
}
