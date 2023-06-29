precision highp float;

// Adapted from https://github.com/KhronosGroup/glTF-WebGL-PBR

@import ../../../source/shaders/facade.vert;


#if __VERSION__ == 100
    attribute vec4 a_position;
    attribute vec4 a_normal;
#else
    layout (location = 0) in vec4 a_position;
    layout (location = 1) in vec3 a_normal;
    layout (location = 3) in vec2 a_texcoord_0;
#endif


uniform mat4 u_viewProjection;
uniform mat4 u_model;

uniform vec3 u_eye;

varying vec3 v_position;
varying vec2 v_uv;
varying vec3 v_normal;


void main(void)
{
    vec4 pos = u_model * a_position;

    v_position = vec3(pos.xyz) / pos.w;
    v_normal = normalize(vec3(u_model * vec4(a_normal.xyz, 0.0)));

    v_uv = a_texcoord_0;

    gl_Position = u_viewProjection * u_model * a_position;
}
