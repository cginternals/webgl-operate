
#if __VERSION__ == 100

    #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
    #endif

#endif

precision highp float;

@import ../../source/shaders/facade.frag;


uniform vec2 u_lightNearFar;
uniform vec3 u_lightPosition;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


varying vec4 v_vertex;


@import ../../source/shaders/shadowpass;


const float shadowExponent = 80.0;
const vec2 shadowExponents = vec2(30.0, 10.0);


void main(void)
{
    //fragColor = vec4(SMDepth(v_vertex.xyz, u_lightPosition, u_lightNearFar), 0.0, 0.0, 1.0);
    //fragColor = vec4(ESMDepth(v_vertex.xyz, u_lightPosition, u_lightNearFar, shadowExponent), 0.0, 0.0, 1.0);
    //fragColor = vec4(VSMDepth(v_vertex.xyz, u_lightPosition, u_lightNearFar), 0.0, 1.0);
    fragColor = EVSMDepth(v_vertex.xyz, u_lightPosition, u_lightNearFar, shadowExponents);
}
