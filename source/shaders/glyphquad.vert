precision mediump float;
precision lowp int;

@import ./facade.vert;

#if __VERSION__ == 100
#extension GL_EXT_draw_buffers : enable 
attribute vec3 a_vertex; 
attribute vec2 a_texCoord; // 
// attribute vec3 a_id; // encoded uint24 id in byte3
// attribute vec3 a_origin;
// attribute vec3 a_tan;
// attribute vec3 a_bitan;

// attribute vec4 a_transform1;
// attribute vec4 a_transform2;
// attribute vec4 a_transform3;
// attribute vec4 a_transform4;
#else
layout(location = 0) in vec3 a_vertex; 
layout(location = 1) in vec2 a_texCoord; // [ texture ll: vec2, ur: vec2 ]
// layout(location = 2) in vec3 a_id; // encoded uint24 id in byte3
// layout(location = 3) in vec3 a_origin;
// layout(location = 4) in vec3 a_tan;
// layout(location = 5) in vec3 a_bitan;

// layout(location = 7) in vec4 a_transform1;
// layout(location = 8) in vec4 a_transform2;
// layout(location = 9) in vec4 a_transform3;
// layout(location = 10) in vec4 a_transform4;
#endif

// uniform mat4 u_viewProjection;
uniform vec2 u_ndcOffset;

varying vec2 v_texture_coord;


@import ./ndcoffset;

void main(void)
{
    v_texture_coord = a_texCoord;

    //POSITIONING

    vec4 vertex = vec4(0.003*a_vertex, 1.0);

    //vertex = u_viewProjection * vertex;

    ndcOffset(vertex, u_ndcOffset);
    gl_Position = vertex;
}
