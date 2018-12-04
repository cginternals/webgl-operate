
precision mediump float;
precision mediump usampler2D;

@import ../../source/shaders/facade.frag;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
    #extension GL_OES_standard_derivatives : enable
#else
    layout(location = 0) out vec4 fragColor;
#endif


const int NUM_TRIANGLES = 30;
const int NUM_VERTICES = 24;
const int NUM_COLORS = 5;

const float vertices[NUM_VERTICES * 3] = float[NUM_VERTICES * 3]
(   // room
    -1.000000, -1.000000, -1.000000, -1.000000, -1.000000, +1.000000,
    -1.000000, +1.000000, -1.000000, -1.000000, +1.000000, +1.000000,
    +0.988489, -1.000000, -1.000000, +0.976978, -1.000000, +1.000000,
    +1.000000, +1.000000, -1.000000, +1.000000, +1.000000, +1.000000,
    // short block
    +0.043165, -1.000000, -0.592275, +0.043165, -0.398688, -0.592275,
    -0.136691, -1.000000, -0.027182, -0.136691, -0.398688, -0.027182,
    -0.705036, -1.000000, -0.195279, -0.705036, -0.398688, -0.195279,
    -0.532374, -1.000000, -0.767525, -0.532374, -0.398688, -0.767525,
    // tall block
    +0.521583, -1.000000, -0.116595, +0.521583, +0.202624, -0.116595,
    +0.697842, -1.000000, +0.452074, +0.697842, +0.202624, +0.452074,
    +0.129496, -1.000000, +0.630901, +0.129496, +0.202624, +0.630901,
    -0.046763, -1.000000, +0.058655, -0.046763, +0.202624, +0.058655
);

// v0, v1, v2, color
const int indices[NUM_TRIANGLES * 4] = int[NUM_TRIANGLES * 4]
(
    // room ceiling
    6, 7, 3, 1,
    6, 3, 2, 1,
    // room floor
    4, 0, 1, 1,
    4, 1, 5, 1,
    // room front wall
    // 6, 2, 0, 1,
    // 6, 0, 4, 1,
    // room back wall
    5, 1, 3, 1,
    5, 3, 7, 1,
    // room right wall
    1, 0, 2, 3,
    1, 2, 3, 3,
    // room left wall
    4, 5, 7, 2,
    4, 7, 6, 2,
    // short block
    15, 13, 11, 1,
    15, 11,  9, 1,
     8,  9, 11, 1,
     8, 11, 10, 1,
    14, 15,  9, 1,
    14,  9,  8, 1,
    12, 13, 15, 1,
    12, 15, 14, 1,
    10, 11, 13, 1,
    10, 13, 12, 1,
    // tall block
    23, 21, 19, 1,
    23, 19, 17, 1,
    16, 17, 19, 1,
    16, 19, 18, 1,
    22, 23, 17, 1,
    22, 17, 16, 1,
    20, 21, 23, 1,
    20, 23, 22, 1,
    18, 19, 21, 1,
    18, 21, 20, 1
);

const float colors[NUM_COLORS * 3] = float[NUM_COLORS * 3]
(
    0.0000, 0.0000, 0.0000,  // 0 black
    0.7295, 0.7355, 0.7290,  // 1 white
    0.6110, 0.0555, 0.0620,  // 2 red
    0.1170, 0.4125, 0.1150,  // 3 green
    0.0620, 0.0555, 0.6110   // 4 blue
);


uniform sampler2D u_hsphere;
uniform sampler2D u_lights;
const vec2 SPHERE_SAMPLER_SIZE = vec2(32, 32); // textureSize(u_hsphere, 0);
const vec2 LIGHT_SAMPLER_SIZE = vec2(32, 32); // textureSize(u_lights, 0);


vec3 vertexFetch(const in float index) {
    return vec3(
        vertices[int(round(index)) * 3 + 0],
        vertices[int(round(index)) * 3 + 1],
        vertices[int(round(index)) * 3 + 2]
    );
}

vec4 indexFetch(const in float index) {
    return vec4(
        indices[int(round(index)) * 4 + 0],
        indices[int(round(index)) * 4 + 1],
        indices[int(round(index)) * 4 + 2],
        indices[int(round(index)) * 4 + 3]
    );
}

vec3 colorFetch(const in float index) {
    return vec3(
        colors[int(round(index)) * 3 + 0],
        colors[int(round(index)) * 3 + 1],
        colors[int(round(index)) * 3 + 2]
    );
}

vec3 hsphereFetch(const in vec2 index) {
    return texture(u_hsphere, index / (SPHERE_SAMPLER_SIZE-1.0)).xyz;
}

vec3 lightFetch(const in vec2 index) {
    return texture(u_lights, index / (LIGHT_SAMPLER_SIZE-1.0)).xyz;
}


@import ./cornell.frag;
