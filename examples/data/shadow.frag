
precision highp float;

#if __VERSION__ == 100

    #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
    #endif

#endif

@import ../../source/shaders/facade.frag;


uniform vec2 u_lightNearFar;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec2 fragColor;
#endif


varying vec4 v_vertex;


@import ../../source/shaders/shadowpass;

void main(void)
{
    fragColor = calculateDepths(v_vertex.xyz, u_lightNearFar[1] - u_lightNearFar[0]);
}
