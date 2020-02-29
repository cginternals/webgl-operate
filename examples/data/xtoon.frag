precision highp float;

@import ../../source/shaders/facade.frag;
@import ../../source/shaders/pbr_normal;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

uniform vec3 u_eye;

uniform mat4 u_viewProjection;
uniform mat4 u_model;

uniform sampler2D u_normal;
uniform sampler2D u_gradient;

varying vec3 v_position;
varying vec2 v_uv;
varying vec3 v_normal;
varying vec3 v_phong;



vec3 xtoon(vec3 position, vec3 normal, vec2 uv, vec3 eye,
    sampler2D gradient, float depth)
{
    float shininess = 0.25 * 128.0;

    vec3 N = normal;
    vec3 V = normalize(eye - position);

    vec3 L = normalize(vec3(+2.0, 3.0, 2.0));
    vec3 R = reflect(-L, N);

    float NdotL = dot(N, L); //clamp(dot(N, L), 0.0, 1.0);
    float RdotV = clamp(dot(R, V), 0.0, 1.0);


    float t = (NdotL + pow(RdotV, shininess)) * 0.5 + 0.5;

    // add a white rim light (silouhette/contour)

    float VdotN = clamp(dot(V, N), 0.0, 1.0);
    float rimLight = smoothstep(0.0, 0.25, VdotN); //smoothstep(0.28, 0.32, VdotN);

    t = mix(1.0, t, rimLight);

    // fetch color from LUT/XToon gradient

    return texture(gradient, vec2(t, depth)).rgb;
}


void main(void)
{
    vec3 normal = pbrNormal(v_position, v_uv, v_normal, u_normal);

    vec4 ndcPos = (u_viewProjection * vec4(v_position, 1.0));
    ndcPos.xyz /= ndcPos.w;

    vec3 f_xtoon = xtoon(v_position, normal, v_uv, u_eye, u_gradient, ndcPos.z);

    fragColor = vec4(f_xtoon, 1.0);
}
