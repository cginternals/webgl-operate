
vec2 calculateDepths(vec3 lightViewVertex, float lightNearPlane, float lightFarPlane)
{
    float depth = (length(lightViewVertex) - lightNearPlane) / (lightFarPlane - lightNearPlane);

    float dx = dFdx(depth);
    float dy = dFdy(depth);
    float moment = pow(depth, 2.0) + 0.25 * (dx*dx + dy*dy);

    return vec2(depth, moment);
}

float hardShadowCompare(sampler2D depths, vec2 uv, float compare, float offset)
{
    float depth = texture(depths, uv).r;
    return step(compare + offset, depth);
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
    p_max = smoothstep(0.4, 1.0, p_max);

    return max(p, p_max);
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
