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

#define PI 3.14159265359
vec3 newDir(vec3 n){
    float teta = random()*2.0*PI;
    float z = random()*2.0-1.0;
    vec3 v = vec3(sqrt(1.0-z*z)*cos(teta), sqrt(1.0-z*z)*sin(teta), z);
    if(dot(n, v) < 0.0) return -v;
    return v;
}

vec3 sampleVec(vec3 n, float radius){
    vec3 d = newDir(n);
    float r = random();
    d *= mix(0.001, radius, r*r);
    return d;
}

void main(void)
{
    initRandomGenerator(v_uv, u_frameSize, 0);

    //ssao
    int max_sample = 16;
    float radius = 0.05;

    float ao = 0.0;
    float nb_sample = 0.0;
    vec3 n = texture(u_normal, v_uv).xyz;
    float depth = texture(u_depth, v_uv).x;

    vec4 pos_ndc = u_viewProjectionInverse * vec4(2.0*v_uv - vec2(1.0), depth, 1.0);
    vec3 pos = pos_ndc.xyz / pos_ndc.w;

    for(int i = 0; i < max_sample; i++){

        vec3 samplePos = pos + sampleVec(n, radius);

        vec4 ndc = u_viewProjection * vec4(samplePos, 1.0);
        vec2 uv2 = ndc.xy/ndc.w * 0.5 + 0.5;

        if(uv2.x >= 0.0 && uv2.x <= 1.0 && uv2.y >= 0.0 && uv2.y <= 1.0) {
            float sampleDepth = texture(u_depth, uv2).r;

            ao += abs(sampleDepth-depth);
            nb_sample += 1.0;
        }
    }

    ao /= nb_sample;
    ao = 1.0 - ao;

    fragColor = vec4(ao, 0.0, 0.0, 1.0);
}
