
precision lowp float;
precision lowp int;

@import ./facade.vert;

#if __VERSION__ == 100
  attribute vec2 a_vertex;
#else
  layout(location = 0) in vec2 a_vertex;
#endif


uniform ivec2 u_textureSize;
uniform vec2 u_direction;

varying vec2 v_texCoords;
varying vec2 v_delta;


void main()
{
  v_texCoords = a_vertex * 0.5 + 0.5;
  v_delta = u_direction / vec2(u_textureSize);

  gl_Position = vec4(a_vertex, 0.0, 1.0);
}
