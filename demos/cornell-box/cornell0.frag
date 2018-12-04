
@import ../../source/shaders/facade.frag;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
    #extension GL_OES_standard_derivatives : enable
    precision mediump float;
#else
    precision mediump float;
    layout(location = 0) out vec4 fragColor;
#endif


uniform sampler2D u_vertices; // 1D
uniform sampler2D u_indices;  // 1D
uniform sampler2D u_colors;   // 1D
const float NUM_VERTICES = 24.0;
const float NUM_TRIANGLES = 30.0;
const float NUM_COLORS = 5.0;

uniform sampler2D u_hsphere;
uniform sampler2D u_lights;
const vec2 SPHERE_SAMPLER_SIZE = vec2(32, 32); // textureSize(u_hsphere, 0);
const vec2 LIGHT_SAMPLER_SIZE = vec2(32, 32); // textureSize(u_lights, 0);


const vec3 premultUint8x3 = vec3(255.0 / 256.0, 255.0 / 65536.0, 255.0 / 16777216.0);
float uint8x3_to_float24x1(const in vec3 v) {
    return dot(v, premultUint8x3); // a1 * b1 + a2 * b2 + a3 * b3  ;)
}

vec3 vertexFetch(const in float index) {
    // *3 because every vertex has 3 floats
    float realIndex = index * 3.0;
    // one lookup for each float; a float is encoded in 3 bytes (xyz)
    vec2 floatIndex1 = vec2((realIndex      ) / (NUM_VERTICES* 3.0 - 1.0), 0);
    vec2 floatIndex2 = vec2((realIndex + 1.0) / (NUM_VERTICES* 3.0 - 1.0), 0);
    vec2 floatIndex3 = vec2((realIndex + 2.0) / (NUM_VERTICES* 3.0 - 1.0), 0);
    // read and scale from [0..1] to [-1..+1]
    float x = uint8x3_to_float24x1(texture(u_vertices, floatIndex1).xyz) * 2.0 - 1.0;
    float y = uint8x3_to_float24x1(texture(u_vertices, floatIndex2).xyz) * 2.0 - 1.0;
    float z = uint8x3_to_float24x1(texture(u_vertices, floatIndex3).xyz) * 2.0 - 1.0;

    return vec3(x,y,z);
}

vec4 indexFetch(const in float index) {
    // * 255 because openGL scales to [0..1]
    return texture(u_indices, vec2(index / (NUM_TRIANGLES-1.0), 0)) * 255.0;
}

vec3 colorFetch(const in float index) {
    // *3 because every color has 3 floats
    float realIndex = index * 3.0;
    // one lookup for each float; a float is encoded in 3 bytes (xyz)
    vec2 floatIndex1 = vec2((realIndex      ) / (NUM_COLORS* 3.0 - 1.0), 0);
    vec2 floatIndex2 = vec2((realIndex + 1.0) / (NUM_COLORS* 3.0 - 1.0), 0);
    vec2 floatIndex3 = vec2((realIndex + 2.0) / (NUM_COLORS* 3.0 - 1.0), 0);

    float x = uint8x3_to_float24x1(texture(u_colors, floatIndex1).xyz);
    float y = uint8x3_to_float24x1(texture(u_colors, floatIndex2).xyz);
    float z = uint8x3_to_float24x1(texture(u_colors, floatIndex3).xyz);

    return vec3(x,y,z);
}

vec3 hsphereFetch(const in vec2 index) {
    // *3 because every vector has 3 floats
    vec2 realIndex = vec2(index.x * 3.0, index.y);
    // one lookup for each float; a float is encoded in 3 bytes (xyz)
    vec2 floatIndex1 = vec2((realIndex.x      ), realIndex.y) / (SPHERE_SAMPLER_SIZE * 3.0 - 1.0);
    vec2 floatIndex2 = vec2((realIndex.x + 1.0), realIndex.y) / (SPHERE_SAMPLER_SIZE * 3.0 - 1.0);
    vec2 floatIndex3 = vec2((realIndex.x + 2.0), realIndex.y) / (SPHERE_SAMPLER_SIZE * 3.0 - 1.0);

    float x = uint8x3_to_float24x1(texture(u_hsphere, floatIndex1).xyz) * 2.0 - 1.0;
    float y = uint8x3_to_float24x1(texture(u_hsphere, floatIndex2).xyz) * 2.0 - 1.0;
    float z = uint8x3_to_float24x1(texture(u_hsphere, floatIndex3).xyz) * 2.0 - 1.0;

    return vec3(x,y,z);
}

vec3 lightFetch(const in vec2 index) {
    // *3 because every vector has 3 floats
    vec2 realIndex = vec2(index.x * 3.0, index.y);
    // one lookup for each float; a float is encoded in 3 bytes (xyz)
    vec2 floatIndex1 = vec2((realIndex.x      ), realIndex.y) / (LIGHT_SAMPLER_SIZE * 3.0 - 1.0);
    vec2 floatIndex2 = vec2((realIndex.x + 1.0), realIndex.y) / (LIGHT_SAMPLER_SIZE * 3.0 - 1.0);
    vec2 floatIndex3 = vec2((realIndex.x + 2.0), realIndex.y) / (LIGHT_SAMPLER_SIZE * 3.0 - 1.0);
    // read and scale from [0..1] to [-1..+1]
    float x = uint8x3_to_float24x1(texture(u_lights, floatIndex1).xyz) * 2.0 - 1.0;
    float y = uint8x3_to_float24x1(texture(u_lights, floatIndex2).xyz) * 2.0 - 1.0;
    float z = uint8x3_to_float24x1(texture(u_lights, floatIndex3).xyz) * 2.0 - 1.0;

    return vec3(x,y,z);
}


@import ./cornell.frag;
