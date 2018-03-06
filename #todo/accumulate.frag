
precision lowp float;

@import ./facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


uniform float u_weight;
uniform sampler2D u_accumulationTexture;
uniform sampler2D u_currentFrameTexture;

varying vec2 v_uv;


void main(void)
{
    vec4 accumulationColor = texture(u_accumulationTexture, v_uv);
    vec4 currentFrameColor = texture(u_currentFrameTexture, v_uv);
    fragColor = mix(accumulationColor, currentFrameColor, u_weight);
}
