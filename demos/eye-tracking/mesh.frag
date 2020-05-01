
precision lowp float;

@import ../../source/shaders/facade.frag;


uniform bool u_textured;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


varying vec4 v_vertex;
varying vec2 v_uv;


void main(void)
{
    fragColor = vec4(v_vertex.xyz * 0.5 + 0.5, 1.0);
}
