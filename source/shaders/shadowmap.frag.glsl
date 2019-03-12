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

  float p = smoothstep(compare + offset, compare, moments.x);
  float variance = max(moments.y - moments.x * moments.x, - 0.00001);
  float d = compare - moments.x;
  float p_max = linstep(0.2, 1.0, variance / (variance + d*d));
  return clamp(max(p, p_max), 0.0, 1.0);
}

float VSMCompare2(sampler2D depths, vec2 uv, float compare, float offset)
{
  vec2 moments = texture(depths, uv).rg;

  if (compare + offset <= moments.x)
    return 1.0;

  float variance = moments.y - moments.x * moments.x;
  variance = max(variance, 0.00002);

  float d = compare + offset - moments.x;
  float p_max = variance / (variance + d*d);

  return p_max;
}
