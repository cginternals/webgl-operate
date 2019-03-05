
precision highp float;


@import ../../source/shaders/facade.vert;


in vec3 a_vertex;

uniform mat4 u_LightViewMatrix;
uniform mat4 u_CameraViewProjectionMatrix;

out vec4 v_lightVertex;


void main()
{
  v_lightVertex = u_LightViewMatrix * vec4(a_vertex, 1.0);
  gl_Position = u_CameraViewProjectionMatrix * vec4(a_vertex, 1.0);
}
