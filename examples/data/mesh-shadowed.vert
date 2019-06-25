
precision lowp float;

@import ../../source/shaders/facade.vert;


uniform mat4 u_viewProjection;
uniform mat4 u_model;


#if __VERSION__ == 100
    attribute vec3 a_vertex;
    attribute vec2 a_texCoord;
#else
    layout(location = 0) in vec3 a_vertex;
    layout(location = 1) in vec2 a_texCoord;
#endif


varying vec4 v_vertex;
varying vec2 v_uv;


void main()
{
    v_vertex = u_model * vec4(a_vertex, 1.0);
    v_uv = a_texCoord;

    gl_Position = u_viewProjection * v_vertex;
}
