
precision lowp float;

@import ../../source/shaders/facade.frag;


uniform sampler2D u_texture;
uniform bool u_textured;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


varying vec3 v_vertex;
varying vec2 v_texcoord;


void main(void)
{
    if (u_textured) {
        fragColor = texture(u_texture, v_texcoord);
    } else {
        fragColor = vec4(v_vertex * 0.5 + 0.5, 1.0);
    }
}
