
precision lowp float;
precision lowp int;

@import ./facade.frag;

#if __VERSION__ == 100
  #define fragColor gl_FragColor
#else
  layout(location = 0) out vec4 fragColor;
#endif


uniform int u_kernelSize;
uniform bool u_redistribute;

uniform sampler2D u_texture;

varying float v_first;
varying float v_second;
varying vec2 v_texCoords;
varying vec2 v_delta;


#define E 2.71828182846


void main()
{
  float weights[32] = float[32](
    0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
  );
  float summed_weight = 0.0;

  for (int i = 0; i <= u_kernelSize / 2; i++)
  {
    weights[i] = v_first * pow(E, -(pow(float(i), 2.0) / v_second));
    summed_weight += i > 0 ? 2.0 * weights[i] : weights[i];
  }

  if (u_redistribute)
  {
    float remainder = 1.0 - summed_weight;

    for (int i = 0; i <= u_kernelSize / 2; i++)
    {
      weights[i] += weights[i] / summed_weight * remainder;
    }
  }

  vec4 result = vec4(0.0);
  for (int i = -u_kernelSize / 2; i <= u_kernelSize / 2; i++)
  {
    result += weights[abs(i)] * texture(u_texture, float(i) * v_delta + v_texCoords);
  }

  fragColor = result;
}
