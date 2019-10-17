
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

void main(void)
{
    fragColor = vec4(SMDepth(v_vertex.xyz, u_lightPosition, u_lightNearFar), 0.0, 0.0, 1.0);
}
