precision highp float;
precision highp int;

@import ../../source/shaders/facade.frag;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

uniform float u_aspect;
uniform int u_method;
uniform float u_seed;

varying vec2 v_uv;


float rand(in vec2 uv) {
    // return mod(uv.x * 12213.231 + uv.y * 32132.567, 1.0);
    return fract(sin(u_seed + dot(uv, vec2(12.9898, 78.233))) * 4375.5453123);
}

vec2 rand2(in vec2 uv) {
    vec2 v = vec2(dot(uv, vec2(127.1, 311.7)), dot(uv, vec2(269.5, 183.3)));
    return clamp(normalize(-1.0 + 2.0 * fract(sin(u_seed + v) * 43758.5453123)), -1.0, 1.0);
}

float smoothstep3(in float t) {
    // 3t^2 - 2t^3, same as smoothstep(0.0, 1.0, t);
    return t * t * (3.0 - 2.0 * t);
}
float  smoothstep5(in float t) {
    // 6t^5 - 15t^4 + 10t^3
    return t * t * t * (t * (6.0 * t - 15.0) + 10.0);
}
float  smoothstep7(in float t) {
    // -20x^7 + 70x^6 - 84x^5 + 35x^4
    return t * t * t * t * (t * (t * (70.0 - 20.0 * t) - 84.0) + 35.0);
}
float  smoothstep9(in float t) {
    // 70x^9 - 315x^8 + 540x^7 - 420x^6 + 126x^5
    return t * t * t * t * t * (t * (t * (t * (70.0 * t - 315.0) + 540.0) - 420.0) + 126.0);
}

float smoothen(in float t) {
    // return smoothstep(0.0, 1.0, t);
    // return smoothstep3(t);
    return smoothstep5(t);
    // return smoothstep7(t);
    // return smoothstep9(t);
}

float value_noise(in vec2 st) {
    ivec2 i = ivec2(floor(st));
    vec2 f = fract(st);

    vec4 r = vec4(
        rand(vec2(i + ivec2(0, 0))),
        rand(vec2(i + ivec2(1, 0))),
        rand(vec2(i + ivec2(0, 1))),
        rand(vec2(i + ivec2(1, 1))));

    vec2 fm = vec2(smoothen(f[0]), smoothen(f[1]));
    return mix(mix(r[0], r[1], fm[0]), mix(r[2], r[3], fm[0]), fm[1]);
}

float gradient_noise(in vec2 st) {
    ivec2 i = ivec2(floor(st));
    vec2 f = fract(st);

    vec4 r = vec4(
        dot(rand2(vec2(i + ivec2(0, 0))), f - vec2(0.0, 0.0)),
        dot(rand2(vec2(i + ivec2(1, 0))), f - vec2(1.0, 0.0)),
        dot(rand2(vec2(i + ivec2(0, 1))), f - vec2(0.0, 1.0)),
        dot(rand2(vec2(i + ivec2(1, 1))), f - vec2(1.0, 1.0)));

    vec2 fm = vec2(smoothen(f[0]), smoothen(f[1]));
    return mix(mix(r[0], r[1], fm[0]), mix(r[2], r[3], fm[0]), fm[1]) * 0.5 + 0.5;
}

const float pi = 3.14159265;
const float skewx = cos(30.0 * pi / 180.0);
const float iskewx = 1.0 / skewx;

vec2 skew(in vec2 st) {
    // return st;
    return vec2(iskewx * st.x, 0.5 * st.x + st.y);
}

vec2 unskew(in vec2 st) {
    // return st;
    return vec2( skewx * st.x, st.y - 0.5 * st.x);
}

// vec3 simplex(in vec2 st) {
//     vec2 f = fract(skew(st));
//     return mix(
//         // vec3(f[0], 1.0 - f[1], f[1] - f[0]),
//         // vec3(1.0 - f[0], f[1], f[0] - f[1]),
//         vec3(f[0], 1.0 - f[1], f[1] - f[0]),
//         vec3(f[1], 1.0 - f[0], f[0] - f[1]),
//         step(f[1], f[0]));
// }

vec3 simplex(in vec2 st_fract_of_skewed) {
    vec2 f = st_fract_of_skewed;
    return mix(
        vec3(1.0 - f[1], f[0], f[1] - f[0]),
        vec3(1.0 - f[0], f[1], f[0] - f[1]),
        step(f[1], f[0]));
}

float simplex_noise(in vec2 st) {
    vec2  st_skewed  = skew(st);

    vec2  f = fract(st_skewed);
    ivec2 i = ivec2(floor(st_skewed));

    vec3 s = normalize(simplex(f));
    s = 1.0 - sqrt(1.0 - s * s);

    vec2 p0 = unskew(f - /* skew? */(vec2(0.0, 0.0)));
    vec2 p1 = unskew(f - /* skew? */(vec2(1.0, 1.0)));
    vec2 p2 = unskew(f - /* skew? */(step(f.yx, f.xy)));

    vec2 g0 = rand2(vec2(i) + vec2(0, 0));
    vec2 g1 = rand2(vec2(i) + vec2(1, 1));
    vec2 g2 = rand2(vec2(i) + step(f.yx, f.xy));

    float r0 = dot(g0, p0) * (s[0]);
    float r1 = dot(g1, p1) * (s[1]);
    float r2 = dot(g2, p2) * (s[2]);

    return r0 + r1 + r2 + 0.5;
}

void main(void)
{
    vec2 uv = v_uv;
    vec2 uv_scaled = uv * 8.0 * vec2(u_aspect, 1.0);

    vec4 o0, o1;

    switch(u_method) {
        case 0: // value noise
        {
            o0 = vec4(
                value_noise(uv_scaled *   1.0),
                value_noise(uv_scaled *   2.0),
                value_noise(uv_scaled *   4.0),
                value_noise(uv_scaled *   8.0));
            o1 = vec4(
                value_noise(uv_scaled *  16.0),
                value_noise(uv_scaled *  32.0),
                0.0,  //value_noise(uv_scaled *  64.0),
                0.0); //value_noise(uv_scaled * 128.0));
        }
        break;

        case 1: // gradient noise
        {
            o0 = vec4(
                gradient_noise(uv_scaled *   1.0),
                gradient_noise(uv_scaled *   2.0),
                gradient_noise(uv_scaled *   4.0),
                gradient_noise(uv_scaled *   8.0));
            o1 = vec4(
                gradient_noise(uv_scaled *  16.0),
                gradient_noise(uv_scaled *  32.0),
                0.0,  //gradient_noise(uv_scaled *  64.0),
                0.0); //gradient_noise(uv_scaled * 128.0));
        }
        break;

        case 2: // simplex noise
        {
             o0 = vec4(
                simplex_noise(uv_scaled *   1.0),
                simplex_noise(uv_scaled *   2.0),
                simplex_noise(uv_scaled *   4.0),
                simplex_noise(uv_scaled *   8.0));
            o1 = vec4(
                simplex_noise(uv_scaled *  16.0),
                simplex_noise(uv_scaled *  32.0),
                0.0,  //simplex_noise(uv_scaled *  64.0),
                0.0); //simplex_noise(uv_scaled * 128.0));
        }
        break;

        default:
        break;
    }

    // weights for the eight octaves ...
    vec4 w0 = vec4(32.0, 16.0, 8.0, 4.0); // vec4(128.0, 64.0, 32.0, 16.0);
    vec4 w1 = vec4( 2.0,  1.0, 0.0, 0.0); // vec4(8.0, 4.0, 2.0, 1.0);

    // top-to-bottom masking of number of octaves used
    vec4 se = vec4(0.0, 1.0, 2.0, 3.0) / 6.0; // vec4(0.000, 0.125, 0.250, 0.375);
    vec4 s0 = step(se + 0.0, vec4(uv.x));
    vec4 s1 = step(se + 4.0 / 6.0, vec4(uv.x));

    float n = (dot(o0 * w0, s0) + dot(o1 * w1, s1)) / (dot(w0, s0) + dot(w1, s1));
    fragColor = vec4(vec3(n), 1.0);

    // float r = rand(uv_scaled);

    // float r = value_noise(uv_scaled);
    // float r = gradient_noise(uv_scaled);

    // float foo = 1.0 / 512.0; // 256 + 128 + 64 ... + 2;

}
