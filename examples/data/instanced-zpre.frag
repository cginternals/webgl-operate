
precision highp float;
precision highp int;

@import ../../source/shaders/facade.frag;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


uniform int u_drawMode;

uniform bool u_textured;

uniform sampler2D u_texture;
uniform vec4 u_clearColor;

// uniform float u_seed;


varying vec4 v_vertex;
varying vec2 v_uv;

varying float v_attenuation;


vec2 rand2(in vec2 uv);

vec4 simpleLoad();
vec4 heavyLoad();


vec4 attenuate(vec4 diffuse) {
    if(u_drawMode >= 3) { // indicate prez
        diffuse.rgb = mix(v_vertex.xyz * 0.5 + 0.5, diffuse.rgb, 0.9);
    }
    return mix(diffuse, u_clearColor, v_attenuation);
}

void main(void)
{
    if(u_drawMode == 0) {
        fragColor = vec4(1.0);
        return;
    }

    if(!u_textured) { // ignore draw mode, just color the cube
        fragColor = attenuate(vec4(v_vertex.xyz * 0.5 + 0.5, 1.0));
        return;
    }

    // simple load
    if(u_drawMode == 1 || u_drawMode == 3) {
        fragColor = attenuate(simpleLoad());
        return;
    }
    // heavy load
    fragColor = attenuate(heavyLoad());
}


vec4 simpleLoad() {
    return texture(u_texture, v_uv);
}

const int samples = 1024;
vec4 heavyLoad() {
    vec4 diffuse;
    for(int i = 0; i < samples; ++i) {
        diffuse += texture(u_texture, v_uv + rand2(v_uv) * 0.001 - 0.0005);
    }
    return diffuse / float(samples);
}

vec2 rand2(in vec2 uv) {
    vec2 v = vec2(dot(uv, vec2(127.1, 311.7)), dot(uv, vec2(269.5, 183.3)));
    return clamp(normalize(-1.0 + 2.0 * fract(sin(/* u_seed + */ v) * 43758.5453123)), -1.0, 1.0);
}
