
precision lowp float;

@import ../../source/shaders/facade.vert;


#if __VERSION__ == 100
    attribute vec2 a_vertex;
#else
    layout(location = 0) in vec2 a_vertex;
#endif


uniform mat4 u_transform;
uniform mediump vec3 u_eye;
uniform vec2 u_ndcOffset;

varying mediump vec2 v_uv;
varying mediump vec4 v_ray;

void main()
{
    v_uv = a_vertex * 0.5 + 0.5;
    v_ray = u_transform * vec4(u_ndcOffset + a_vertex, 1.0, 1.0);

    gl_Position = vec4(a_vertex, 1.0, 1.0);
}
