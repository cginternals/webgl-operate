precision mediump float;
precision lowp int;

@import ./facade.vert;

#if __VERSION__ == 100
#extension GL_EXT_draw_buffers : enable 
attribute vec2 a_quadVertex; 
attribute vec4 a_texCoord; // [ texture ll: vec2, ur: vec2 ]
attribute vec3 a_origin;
attribute vec3 a_tan;
attribute vec3 a_up;
#else
layout(location = 0) in vec2 a_quadVertex; 
layout(location = 1) in vec4 a_texCoord; // [ texture ll: vec2, ur: vec2 ]
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
    //TEXTURE COORDS

    float posX = a_texCoord[0];
    float posY = a_texCoord[1];

    float pos2X = a_texCoord[2];
    float pos2Y = a_texCoord[3];
    vec2 texExt = vec2(pos2X-posX, pos2Y-posY);

    v_texture_coord = a_quadVertex * texExt + a_texCoord.xy;
    //v_texture_coord = vec2(a_texCoord.x, 1.0-a_texCoord.y);

    //POSITIONING
    // magic numbers for debugging purpose, as there is no meaningful positioning yet.
    // vec4 vertex = vec4(0.002*a_vertex + vec3(-0.8,0,0), 1.0);

    //quad data: [0, 0, 0, 1, 1, 0, 1, 1] (a_quadVertex)

    vec4 vertex = vec4(a_quadVertex, 0.0, 1.0) * (vec4(a_tan, 1.0) + vec4(a_up, 1.0)) + vec4(a_origin, 0.0);
    vertex = u_viewProjection * ( vertex * 0.002 + vec4(-0.8, 0, 0, 0) );

    ndcOffset(vertex, u_ndcOffset);
    gl_Position = vertex;
}
