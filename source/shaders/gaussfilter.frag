
precision lowp float;
precision lowp int;

@import ./facade.frag;

#if __VERSION__ == 100
  #define fragColor gl_FragColor
#else
  layout(location = 0) out vec4 fragColor;
#endif


uniform float u_weights[32];
uniform vec2 u_delta;

uniform sampler2D u_texture;

varying vec2 v_texCoords;


void main()
{
    vec4 result = u_weights[0] * texture(u_texture, v_texCoords);
    for (int i = 1; i <= $KERNEL_HALF_SIZE; i++)
    {
        result += u_weights[i] * texture(u_texture, v_texCoords + float(i) * u_delta);
        result += u_weights[i] * texture(u_texture, v_texCoords - float(i) * u_delta);
    }

    fragColor = result;
}
