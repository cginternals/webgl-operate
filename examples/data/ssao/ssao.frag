precision highp float;

@import ../../../source/shaders/facade.frag;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

in vec2 v_uv;

uniform vec2 u_frameSize;

uniform sampler2D u_color;
uniform sampler2D u_depth;

void main(void)
{
    fragColor = vec4(vec3(1.0), 1.0);
}
