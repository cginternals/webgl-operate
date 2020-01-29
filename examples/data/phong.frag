precision highp float;

@import ../../source/shaders/facade.frag;
@import ./phong;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

uniform vec2 u_frameSize;
uniform vec3 u_eye;

varying vec3 v_position;
varying vec3 v_normal;
varying vec3 v_phong;


void main(void)
{
    float t = 0.5 - (gl_FragCoord.x / u_frameSize.x);
    if(abs(t) < 0.5 / u_frameSize.x) {
        discard;
    }
    vec3 f_phong = phong(v_position, v_normal, u_eye);

    vec3 color = mix(f_phong, v_phong, step(0.0, t));

    // vec3 V = normalize(u_eye - v_position);
    // vec3 N = normalize(v_normal);
    // float VdotN = clamp(dot(V, N), 0.0, 1.0);

    // float contour =smoothstep(0.4, 0.0, VdotN);

    fragColor = vec4(color /* + contour */, 1.0);
}
