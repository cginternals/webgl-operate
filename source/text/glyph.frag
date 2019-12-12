precision mediump float;

@import ./../shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor

    #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
        #define AASTEP
    #endif

#else
    layout(location = 0) out vec4 fragColor;

    #define AASTEP

#endif


uniform sampler2D u_glyphs;
uniform vec4 u_color;
uniform float u_aaStepScale;
uniform int u_aaSampling;

varying vec2 v_uv;

const int channel = 0;


float aastep(float t, float value)
{
#ifdef AASTEP
    /* float afwidth = length(vec2(dFdx(value), dFdy(value))) * u_aaStepScale; */
    float afwidth = fwidth(value) * u_aaStepScale;
    /* The aa step scale is more of a hack to provide seemingly smoother (e.g., >= 1.0) or crisper (e.g., between 0.0
     * and 1.0) contours without specific sampling. It's just scaling the outcome of the derivatives.
     */

    return smoothstep(t - afwidth, t + afwidth, value);
#else
    return step(t, value);
#endif
}

float texStep(float t, vec2 uv)
{
    /*
     * This is a workaround for a known bug in Chrome software rendering (SwiftShader), for updates follow
     * https://issuetracker.google.com/u/1/issues/146041290
     * Workaround: Storing the result of the texture access into another variable that then is passed as parameter.
     */
    float distanceValue = texture(u_glyphs, uv)[channel];
    return step(t, distanceValue);
}

float texSmooth(float t, vec2 uv)
{
    /*
     * This is a workaround for a known bug in Chrome software rendering (SwiftShader), for updates follow
     * https://issuetracker.google.com/u/1/issues/146041290
     * Workaround: Storing the result of the texture access into another variable that then is passed as parameter.
     */
    float distanceValue = texture(u_glyphs, uv)[channel];
    return aastep(t, distanceValue);
}

#ifdef AASTEP

float aastep3h(float t, vec2 uv)
{
	float x = dFdy(uv.x) * 1.0 / 3.0;

	float v = tex(t, uv + vec2( -x, 0.0))
          	+ tex(t, uv + vec2(0.0, 0.0))
          	+ tex(t, uv + vec2( +x, 0.0));

	return v / 3.0;
}

float aastep3v(float t, vec2 uv)
{
	float y = dFdy(uv.y) * 1.0 / 3.0;

	float v = tex(t, uv + vec2( 0.0,  -y))
          	+ tex(t, uv + vec2( 0.0, 0.0))
          	+ tex(t, uv + vec2( 0.0,  +y));

	return v / 3.0;
}

float aastep3x3(float t, vec2 uv)
{
	float x = dFdx(uv.x) * 1.0 / 3.0;
	float y = dFdy(uv.y) * 1.0 / 3.0;

	float v = tex(t, uv + vec2(  -x, -y)) + tex(t, uv + vec2(  -x, 0.0)) + tex(t, uv + vec2(  -x, +y))
	      	+ tex(t, uv + vec2( 0.0, -y)) + tex(t, uv + vec2( 0.0, 0.0)) + tex(t, uv + vec2( 0.0, +y))
            + tex(t, uv + vec2(  +x, -y)) + tex(t, uv + vec2(  +x, 0.0)) + tex(t, uv + vec2(  +x, +y));

	return v / 9.0;
}

float aastep4x4(float t, vec2 uv)
{
    float x0 = dFdx(uv.x);
    float y0 = dFdx(uv.y);
	float x1 = x0 * 1.0 / 8.0;
	float y1 = y0 * 1.0 / 8.0;
	float x2 = x0 * 3.0 / 8.0;
	float y2 = y0 * 3.0 / 8.0;

	float v = tex(t, uv + vec2(-x2,-y2)) + tex(t, uv + vec2(-x2,-y1))
            + tex(t, uv + vec2(-x2,+y1)) + tex(t, uv + vec2(-x2,+y2))

	        + tex(t, uv + vec2(-x1,-y2)) + tex(t, uv + vec2(-x1,-y1))
	        + tex(t, uv + vec2(-x1,+y1)) + tex(t, uv + vec2(-x1,+y2))

	      	+ tex(t, uv + vec2(+x1,-y2)) + tex(t, uv + vec2(+x1,-y1))
	        + tex(t, uv + vec2(+x1,+y1)) + tex(t, uv + vec2(+x1,+y2))

	        + tex(t, uv + vec2(+x2,-y2)) + tex(t, uv + vec2(+x2,-y1))
	        + tex(t, uv + vec2(+x2,+y1)) + tex(t, uv + vec2(+x2,+y2));

	return v / 16.0;
}

// vec4 subpix(float r, float g, float b, vec4 fore, vec4 back)
// {
// 	return vec4(mix(back.rgb, fore.rgb, vec3(r, g, b)), mix(back.a, fore.a, (r + b + g) / 3.0));
// }

#endif

void main(void)
{
    /** @todo mipmap access? */

    float a = 0.0;
    /* When using multiframe sampling, might not be necessary and even tends to add more blur */
#ifdef AASTEP
    if(u_aaSampling == 0) {         // LabelRenderPass.Sampling.None
#endif

        a = texStep(0.5, v_uv);

#ifdef AASTEP
    } else if(u_aaSampling == 1) {  // LabelRenderPass.Sampling.Smooth
        a = texSmooth(0.5, v_uv);
    } else if(u_aaSampling == 2) {  // LabelRenderPass.Sampling.Horizontal3
        a = aastep3h(0.5, v_uv);
    } else if(u_aaSampling == 3) {  // LabelRenderPass.Sampling.Vertical3
        a = aastep3v(0.5, v_uv);
    } else if(u_aaSampling == 4) {  // LabelRenderPass.Sampling.Grid3x3
        a = aastep3x3(0.5, v_uv);
    } else if(u_aaSampling == 5) {  // LabelRenderPass.Sampling.Grid4x4
        a = aastep4x4(0.5, v_uv);
    }
#endif

    /**
     * @todo - design decision: Don't discard fragments?, as we might need them for an id-buffer for
     * clicking-interaction. Furthermore, using if-statement and discard can slow down performance:
     * it's bad for IMR, TBR, TBDR and early-Z optimization
     * https://stackoverflow.com/questions/8509051/is-discard-bad-for-program-performance-in-opengl
     */
    if(a <= 0.0) {
        discard;
    }
    fragColor = vec4(u_color.rgb, u_color.a * a);

    /* use when pre-multiplied color is required. */
    /* fragColor = vec4(u_color.rgb * u_color.a * a, u_color.a * a); */
}
