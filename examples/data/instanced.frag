precision highp float;

@import ../../source/shaders/facade.frag;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

uniform sampler2D baseColor;
uniform vec4 u_clearColor;

varying vec2 v_uv;
varying float v_attenuation;
varying vec3 v_position;


void main(void)
{
    vec4 diffuse = texture(baseColor, v_uv);
    fragColor = mix(diffuse, u_clearColor, v_attenuation);
}
