
precision highp float;


@import ../../source/shaders/facade.vert;


in vec3 a_vertex;

uniform mat4 u_lightViewMatrix;
uniform mat4 u_cameraViewProjectionMatrix;

out vec4 v_lightVertex;


void main()
{
  v_lightVertex = u_lightViewMatrix * vec4(a_vertex, 1.0);
  gl_Position = u_cameraViewProjectionMatrix * vec4(a_vertex, 1.0);
}
