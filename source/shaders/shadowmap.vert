
precision highp float;


@import ./facade.vert;


layout(location = 0) in vec3 a_vertex;

uniform mat4 u_lightViewMatrix;
uniform mat4 u_lightProjectionMatrix;

out vec4 v_vertex;


void main()
{
  v_vertex = u_lightViewMatrix * vec4(a_vertex, 1.0);
  gl_Position = u_lightProjectionMatrix * v_vertex;
}
