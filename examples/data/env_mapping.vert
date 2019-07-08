precision highp float;

#if __VERSION__ == 100
    attribute vec2 a_vertex;
#else
    in vec2 a_vertex;
    #define varying out
#endif

uniform mat4 u_viewProjectionInverse;

varying vec2 v_uv;
varying vec4 v_ray;

void main(void)
{
    v_uv = a_vertex * 0.5 + 0.5;
    v_ray = u_viewProjectionInverse * vec4(a_vertex, 1.0, 1.0);

    gl_Position = vec4(a_vertex.xy, 1.0, 1.0);
}
