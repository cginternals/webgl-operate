
precision lowp float;
precision lowp int;

@import ../../source/shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


uniform vec3 u_light; // expected in view space
uniform ivec2 u_mode; // [ billboard (0) | point (1), no shading (0) | phong shading (1) ]

in vec2 v_uv;
in vec3 v_vertex;


void main()
{
    if(u_mode[0] == 1) { // for GL_POINTS mode

        vec3 v = v_vertex * 0.25 + 0.5;
        fragColor = vec4(v, 1.0);

        return;
    }


    float zz = dot(v_uv, v_uv);
    if(zz > 1.0)
        discard;

    float z = sqrt(zz);

    float afwidth = fwidth(z);
    float t = smoothstep(0.0, afwidth, 1.0 - z);

    vec3 v = v_vertex * 0.25 + 0.5;

    if(u_mode[1] == 0) {
        fragColor = vec4(v, t);

        return;
    }


    vec3 n = vec3(v_uv, sqrt(1.0 - zz));
    vec3 e = vec3(0.0, 0.0, 1.0);
    // vec3 h = normalize(n + e);

    float ldotn  = clamp(dot(u_light, n /* h */), 0.0, 1.0);
    float spec   = pow(max(0.0, dot(reflect(-u_light, n), e)), 64.0);
    vec3 ambient = vec3(0.203, 0.227, 0.250); // default clear color of webgl-operate

	fragColor = vec4(spec + (ambient * (zz * 0.6 + 0.4) + ldotn) * v, t);
}
