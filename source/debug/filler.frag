
precision lowp float;

@import ../shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
    #extension GL_OES_standard_derivatives : enable
#else
    layout(location = 0) out vec4 fragColor;
#endif

varying vec2 v_uv;


void main(void)
{
    float x = step(0.5, fract(v_uv.x * 10.0));
    float y = step(0.5, fract(v_uv.y * 10.0));
    float color = 0.0;
    if (x > 0.0 && y < 1.0) color = 1.0;
    if (x < 1.0 && y > 0.0) color = 1.0;
    fragColor = vec4(vec3(color), 1.0);
}
