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

void main(void)
{
    vec4 colorValue = texture(u_color, v_uv);
    vec4 depthValue = texture(u_depth, v_uv);
    vec4 aoValue = texture(u_aoMap, v_uv);

    vec3 finalColor = normalize(colorValue.rgb + depthValue.rgb + aoValue.rgb);

    fragColor = vec4(finalColor, 1.0);
}
