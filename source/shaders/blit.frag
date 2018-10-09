
precision highp float;

@import ./facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


uniform sampler2D u_texture;

varying vec2 v_uv;


void main(void)
{
    fragColor = texture(u_texture, v_uv);
}
