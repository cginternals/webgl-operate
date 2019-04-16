
vec2 calculateDepths(vec3 lightViewVertex, float lightFarPlane)
{
    float depth = length(lightViewVertex.xyz) / lightFarPlane;

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

float linstep(float low, float high, float v)
{
  return clamp((v - low) / (high - low), 0.0, 1.0);
}

float VSMCompare(sampler2D depths, vec2 uv, float compare, float offset)
{
  vec2 moments = texture(depths, uv).rg;

  float p = smoothstep(compare + offset, compare + offset, moments.x);
  float variance = max(moments.y - moments.x * moments.x, - 0.00001);
  float d = compare - moments.x;
  float p_max = linstep(0.2, 1.0, variance / (variance + d*d));
  return clamp(max(p, p_max), 0.0, 1.0);
}

vec4 calculateShadowColor(
    vec4 objectColor, float visibility, float intensity, vec4 shadowColor, float colorIntensity)
{
    visibility = min(visibility + (1.0 - intensity), 1.0);

    vec4 finalColor = vec4(visibility * objectColor.rgb, objectColor.a);
    if (visibility < 1.0)
    {
      finalColor += shadowColor * colorIntensity;
    }

    return finalColor;
}
