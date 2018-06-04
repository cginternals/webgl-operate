
#if __VERSION__ == 100
    #define fragColor gl_FragColor
    #extension GL_OES_standard_derivatives : enable
#else 
    layout(location = 0) out vec4 fragColor;
#endif

@import ./facade.frag;

precision mediump float;

// uniform sampler2D u_glyphs;

// varying vec2 v_texture_coord;

void main(void)
{
    //requires blend: glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);

    // float d = texture(u_glyphs, v_texture_coord).r;
    /**
     * using if-statement and discard can slow down performance:
     * it's bad for IMR, TBR, TBDR and early-Z optimization
     * https://stackoverflow.com/questions/8509051/is-discard-bad-for-program-performance-in-opengl
     * But it is necessary: overlapping glyphs (like in 'ft') should not fight each other
     */
    //if(d < 0.45)
    //    discard;

    vec4 fc = vec4(0.0, 1.0, 0.0, 1.0); //debug color green
    
    //TODO mipmap access?
    // float a = step(0.5, d); //simplest aastep; when using multiframe sampling, smoothstep is not necessary and will add too much blur
    
    //fragColor = vec4(fc.rgb, fc.a * a);
    fragColor = vec4(fc.rgb, 1.0);
}
