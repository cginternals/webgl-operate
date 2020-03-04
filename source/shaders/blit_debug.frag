
precision highp float;

@import ./facade.frag;

@import ./float_pack;
@import ./linearizedepth;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


uniform sampler2D u_source;

uniform int u_mode; /* Debug mode. */
uniform vec2 u_linearize; /* [ zNear, zFar ] */


varying vec2 v_uv;


void main(void)
{
    vec4 source = texture(u_source, v_uv);

    if(u_mode == 1) {           /* Depth */
        source.rgb = vec3(source[0]);

    } else if (u_mode == 2) {   /* DepthLinear */
        float zLinear = linearizeDepth(source[0], u_linearize[0], u_linearize[1]);
        source.rgb = vec3(zLinear);

    } else if(u_mode == 3) {    /* DepthPacked */
        source.rgb = float24x1_to_uint8x3(source[0]);

    } else if (u_mode == 4) {   /* DepthLinearPacked */
        float zLinear = linearizeDepth(source[0], u_linearize[0], u_linearize[1]);
        source.rgb = float24x1_to_uint8x3(zLinear);
    }

    fragColor = source;
}
