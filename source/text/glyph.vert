precision mediump float;
precision lowp int;

@import ./../shaders/facade.vert;


#if __VERSION__ == 100

#extension GL_EXT_draw_buffers : enable
attribute vec2 a_vertex;
/* [ texture ll: vec2, ur: vec2 ] */
attribute vec4 a_texCoord;
attribute vec3 a_origin;
attribute vec3 a_tangent;
attribute vec3 a_up;

#else

in vec2 a_vertex;
/* [ texture ll: vec2, ur: vec2 ]*/
in vec4 a_texCoord;
in vec3 a_origin;
in vec3 a_tangent;
in vec3 a_up;

#endif


uniform mat4 u_viewProjection;
uniform vec2 u_ndcOffset;
uniform mat4 u_transform;
uniform bool u_dynamic;

varying vec2 v_uv;

@import ./../shaders/ndcoffset;


void main(void)
{
    /* TEXTURE COORDS */

    /* flip y-coordinates */
    vec2 texExt = vec2(a_texCoord[2] - a_texCoord[0], a_texCoord[1] - a_texCoord[3]);

    v_uv = a_vertex * texExt + vec2(a_texCoord[0], 1.0 - a_texCoord[1]);

    /* POSITIONING*/
    /* quad data as flat array: [0, 0,  0, 1,  1, 0,  1, 1] (a_vertex), which translates to ll, lr, ul, ur corners.
     * 2-------4
     * |  \    |
     * |    \  |
     * 1-------3
     * The current vertex is calculated based on the current quad corners and the tangent attributes.
     * The following lines are optimized for MAD optimization.
     */
    vec3 tangentDirection = a_origin + a_vertex.x * a_tangent;
    vec4 vertex = vec4(tangentDirection + a_vertex.y * a_up, 1.0);

    if(u_dynamic) {
        vertex = u_transform * vertex;
    }
    vertex = u_viewProjection * vertex;

    ndcOffset(vertex, u_ndcOffset);
    gl_Position = vertex;
}
