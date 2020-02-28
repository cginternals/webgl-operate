
precision highp float;

@import ../../source/shaders/facade.vert;


uniform mat4 u_lightViewProjection;
uniform mat4 u_model;


#if __VERSION__ == 100
    attribute vec3 a_vertex;
#else
    layout(location = 0) in vec3 a_vertex;
#endif


varying vec4 v_vertex;


void main()
{
    v_vertex = u_model * vec4(a_vertex, 1.0);
    gl_Position = u_lightViewProjection * v_vertex;
}
