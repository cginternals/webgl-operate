precision highp float;

@import ../../../source/shaders/facade.frag;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

in vec2 v_uv;

uniform vec2 u_frameSize;
uniform mat4 u_viewProjectionInverse;
uniform mat4 u_viewProjection;

uniform sampler2D u_normal;
uniform sampler2D u_depth;

/* RANDOM */

uint seed = 4u;
void hash(){
    seed ^= 2747636419u;
    seed *= 2654435769u;
    seed ^= seed >> 16;
    seed *= 2654435769u;
    seed ^= seed >> 16;
    seed *= 2654435769u;
}

float random(){
    hash();
    return float(seed)/4294967295.0;
}

void initRandomGenerator(vec2 uv, vec2 dim, int f){
    seed = uint(uv.y*dim.x + uv.x) + uint(f)*uint(dim.x)*uint(dim.y);
}

/* // RANDOM */

/* SAMPLING KERNEL */

#define PI 3.14159265359
vec3 newDir(vec3 n){
    float theta = random()*2.0*PI;
    float z = random()*2.0-1.0;
    vec3 v = vec3(sqrt(1.0-z*z)*cos(theta), sqrt(1.0-z*z)*sin(theta), z);
    if(dot(n, v) < 0.0) return -v;
    return v;
}

vec3 sampleVec(vec3 n, float radius){
    vec3 d = newDir(n);
    float r = random();
    d *= mix(0.001, radius, r*r);
    return d;
}

/* // SAMPLING KERNEL */

/* MAIN */

void main(void)
{
    initRandomGenerator(v_uv, u_frameSize, int(2034.3423*v_uv.x+324.234564543*v_uv.y));

    //ssao
    int max_sample = 64;
    float radius = 0.05;

    vec3 n = texture(u_normal, v_uv).xyz;
    float depth = texture(u_depth, v_uv).x;

    float ao = 0.0;
    float number_of_samples = 0.0;

    vec4 pos_ndc = vec4(2.0*v_uv - vec2(1.0), depth, 1.0);
    vec4 pos_world = u_viewProjectionInverse * pos_ndc;
    vec3 pos = pos_world.xyz / pos_world.w;

    for(int i = 0; i < max_sample; i++) {
        vec3 samplePos = pos + sampleVec(n, radius);

        vec4 ndc = u_viewProjection * vec4(samplePos, 1.0);
        ndc /= ndc.w;
        vec2 uv2 = ndc.xy * 0.5 + 0.5;

        if (ndc.z < 1.0 && ndc.z > 0.0 && uv2.x >= 0.0 && uv2.x <= 1.0 && uv2.y >= 0.0 && uv2.y <= 1.0) {
            float sampleDepth = texture(u_depth, uv2).r;

            ao += float(sampleDepth < ndc.z);
            number_of_samples += 1.0;
        }
    }

    if (number_of_samples < 1.0) {
        fragColor = vec4(1.0, 1.0, 1.0, 1.0);
        return;
    }

    ao /= number_of_samples;
    ao = 1.0 - ao;

    fragColor = vec4(ao, ao, ao, 1.0);
}
