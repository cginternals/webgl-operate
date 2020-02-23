
precision lowp float;

@import ../../source/shaders/facade.vert;


#if __VERSION__ == 100
    attribute vec3 a_vertex;

#else
    layout(location = 0) in vec2 a_vertex;
#endif


uniform vec2 u_extent;
uniform vec2 u_offset;

varying vec2 v_uv;

void main()
{
    v_uv = a_vertex;
    gl_Position = vec4(u_offset + u_extent * a_vertex, 0.0, 1.0);
}
