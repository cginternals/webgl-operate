
precision lowp float;

@import ./facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
    #extension GL_OES_standard_derivatives : enable
#else 
    layout(location = 0) out vec4 fragColor;
#endif


varying vec2 v_uv;


void main(void)
{
    vec3 rgb = vec3(28.0 / 255.0, 117.0 / 255.0, 188.0 / 255.0);
    fragColor = vec4((vec3(0.5, v_uv) - 0.5) * 0.125 + rgb, 1.0); 
}
