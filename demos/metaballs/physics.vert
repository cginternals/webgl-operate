
precision lowp float;

@import ../../source/shaders/facade.vert;


#if __VERSION__ == 100
    attribute vec2 a_vertex;
#else
    layout(location = 0) in vec2 a_vertex;
#endif

void main()
{
    gl_Position = vec4(a_vertex, 0.0, 1.0);
}
