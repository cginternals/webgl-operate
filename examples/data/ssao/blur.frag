precision highp float;

@import ../../../source/shaders/facade.frag;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

in vec2 v_uv;

uniform vec2 u_kernelSize;
uniform vec2 u_frameSize;

uniform sampler2D u_source;

void main(void)
{
    vec4 color = texture(u_source, v_uv);
    fragColor = vec4(color.rgb, 1.0);
}
