precision highp float;

// Adapted from https://github.com/KhronosGroup/glTF-WebGL-PBR

@import ../../source/shaders/facade.vert;
@import ./phong;


#if __VERSION__ == 100
    attribute vec4 a_position;
    attribute vec4 a_normal;
#else
    layout (location = 0) in vec4 a_position;
    layout (location = 1) in vec3 a_normal;
#endif


uniform mat4 u_viewProjection;
uniform mat4 u_model;

uniform vec3 u_eye;


varying vec3 v_position;
varying vec3 v_normal;
varying vec3 v_phong;


void main(void)
{
    vec4 pos = u_model * a_position;

    v_position = vec3(pos.xyz) / pos.w;
    v_normal = normalize(vec3(u_model * vec4(a_normal.xyz, 0.0)));
    v_phong = phong(v_position, v_normal, u_eye);

    gl_Position = u_viewProjection * u_model * a_position;
}
