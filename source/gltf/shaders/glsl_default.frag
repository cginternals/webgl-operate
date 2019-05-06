precision highp float;

@import ../../shaders/facade.frag;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

uniform sampler2D u_baseColor;

varying vec2 v_uv;

void main(void)
{
    vec3 texColor = texture(u_baseColor, v_uv).rgb;
    fragColor = vec4(texColor, 1.0);
    //fragColor = vec4(v_uv, 0.0, 1.0);
}
