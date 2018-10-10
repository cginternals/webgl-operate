precision mediump float;
precision lowp int;

@import ./facade.vert;

#if __VERSION__ == 100
#extension GL_EXT_draw_buffers : enable
attribute vec2 a_quadVertex;
/* [ texture ll: vec2, ur: vec2 ] */
attribute vec4 a_texCoord;
attribute vec3 a_origin;
attribute vec3 a_tan;
attribute vec3 a_up;
#else
layout(location = 0) in vec2 a_quadVertex;
/* [ texture ll: vec2, ur: vec2 ]*/
layout(location = 1) in vec4 a_texCoord;
layout(location = 2) in vec3 a_origin;
layout(location = 3) in vec3 a_tan;
layout(location = 4) in vec3 a_up;
#endif

uniform mat4 u_viewProjection;
uniform vec2 u_ndcOffset;

varying vec2 v_texture_coord;

@import ./ndcoffset;

void main(void)
{
    /* TEXTURE COORDS */

    /* flip y-coordinates */

    float posX = a_texCoord[0];
    float posY = a_texCoord[1];

    float pos2X = a_texCoord[2];
    float pos2Y = a_texCoord[3];
    vec2 texExt = vec2(pos2X-posX, posY-pos2Y);

    v_texture_coord = a_quadVertex * texExt + vec2(a_texCoord[0], 1.0-a_texCoord[1]);

    /* POSITIONING*/
    /* quad data: [0, 0, 0, 1, 1, 0, 1, 1] (a_quadVertex) */

    vec4 vertex = vec4(a_origin + a_quadVertex.x*a_tan + a_quadVertex.y*a_up, 1.0);

    vertex = u_viewProjection * vertex;

    ndcOffset(vertex, u_ndcOffset);
    gl_Position = vertex;
}
