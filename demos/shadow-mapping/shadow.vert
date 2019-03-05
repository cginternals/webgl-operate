
precision highp float;


@import ../../source/shaders/facade.vert;


in vec3 a_vertex;

uniform mat4 u_LightViewMatrix;
uniform mat4 u_LightProjectionMatrix;

out vec4 v_vertex;


void main()
{
  v_vertex = u_LightViewMatrix * vec4(a_vertex, 1.0);
  gl_Position = u_LightProjectionMatrix * v_vertex;
}
