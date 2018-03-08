
precision highp float;

@import ./facade.frag;
@import ./float_pack;


#if __VERSION__ == 100
    #define fragDepth gl_FragColor
#else 
    layout(location = 0) out vec4 fragDepth;
#endif


uniform sampler2D u_texture;
uniform vec2 u_offset;
uniform vec2 u_scale;

varying vec2 v_uv;



void main(void)
{
    vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y) * u_scale + u_offset;
    float depth = texture(u_texture, uv).r;

    fragDepth = vec4(float24x1_to_uint8x3(depth), 1.0);
}
