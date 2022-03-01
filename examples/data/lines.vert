precision lowp float;

layout(location = 0) in vec3 a_vertex;
layout(location = 1) in vec3 a_color;

uniform mat4 u_viewProjection;

out vec4 v_color;

void main()
{
    v_color = vec4(a_color, 1.0);

    gl_Position = u_viewProjection * vec4(a_vertex, 1.0);
}
