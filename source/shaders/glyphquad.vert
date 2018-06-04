
#if __VERSION__ == 100
    #extension GL_EXT_draw_buffers : enable 
#endif

@import ./facade.vert;

precision mediump float;
precision lowp int;

#if __VERSION__ == 100
attribute mediump vec2 a_vertex; 
attribute vec3 a_id; // encoded uint24 id in byte3
attribute mediump vec4 a_texture_coord; // [ texture ll: vec2, ur: vec2 ]
attribute mediump vec3 a_origin;
attribute mediump vec3 a_tan;
attribute mediump vec3 a_bitan;

attribute mediump vec4 a_transform1;
attribute mediump vec4 a_transform2;
attribute mediump vec4 a_transform3;
attribute mediump vec4 a_transform4;
#else
layout(location = 0) in mediump vec2 a_vertex; 
layout(location = 1) in vec3 a_id; // encoded uint24 id in byte3
layout(location = 2) in mediump vec4 a_texture_coord; // [ texture ll: vec2, ur: vec2 ]
layout(location = 3) in mediump vec3 a_origin;
layout(location = 4) in mediump vec3 a_tan;
layout(location = 5) in mediump vec3 a_bitan;

layout(location = 7) in mediump vec4 a_transform1;
layout(location = 8) in mediump vec4 a_transform2;
layout(location = 9) in mediump vec4 a_transform3;
layout(location = 10) in mediump vec4 a_transform4;
#endif

uniform mat4 u_viewProjection;
uniform vec2 u_ndcOffset;

varying vec2 v_texture_coord;


@import ./ndcoffset;

void main(void)
{

    //TEXTURE COORDS

    float posX = a_texture_coord[0];
    float posY = a_texture_coord[1];

    float pos2X = a_texture_coord[2];
    float pos2Y = a_texture_coord[3];
    vec2 texExt = vec2(pos2X-posX, pos2Y-posY);

    v_texture_coord = a_vertex * texExt + a_texture_coord.xy;

    //POSITIONING

    //quad data: [0, 0, 0, 1, 1, 0, 1, 1] (a_vertex)

    vec4 vertex = vec4(a_vertex, 0.0, 1.0) * (vec4(a_tan, 1.0) + vec4(a_bitan, 1.0)) + vec4(a_origin, 0.0);

    mat4 transform = mat4(a_transform1, a_transform2, a_transform3, a_transform4);

    vertex = u_viewProjection * transform * vertex;

    ndcOffset(vertex, u_ndcOffset);
    gl_Position = vertex;
}
