
precision highp float;


@import ../../source/shaders/facade.frag;


in vec4 v_lightVertex;

uniform float u_LightFarPlane;
uniform mat4 u_LightProjectionMatrix;

uniform sampler2D u_depthsTexture;

out vec4 fragColor;


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


void main(void)
{
    vec4 projLightVertex = u_LightProjectionMatrix * vec4(v_lightVertex.xyz, 1.0);
    vec2 lightUV = (projLightVertex.xy / projLightVertex.w) * 0.5 + 0.5;
    float lightDepth = clamp(length(v_lightVertex.xyz) / u_LightFarPlane, 0.0, 1.0);

    //float visibility = VSMCompare2(u_depthsTexture, lightUV, lightDepth,  -0.002);
    float visibility = hardShadowCompare(u_depthsTexture, lightUV, lightDepth, -0.001);

    fragColor = vec4(vec3(visibility), 1.0);
}
