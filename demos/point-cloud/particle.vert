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

uniform vec2 u_size; // [ point size in px, frame width in px ]
uniform ivec2 u_mode; // [ billboard (0) | point (1), no shading (0) | phong shading (1) ]

out vec2 v_uv;
out vec3 v_vertex;


void main()
{
	vec3 p  = a_position * 4.0 - 2.0;
	v_vertex = p;

	if(u_mode[0] == 1) {
		gl_Position = u_viewProjection * vec4(p, 1.0);
		gl_PointSize = u_size[0] * 0.25 * u_size[1];

		return;
	}

	v_uv = a_uv;

	vec3 uv = vec3(a_uv, 0.0);
	vec3 u  = vec3(u_view[0][0], u_view[1][0], u_view[2][0]) * uv.x * u_size[0];
	vec3 v  = vec3(u_view[0][1], u_view[1][1], u_view[2][1]) * uv.y * u_size[0];

	gl_Position = u_viewProjection * vec4(p + u + v, 1.0);
}
