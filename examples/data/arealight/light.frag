
precision lowp float;

@import ../../../source/shaders/facade.frag;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

void main(void)
{
    fragColor = vec4(1.0, 0.5, 0.5, 1.0);
}
