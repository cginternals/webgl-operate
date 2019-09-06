
vec2 SMCoordinates(vec4 worldPosition, mat4 shadowViewProjection)
{
    vec4 transformed = shadowViewProjection * worldPosition;
    return transformed.xy / transformed.w * 0.5 + 0.5;
}

float SMDepth(vec3 worldPosition, vec3 lightPosition, vec2 lightNearFar)
{
    return (distance(worldPosition, lightPosition) - lightNearFar.x) / (lightNearFar.y - lightNearFar.x);
}

float SMCompare(sampler2D depths, vec2 uv, float compare, float offset)
{
    float depth = texture(depths, uv).r;
    return step(compare + offset, depth);
}

vec2 VSMDepth(vec3 worldPosition, vec3 lightPosition, vec2 lightNearFar)
{
    float depth = SMDepth(worldPosition, lightPosition, lightNearFar);

    vec2 df = vec2(dFdx(depth), dFdy(depth));
    float moment = depth * depth + 0.25 * dot(df, df);

    return vec2(depth, moment);
}

float chebyshevUpperBound(vec2 moments, float compare, float minVariance, float lightBleedingReduction)
{
    float p = 0.0;

    // Surface is fully lit, as the current fragment is before the light occluder
    if (compare <= moments.x)
        p = 1.0;

    // The fragment is either in shadow or penumbra. We now use chebyshev's upperBound to check
    // How likely this pixel is to be lit (p_max)
    float variance = moments.y - (moments.x * moments.x);
    variance = max(variance, minVariance);

    float d = compare - moments.x;
    float p_max = variance / (variance + d*d);

    // Correct light bleeding
    p_max = smoothstep(lightBleedingReduction, 1.0, p_max);

    return max(p, p_max);
}

float VSMCompare(sampler2D depths, vec2 uv, float compare, float minVariance)
{
    vec2 moments = texture(depths, uv).rg;
    return chebyshevUpperBound(moments, compare, minVariance, 0.3);
}

float ESMDepth(vec3 worldPosition, vec3 lightPosition, vec2 lightNearFar, float exponent)
{
    float depth = SMDepth(worldPosition, lightPosition, lightNearFar);
    return exp(exponent * depth);
}

float ESMCompare(sampler2D depths, vec2 uv, float compare, float exponent)
{
    float expDepth = texture(depths, uv).r;
    return clamp(expDepth * exp(-exponent  * compare), 0.0, 1.0);
}

vec2 EVSMWarpDepth(float depth, vec2 exponents)
{
    depth = depth * 2.0 - 1.0;
    float pos =  exp( exponents.x * depth);
    float neg = -exp(-exponents.y * depth);
    return vec2(pos, neg);
}

vec4 EVSMDepth(vec3 worldPosition, vec3 lightPosition, vec2 lightNearFar, vec2 exponents)
{
    float depth = SMDepth(worldPosition, lightPosition, lightNearFar);
    vec2 warpedDepth = EVSMWarpDepth(depth, exponents);
    return vec4(warpedDepth, warpedDepth * warpedDepth);
}

float EVSMCompare(sampler2D depths, vec2 uv, float compare, vec2 exponents)
{
    vec4 moments = texture(depths, uv);
    vec2 warpedCompare = EVSMWarpDepth(compare, exponents);
    vec2 depthScale = 0.0001 * exponents * warpedCompare;
    vec2 minVariance = depthScale * depthScale;
    return min(
        chebyshevUpperBound(moments.xz, warpedCompare.x, minVariance.x, 0.0),
        chebyshevUpperBound(moments.yw, warpedCompare.y, minVariance.y, 0.0)
    );
}

// vec4 calculateShadowColor(vec4 objectColor, float visibility, float intensity, vec4 shadowColor, float colorIntensity)
// {
//   visibility = min(visibility + (1.0 - intensity) * (1.0 - visibility), 1.0);

//   vec4 finalColor = vec4(visibility * objectColor.rgb, objectColor.a);
//   if (visibility < 1.0)
//   {
//     finalColor = clamp(shadowColor * colorIntensity + finalColor, finalColor, objectColor);
//   }

//   return finalColor;
// }
