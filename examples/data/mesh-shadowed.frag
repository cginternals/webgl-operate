
precision lowp float;

#if __VERSION__ == 100

    #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
    #endif

#endif

@import ../../source/shaders/facade.frag;


uniform vec2 u_lightNearFar;
uniform mat4 u_lightViewProjection;
uniform vec3 u_lightPosition;

uniform bool u_colored;

uniform sampler2D u_shadowMap;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


varying vec4 v_vertex;
varying vec2 v_uv;


@import ../../source/shaders/shadowpass;


const vec4 shadowColor = vec4(0.494, 0.753, 0.933, 1.0);
const float shadowBias = -0.002;


void main(void)
{
    float light_depth = SMDepth(v_vertex.xyz, u_lightPosition, u_lightNearFar);
    vec2 shadow_uv = SMCoordinates(v_vertex, u_lightViewProjection);

    //float visibility = ESMCompare(u_shadowMap, shadow_uv, light_depth, 80.0);
    //float visibility = VSMCompare(u_shadowMap, shadow_uv, light_depth, 0.0004, 0.3);
    float visibility = EVSMCompare(u_shadowMap, shadow_uv, light_depth, vec2(30.0, 10.0), 0.0);

    if (any(greaterThan(shadow_uv, vec2(1.0))) || any(lessThan(shadow_uv, vec2(0.0)))) {
        visibility = 1.0;
    }

    vec4 color = vec4(1.0);
    if (u_colored) {
        color = vec4(0.8 + (v_vertex.xyz * 0.2 - 0.1), 1.0);
    }

    fragColor = mix(shadowColor * color, color, visibility);
}
