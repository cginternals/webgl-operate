
precision lowp float;
precision lowp int;

@import ./shaders/facade.vert;

#if __VERSION__ == 100
  attribute vec2 a_vertex;
#else
  layout(location = 0) in vec2 a_vertex;
#endif


uniform ivec2 u_textureSize;
uniform float u_sigma;
uniform vec2 u_direction;

varying float v_first;
varying float v_second;
varying vec2 v_texCoords;
varying vec2 v_delta;


#define PI 3.14159265359


void main()
{
  v_first = 1.0 / sqrt(2.0 * PI) * u_sigma;
  v_second = 2.0 * u_sigma * u_sigma;

  v_texCoords = a_vertex * 0.5 + 0.5;
  v_delta = u_direction / vec2(u_textureSize);

  gl_Position = vec4(a_vertex, 0.0, 1.0);
}
