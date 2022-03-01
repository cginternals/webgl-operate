precision lowp float;

layout(location = 0) out vec4 fragColor;

in vec4 v_color;

void main(void)
{
    fragColor = v_color;
}
