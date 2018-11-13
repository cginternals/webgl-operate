
precision lowp float;

@import ../shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
    #extension GL_OES_standard_derivatives : enable
#else
    layout(location = 0) out vec4 fragColor;
#endif

uniform sampler2D u_Texture;
uniform int u_KernelSize;
uniform ivec2 u_Size;

varying vec2 v_uv;


void main(void)
{
    vec4 color = vec4(0.0);
    vec2 delta = 1.0 / vec2(u_Size);
    for (int x = -u_KernelSize / 2; x <= u_KernelSize / 2; ++x)
    {
        for (int y = -u_KernelSize / 2; y <= u_KernelSize; ++y)
        {
            color += texture(u_Texture, v_uv + delta * vec2(float(x), float(y)));
        }
    }
    fragColor = color / float(u_KernelSize * u_KernelSize);
}
