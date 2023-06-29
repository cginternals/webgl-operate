precision highp float;

@import ../../../source/shaders/facade.frag;
@import ../../../source/shaders/pbr_normal;

@import ../phong;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

uniform vec2 u_frameSize;
uniform vec3 u_eye;

uniform sampler2D u_normal;

varying vec3 v_position;
varying vec2 v_uv;
varying vec3 v_normal;


void main(void)
{
    // select normal either from vertex or from normal map
    vec3 normal = pbrNormal(v_position, v_uv, v_normal, u_normal);
    vec3 f_phong = phong(v_position, normal, u_eye);

    vec3 color = f_phong;

    fragColor = vec4(color, 1.0);
}
