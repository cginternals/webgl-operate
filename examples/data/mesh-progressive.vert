
precision lowp float;

@import ../../source/shaders/facade.vert;
@import ../../source/shaders/ndcoffset;



#if __VERSION__ == 100
    attribute vec3 a_vertex;
    attribute vec2 a_texCoord;
#else
    layout(location = 0) in vec3 a_vertex;
    layout(location = 1) in vec2 a_texCoord;
#endif


uniform mat4 u_model;
uniform mat4 u_viewProjection;

uniform vec2 u_ndcOffset;

varying vec4 v_vertex;
varying vec2 v_uv;
varying vec3 v_normal;

void main()
{
    v_vertex = u_model * vec4(a_vertex, 1.0);
    v_uv = a_texCoord;
    v_normal = normalize(a_vertex);

    vec4 position = u_viewProjection * v_vertex;
    ndcOffset(position, u_ndcOffset);

    gl_Position = position;
}
