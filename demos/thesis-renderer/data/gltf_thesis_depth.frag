
#if __VERSION__ == 100

    #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
    #endif

#endif

precision highp float;

@import ../../../source/shaders/facade.frag;


uniform vec2 u_cameraNearFar;
uniform mat4 u_view;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


varying vec3 v_position;


void main(void)
{
    vec4 viewPosition = u_view * vec4(v_position, 1.0);

    float depth = (length(viewPosition) - u_cameraNearFar[0]) / (u_cameraNearFar[1] - u_cameraNearFar[0]);
    fragColor = vec4(depth, 0.0, 0.0, 1.0);
}
