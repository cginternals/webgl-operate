
precision lowp float;

@import ../../source/shaders/facade.vert;


#if __VERSION__ == 100
    attribute vec2 a_vertex;
#else
    layout(location = 0) in vec2 a_vertex;
#endif

uniform mat4 u_inverseViewProjection;

varying vec4 v_ray;
varying vec4 v_origin;

void main()
{
    //v_ray = u_inverseViewProjection * vec4(a_vertex.x, 0.0, a_vertex.y, 0.0);
    v_ray = u_inverseViewProjection * vec4(a_vertex.xy, 1.0, 1.0);
    v_ray /= v_ray.w;
    v_origin = u_inverseViewProjection * vec4(a_vertex.xy, -1.0, 1.0);
    v_origin /= v_origin.w;

    v_ray -= v_origin;

    gl_Position = vec4(a_vertex, 0.0, 1.0);
}
