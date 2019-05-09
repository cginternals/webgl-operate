precision highp float;

@import ../../shaders/facade.frag;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

uniform sampler2D u_baseColor;
uniform bool u_hasBaseColor;

varying vec2 v_uv;
varying vec4 v_color;

void main(void)
{
    vec4 color = v_color;

    if (u_hasBaseColor) {
        color = texture(u_baseColor, v_uv);
    }

    fragColor = color;
}
