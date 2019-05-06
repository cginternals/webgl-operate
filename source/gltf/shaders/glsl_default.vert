
precision lowp float;

@import ../../shaders/facade.vert;


#if __VERSION__ == 100
    attribute vec4 a_position;
    attribute vec4 a_normal;
    attribute vec4 a_tangent;
    attribute vec2 a_texcoord_0;
    attribute vec2 a_texcoord_1;
    attribute vec4 a_color;
#else
    layout (location = 0) in vec4 a_position;
    layout (location = 1) in vec3 a_normal;
    layout (location = 2) in vec4 a_tangent;
    layout (location = 3) in vec2 a_texcoord_0;
    layout (location = 4) in vec2 a_texcoord_1;
    layout (location = 5) in vec4 a_color;
#endif

uniform mat4 u_model;
uniform mat4 u_viewProjection;

varying vec2 v_uv;

void main(void)
{
    v_uv = a_texcoord_0.xy;
    gl_Position = u_viewProjection * u_model * a_position;
}
