precision highp float;

@import ../../../source/shaders/facade.frag;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

in vec2 v_uv;

uniform vec2 u_kernelSize;
uniform vec2 u_frameSize;

uniform sampler2D u_source;

const int kernelSize = 5;
const int kernelHalfSize = 2;
const float kernel[25] = float[25](
    1.0,  4.0,  6.0,  4.0, 1.0,
    4.0, 16.0, 24.0, 16.0, 4.0,
    6.0, 24.0, 36.0, 24.0, 6.0,
    4.0, 16.0, 24.0, 16.0, 4.0,
    1.0,  4.0,  6.0,  4.0, 1.0
);

void main(void)
{
    /*
    vec2 offset = vec2(1.0) / vec2(u_frameSize);

    vec4 result = vec4(0.0);
    float weight_sum = 0.0;

    for (int y = 0; y < kernelSize; ++y) {
        for (int x = 0; x < kernelSize; ++x) {
            vec2 local_uv = v_uv + vec2(x - kernelHalfSize, y - kernelHalfSize) * offset;

            if (local_uv.x < 0.0 || local_uv.x > 1.0 || local_uv.y < 0.0 || local_uv.y > 1.0) {
                continue;
            }

            vec4 color = texture(u_source, local_uv);
            float weight = kernel[y * kernelSize + x];
            result += weight * color;
            weight_sum += weight;
        }
    }

    fragColor = vec4(result.rgb / vec3(weight_sum), 1.0);
    */

    fragColor = texture(u_source, v_uv);
}
