
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
uniform mat4 u_viewProjection;
uniform vec2 u_nearFar;

in vec2 v_uv;

in vec3 v_vertex;
in vec3 v_light;


void main()
{
    float zz = dot(v_uv, v_uv);
    if(zz > 1.0)
        discard;

    float z = sqrt(zz);

    float afwidth = fwidth(z);
    float t = smoothstep(0.0, afwidth, 1.0 - z);


    vec3 n = normalize(vec3(v_uv, sqrt(1.0 - zz)));
    vec3 e = vec3(0.0, 0.0, 1.0);
    // vec3 h = normalize(n + e);

    float ldotn  = clamp(dot(v_light, n), 0.0, 1.0);
    float spec   = pow(max(0.0, dot(reflect(-v_light, n), e)), 64.0);
    vec3 ambient = vec3(0.203, 0.227, 0.250); // default clear color of webgl-operate

    vec3 v = v_vertex * 0.125 + 0.5;

	fragColor = vec4(spec + (ambient * (zz + 0.2) + ldotn) * v, t);
}
