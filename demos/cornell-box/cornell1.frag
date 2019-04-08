
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


vec3 vertexFetch(const in float index) {
    return texture(u_vertices, vec2(index / (NUM_VERTICES-1.0), 0)).xyz;
}

vec4 indexFetch(const in float index) {
    return texture(u_indices, vec2(index / (NUM_TRIANGLES-1.0), 0)) * 255.0;
}

vec3 colorFetch(const in float index) {
    return texture(u_colors, vec2(index / (NUM_COLORS-1.0), 0)).xyz;
}

vec3 hsphereFetch(const in vec2 index) {
    return texture(u_hsphere, index / (SPHERE_SAMPLER_SIZE-1.0)).xyz;
}

vec3 lightFetch(const in vec2 index) {
    return texture(u_lights, index / (LIGHT_SAMPLER_SIZE-1.0)).xyz;
}


@import ./cornell.frag;
