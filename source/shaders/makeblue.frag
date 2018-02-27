
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
    vec3 color1 = vec3(28.0 / 255.0, 117.0 / 255.0, 188.0 / 255.0);
    vec3 color2 = vec3(39.0 / 255.0, 170.0 / 255.0, 225.0 / 255.0);
    color1 += (vec3(0.0, v_uv) - 0.5) * 0.0625;

    vec2 awidth = fwidth(v_uv) * 4.0;
    vec2 cstep = abs(step(awidth, v_uv) - step(awidth, 1.0 - v_uv));

    fragColor = vec4(mix(color1, color2, vec3(any(bvec2(cstep)))), 1.0); 
}
