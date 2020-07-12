precision highp float;

@import ../../source/shaders/facade.frag;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

varying vec2 v_uv;

uniform sampler2D baseColor;

void main(void)
{
    fragColor = texture(baseColor, v_uv);
}
