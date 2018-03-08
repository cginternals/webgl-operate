
precision lowp float;

@import ../shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
    #extension GL_OES_standard_derivatives : enable
#else 
    layout(location = 0) out vec4 fragColor;
#endif

uniform int u_frameNumber;

varying vec2 v_uv;


void main(void)
{
    vec3 color = vec3(28.0 / 255.0, 117.0 / 255.0, 188.0 / 255.0);
    color += (vec3(0.0, v_uv) - 0.5) * 0.125;

    vec2 awidth = fwidth(v_uv) * (sin(float(u_frameNumber) * 0.1) * 7.0 + 8.0);
    vec2 cstep = abs(step(awidth, v_uv) - step(awidth, 1.0 - v_uv));
    if(!any(bvec2(cstep))) {
        discard;
    }
    fragColor = vec4(color, 1.0); 
}
