
precision lowp float;

@import ./facade.vert;


#if __VERSION__ == 100
    attribute vec2 a_vertex;
#else
    layout(location = 0) in vec2 a_vertex;
#endif

uniform vec4 u_srcBounds; // normalized
uniform vec4 u_dstBounds; // normalized

varying vec2 v_uv;


void main(void)
{
    vec2 uv = a_vertex * 0.5 + 0.5;

    v_uv = mix(u_srcBounds.xy, u_srcBounds.zw, uv);
    gl_Position = vec4(a_vertex.xy, 0.0, 1.0);
}
