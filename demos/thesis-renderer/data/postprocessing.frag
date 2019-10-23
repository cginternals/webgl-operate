
precision lowp float;

@import ../../../source/shaders/facade.frag;
@import ../../../source/shaders/tonemapping;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

uniform sampler2D u_texture;

uniform float u_exposure;

varying vec2 v_uv;


void main(void)
{
    vec4 inputColor = texture(u_texture, v_uv);
    fragColor = vec4(toneMapUncharted(inputColor.rgb * u_exposure), 1.0);
}
