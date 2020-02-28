precision highp float;

@import ../../source/shaders/facade.frag;
@import ../../source/shaders/pbr_normal;

@import ./phong;

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
varying vec3 v_phong;

const float strip = 0.075; // horizontal extent in ndc of a vertical strip (three strips used)


void main(void)
{
    float t = gl_FragCoord.x / u_frameSize.x + 0.01;
    float m = step(0.5 - strip, t) + step(0.5 + strip, t); // yields 0 (left), 1 (middle), and 2 (right)

    bool dis = any(bvec2(
        abs(0.5 - strip - t) < (0.5 - strip) / u_frameSize.x,
        abs(0.5 + strip - t) < (0.5 + strip) / u_frameSize.x));

    if(dis) {
        discard;
    }

    // select normal either from vertex or from normal map
    vec3 normal = mix(v_normal, pbrNormal(v_position, v_uv, v_normal, u_normal),
        step(0.5, m - 1.0));

    vec3 f_phong = phong(v_position, normal, u_eye);

    vec3 color = mix(v_phong, f_phong, step(0.5, m));

    fragColor = vec4(color /* + contour */, 1.0);
}
