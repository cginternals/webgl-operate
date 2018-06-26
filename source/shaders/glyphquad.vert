precision mediump float;
precision lowp int;

@import ./facade.vert;

#if __VERSION__ == 100
#extension GL_EXT_draw_buffers : enable 
attribute vec3 a_vertex; 
attribute vec2 a_texCoord;
#else
layout(location = 0) in vec3 a_vertex; 
layout(location = 1) in vec2 a_texCoord;
#endif

uniform mat4 u_viewProjection;
uniform vec2 u_ndcOffset;

varying vec2 v_texture_coord;


@import ./ndcoffset;

void main(void)
{
    v_texture_coord = vec2(a_texCoord.x, 1.0-a_texCoord.y);

    //POSITIONING
    // magic numbers for debugging purpose, as there is no meaningful positioning yet.
    vec4 vertex = vec4(0.002*a_vertex + vec3(-0.8,0,0), 1.0);

    vertex = u_viewProjection * vertex;

    ndcOffset(vertex, u_ndcOffset);
    gl_Position = vertex;
}
