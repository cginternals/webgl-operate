
#if __VERSION__ == 100

    #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
    #endif

#endif

precision highp float;

@import ../../source/shaders/facade.frag;


uniform vec2 u_lightNearFar;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


varying vec4 v_vertex;


@import ../../source/shaders/shadowpass;

void main(void)
{
    //fragColor = vec4(ESMDepths(v_vertex.xyz, u_lightNearFar[0], u_lightNearFar[1], 80.0), 0.0, 0.0, 1.0);
    //fragColor = vec4(VSMDepths(v_vertex.xyz, u_lightNearFar[0], u_lightNearFar[1]), 0.0, 1.0);
    fragColor = EVSMDepths(v_vertex.xyz, u_lightNearFar[0], u_lightNearFar[1], vec2(30.0, 10.0));
}
