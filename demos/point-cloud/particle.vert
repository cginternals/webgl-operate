precision lowp float;
precision lowp int;

@import ../../source/shaders/facade.vert;


#if __VERSION__ == 100
    attribute vec2 a_uv;
	attribute vec2 a_position;
#else
	in vec2 a_uv;
	in vec3 a_position;
#endif


uniform mat4 u_view;
uniform mat4 u_viewProjection;

uniform float u_size;

out vec2 v_uv;
out vec3 v_vertex;


void main()
{
	v_uv = a_uv;

	vec3 uv = vec3(a_uv, 0.0) * u_size;
	vec3 u  = vec3(u_view[0][0], u_view[1][0], u_view[2][0]) * uv.x;
	vec3 v  = vec3(u_view[0][1], u_view[1][1], u_view[2][1]) * uv.y;

	vec3 p  = a_position * 2.0 - 1.0;
	v_vertex = p;

	gl_Position = u_viewProjection * vec4(p + u + v, 1.0);
}
