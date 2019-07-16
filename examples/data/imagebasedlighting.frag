
precision lowp float;

@import ../../source/shaders/facade.frag;


uniform sampler2D u_texture;
uniform bool u_textured;

uniform vec3 u_eye;

uniform samplerCube u_cubemap;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


varying vec4 v_vertex;
varying vec2 v_uv;


void main(void)
{
    vec3 X = dFdx(v_vertex.xyz);
    vec3 Y = dFdy(v_vertex.xyz);
    vec3 N = normalize(cross(X,Y));

    vec3 V = normalize(v_vertex.xyz - u_eye);
    vec3 R = reflect(V, N);

    if (u_textured) {
        // fragColor = texture(u_texture, v_uv);
        // fragColor = vec4(1.0, 0.0, 0.0, 1.0);
        fragColor = textureLod(u_cubemap, R, 1.0);
    } else {
        fragColor = vec4(v_vertex.xyz * 0.5 + 0.5, 1.0);
    }
}
