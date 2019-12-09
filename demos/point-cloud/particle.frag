
precision lowp float;
precision lowp int;

@import ../../source/shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

uniform mat4 u_view;
uniform mat4 u_viewInverse;
uniform vec2 u_nearFar;

in vec2 v_uv;

in vec3 v_vertex;

void main()
{
    vec2 uv = v_uv * 2.0 - 1.0;
    float zz = 1.0 - dot(uv, uv);

    if(zz < 0.0) {
        discard;
    }

    vec3 v = v_vertex * 0.1 + 0.5;

    vec3 n = (u_viewInverse * normalize(vec4(uv, sqrt(zz), 0.0))).xyz;
    vec3 l = normalize(vec3(0.0, 1.0, 4.0));

    vec3 e =  mat3(u_viewInverse) * vec3(0.0, 0.0, 1.0);
    vec3 h = normalize(n + e);

    float ldotn = clamp(dot(h, n), 0.0, 1.0);
    float spec = pow(max(0.0, dot(reflect(-l, n), e)), 32.0);


	fragColor = vec4(spec + ldotn * v, 1.0);
}
