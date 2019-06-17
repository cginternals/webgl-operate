
precision lowp float;
precision lowp int;

@import ./facade.frag;

#if __VERSION__ == 100
  #define fragColor gl_FragColor
#else
  layout(location = 0) out vec4 fragColor;
#endif


uniform int u_kernelSize;
uniform float u_weights[32];

uniform sampler2D u_texture;

varying vec2 v_texCoords;
varying vec2 v_delta;


void main()
{
    vec4 result = vec4(0.0);
    for (int i = -u_kernelSize / 2; i <= u_kernelSize / 2; i++)
    {
        result += u_weights[abs(i)] * texture(u_texture, float(i) * v_delta + v_texCoords);
    }

    fragColor = result;
}
