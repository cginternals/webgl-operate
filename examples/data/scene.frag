
precision lowp float;

@import ../../source/shaders/facade.frag;


uniform sampler2D u_texture;
uniform bool u_textured;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


varying vec4 v_vertex;
varying vec2 v_uv;


void main(void)
{
    if (u_textured) {
        fragColor = texture(u_texture, v_uv);
    } else {
        const float lineWidth = 0.01;
        const float lineScale = 3.0;

        vec3 remainder = mod(v_vertex.xyz, 1.0 / lineScale);

        if (any(lessThan(remainder, vec3(lineWidth)))) {
            fragColor = vec4(0.0, 0.0, 0.0, 1.0);
        }
        else {
            fragColor = vec4(1.0);
        }
    }
}
