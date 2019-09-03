
float SMDepths(vec3 lightViewVertex, float lightNearPlane, float lightFarPlane)
{
    return (length(lightViewVertex) - lightNearPlane) / (lightFarPlane - lightNearPlane);
}

float SMCompare(sampler2D depths, vec2 uv, float compare, float offset)
{
    float depth = texture(depths, uv).r;
    return step(compare + offset, depth);
}

vec2 VSMDepths(vec3 lightViewVertex, float lightNearPlane, float lightFarPlane)
{
    float depth = SMDepths(lightViewVertex, lightNearPlane, lightFarPlane);

    vec2 df = vec2(dFdx(depth), dFdy(depth));
    float moment = depth * depth + 0.25 * dot(df, df);

    return vec2(depth, moment);
}

float VSMCompare(sampler2D depths, vec2 uv, float compare, float minVariance)
{
    vec2 moments = texture(depths, uv).rg;

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
    p_max = smoothstep(0.3, 1.0, p_max);

    return max(p, p_max);
}

float ESMDepths(vec3 lightViewVertex, float lightNearPlane, float lightFarPlane, float c)
{
    float depth = SMDepths(lightViewVertex, lightNearPlane, lightFarPlane);
    return exp(c * depth);
}

float ESMCompare(sampler2D depths, vec2 uv, float compare, float c)
{
    float expDepth = texture(depths, uv).r;
    return clamp(expDepth * exp(-c  * compare), 0.0, 1.0);
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
