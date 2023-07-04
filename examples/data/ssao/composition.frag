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
uniform sampler2D u_aoMap;

const float aoDamping = 0.0;
const float aoFocus = 1.0;

void main(void)
{
    vec4 colorValue = texture(u_color, v_uv);
    vec4 depthValue = texture(u_depth, v_uv);
    vec4 aoValue = texture(u_aoMap, v_uv);

    vec3 finalColor = mix(colorValue.rgb * mix(aoValue.rrr, vec3(1.0), aoDamping), aoValue.rrr, aoFocus);
    // vec3 finalColor = aoValue.rrr;

    fragColor = vec4(finalColor, 1.0);
}
