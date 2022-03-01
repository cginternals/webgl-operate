precision highp float;
precision highp int;


@import ../../source/shaders/facade.vert;


#if __VERSION__ == 100
    attribute vec2 a_position;
#else
    layout (location = 0) in vec2 a_position;
#endif

uniform float u_aspect;

varying vec2 v_uv;

void main(void)
{
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
