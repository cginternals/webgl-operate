
#if __VERSION__ == 100

    #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
    #endif

#endif

precision highp float;

@import ../../source/shaders/facade.frag;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

void main(void)
{
    // Fragment pattern
    vec2 PixelPatternCoords = step(mod(gl_FragCoord.xy, vec2(2.0)), vec2(1.0));
    vec4 PixelPatternColor = vec4(
        vec3(0.5 + float(PixelPatternCoords.x != PixelPatternCoords.y) * 0.25),
        1.0
    );

    // Show actual pixel pattern
    fragColor = PixelPatternColor;

    // Derivatives pattern
    vec2 TwoByTwoPatternCoords = step(mod(gl_FragCoord.xy, vec2(4.0)), vec2(2.0));
    vec4 TwoByTwoPatternColor = vec4(
        vec3(0.5 + float(TwoByTwoPatternCoords.x != TwoByTwoPatternCoords.y) * 0.25),
        1.0
    );

    // Show actual pixel pattern and derivative pattern (superimposed)
    fragColor = mix(PixelPatternColor, TwoByTwoPatternColor, 0.75);

    // Irregular pattern
    vec2 v = step(mod(gl_FragCoord.xy, vec2(13.0)), vec2(6.0));
    vec4 patternColor = vec4(v.x, v.y, 0.0, 1.0);

    // Show test pattern pattern and actual pixel pattern (superimposed)
    fragColor = mix(patternColor, PixelPatternColor, 0.5);

    // Show test pattern pattern and derivative pattern (superimposed)
    fragColor = mix(patternColor, TwoByTwoPatternColor, 0.5);

    // Derivatives
    vec4 v2 = abs(vec4(
        dFdx(v),
        dFdy(v)
    ) * 100.0);
    vec4 diffColor = vec4(
        0.0,
        0.0,
        max(v2.x, v2.w) * 0.25,
        1.0
    );

    // Show dFdx-dFdy-result pattern and derivative pattern (superimposed)
    fragColor = mix(diffColor, patternColor, 0.8);
    fragColor = mix(diffColor, TwoByTwoPatternColor, 0.5);

    // Show test pattern, dFdx-dFdy-result pattern, and derivative pattern (superimposed)
    fragColor = mix(TwoByTwoPatternColor, mix(patternColor, diffColor, 0.1), 0.6);
}
