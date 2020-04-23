
precision lowp float;

@import ../../source/shaders/facade.vert;


#if __VERSION__ == 100
    attribute vec2 a_vertex;
#else
    layout(location = 0) in vec2 a_vertex;
#endif

uniform mat4 u_inverseViewProjection;

varying vec4 fragmentPosition;
varying vec4 fragmentRayDirection;

void main()
{
    vec2 v_uv = a_vertex;
    v_uv.y *= 9.0 / 16.0;

    fragmentPosition = vec4(v_uv, 0.0, 1.0);
    fragmentRayDirection = vec4(0.0, 0.0, 1.0, 0.0);

    gl_Position = vec4(a_vertex, 0.0, 1.0);
}
