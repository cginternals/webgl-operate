precision highp float;

// Adapted from https://github.com/KhronosGroup/glTF-WebGL-PBR

@import ../../shaders/facade.vert;

const int HAS_NORMALS           = 1;
const int HAS_TANGENTS          = 1 << 1;
const int HAS_UV                = 1 << 2;
const int HAS_COLORS            = 1 << 3;

#if __VERSION__ == 100
    attribute vec4 a_position;
    attribute vec4 a_normal;
    attribute vec4 a_tangent;
    attribute vec2 a_texcoord_0;
    attribute vec2 a_texcoord_1;
    attribute vec4 a_joints;
    attribute vec4 a_weights;
    attribute vec4 a_color;
#else
    layout (location = 0) in vec4 a_position;
    layout (location = 1) in vec3 a_normal;
    layout (location = 2) in vec4 a_tangent;
    layout (location = 3) in vec2 a_texcoord_0;
    layout (location = 4) in vec2 a_texcoord_1;
    layout (location = 5) in vec4 a_joints;
    layout (location = 6) in vec4 a_weights;
    layout (location = 7) in vec4 a_color;
#endif

uniform mat4 u_model;
uniform mat4 u_viewProjection;
uniform mat3 u_normalMatrix;

uniform mediump int u_geometryFlags;

varying vec2 v_uv[2];
varying vec4 v_color;
varying vec3 v_position;

varying mat3 v_TBN;
varying vec3 v_normal;

bool checkFlag(int flag) {
    return (u_geometryFlags & flag) == flag;
}

void main(void)
{
    vec4 pos = u_model * a_position;
    v_position = vec3(pos.xyz) / pos.w;

    if (checkFlag(HAS_NORMALS)) {
        if (checkFlag(HAS_TANGENTS)) {
            vec3 normalW = normalize(vec3(u_normalMatrix * a_normal));
            vec3 tangentW = normalize(vec3(u_model * vec4(a_tangent.xyz, 0.0)));
            vec3 bitangentW = cross(normalW, tangentW) * a_tangent.w;
            v_TBN = mat3(tangentW, bitangentW, normalW);
        } else { // HAS_TANGENTS != 1
            v_normal = normalize(vec3(u_model * vec4(a_normal.xyz, 0.0)));
        }
    }

    if (checkFlag(HAS_UV)) {
        v_uv[0] = a_texcoord_0;
        v_uv[1] = a_texcoord_1;
    } else {
        v_uv[0] = vec2(0., 0.);
        v_uv[1] = vec2(0., 0.);
    }

    if (checkFlag(HAS_COLORS)) {
        v_color = a_color;
    } else {
        v_color = vec4(1.0);
    }

    gl_Position = u_viewProjection * u_model * a_position;
}
