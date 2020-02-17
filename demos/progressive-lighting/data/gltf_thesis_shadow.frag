
#if __VERSION__ == 100

    #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
    #endif

#endif

precision highp float;

@import ../../../source/shaders/facade.frag;


uniform vec2 u_lightNearFar;
uniform vec3 u_lightPosition;
uniform mat4 u_view;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


varying vec3 v_position;


@import ../../../source/shaders/shadowpass;

void main(void)
{
    vec4 viewPosition = u_view * vec4(v_position, 1.0);
    fragColor = vec4(VSMDepth(v_position, u_lightPosition, u_lightNearFar), 0.0, 1.0);
}
