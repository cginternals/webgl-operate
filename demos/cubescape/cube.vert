
precision lowp float;
precision lowp int;

@import ../../source/shaders/facade.vert;


#if __VERSION__ == 100
    attribute vec3 a_vertex;
#else
    layout(location = 0) in vec3 a_vertex;
#endif


uniform sampler2D u_terrain;
uniform mat4 u_viewProjection;
uniform float u_time;
uniform int u_numcubes;

varying float v_heightAddition;
varying vec3 v_cube;
varying vec3 v_global;


void main()
{
	float oneovernumcubes = 1.0 / float(u_numcubes);
	float cubeHeight = 2.0 / float(u_numcubes);

	vec2 gridOffset = vec2(gl_InstanceID % u_numcubes, floor(float(gl_InstanceID) * oneovernumcubes)) * 2.0 * oneovernumcubes;
	vec3 vertex = a_vertex * oneovernumcubes - (1.0 - oneovernumcubes);
	vertex.xz += gridOffset;

	float heightAddition = 0.5 * texture(u_terrain, gridOffset * 0.5 + vec2(sin(u_time * 0.04), u_time * 0.02)).r * 2.0 / 3.0;
	if(a_vertex.y > 0.0)
	    vertex.y += cubeHeight * floor(heightAddition / cubeHeight);

	v_heightAddition = heightAddition;
	v_cube = a_vertex;
	v_global = vertex;
	gl_Position = u_viewProjection * vec4(vertex, 1.0);
}
