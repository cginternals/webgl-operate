
precision lowp float;

@import ../../../source/shaders/facade.frag;


uniform sampler2D u_texture;
uniform bool u_textured;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


varying vec4 v_vertex;
varying vec2 v_uv;

in vec4 v_clipPos;
uniform bool u_enableClipping;

bool shouldBeClipped (vec4 pos) {
    vec3 lowerCheck = step(pos.xyz, vec3(-pos.w));
    vec3 upperCheck = step(vec3(pos.w), pos.xyz);
    return any(bvec3(lowerCheck)) || any(bvec3(upperCheck));
}

void main(void)
{
    vec4 diffuse = vec4(v_vertex.xyz * 0.5 + 0.5, 1.0);

    if (u_textured) {
        diffuse = texture(u_texture, v_uv);
    }
    if (u_enableClipping && shouldBeClipped(v_clipPos)) {
        diffuse *= vec4(1.0, 0.0, 0.0, 1.0);
        // discard;
    }
    fragColor = diffuse;
}
