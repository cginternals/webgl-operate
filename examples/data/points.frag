precision lowp float;

layout(location = 0) out vec4 fragColor;

in vec4 v_color;

void main(void)
{
    vec2 uv = gl_PointCoord.xy * 2.0 - 1.0;

    float zz = dot(uv, uv);
    if (zz > 1.0) discard;

    fragColor = v_color;
}
