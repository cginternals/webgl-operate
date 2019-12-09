precision lowp float;
precision lowp int;

@import ../../source/shaders/facade.vert;


#if __VERSION__ == 100
    attribute vec3 a_vertex;
    attribute vec2 a_uv;
#else
    in vec3 a_vertex;
	in vec2 a_uv;
#endif

uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat4 u_viewProjection;

out vec2 v_uv;

const float scale = 1.0 / 32.0;

out vec3 v_vertex;
out vec3 v_light;

void main()
{
	v_uv = a_uv * 2.0 - 1.0;

	vec3 uv = vec3(a_uv * 2.0 - 1.0, 0.0) * scale;
	vec3 u  = vec3(u_view[0][0], u_view[1][0], u_view[2][0]) * uv.x;
	vec3 v  = vec3(u_view[0][1], u_view[1][1], u_view[2][1]) * uv.y;

	v_vertex = a_vertex;

	v_light = normalize(vec3(u_view * vec4(-2.0, 2.0, 4.0, 0.0)));

	gl_Position = u_viewProjection * vec4(a_vertex + u + v, 1.0);
}
