precision highp float;

@import ../../../source/shaders/facade.frag;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

in vec2 v_uv;

uniform int u_kernelSize;
uniform vec2 u_frameSize;

uniform sampler2D u_source;

#define TARGET_KERNEL_SIZE 5

#if TARGET_KERNEL_SIZE==5

const int kernelSize = 5;
const int kernelHalfSize = 2;
const float kernel[25] = float[25](
    1.0,  4.0,  6.0,  4.0, 1.0,
    4.0, 16.0, 24.0, 16.0, 4.0,
    6.0, 24.0, 36.0, 24.0, 6.0,
    4.0, 16.0, 24.0, 16.0, 4.0,
    1.0,  4.0,  6.0,  4.0, 1.0
);

#elif TARGET_KERNEL_SIZE==7

const int kernelSize = 7;
const int kernelHalfSize = 3;
const float kernel[49] = float[49](
     1.0,  6.0, 15.0, 20.0, 15.0,  6.0,  1.0,
     6.0, 36.0, 90.0,120.0, 90.0, 36.0,  6.0,
    15.0, 90.0,225.0,300.0,225.0, 90.0, 15.0,
    20.0,120.0,300.0,400.0,300.0,120.0, 20.0,
    15.0, 90.0,225.0,300.0,225.0, 90.0, 15.0,
     6.0, 36.0, 90.0,120.0, 90.0, 36.0,  6.0,
     1.0,  6.0, 15.0, 20.0, 15.0,  6.0,  1.0
);

#else

const int kernelSize = 1;
const int kernelHalfSize = 0;
const float kernel[1] = float[1](
    1.0
);

#endif

void main(void)
{
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

    if (weight_sum < 0.0001) {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    fragColor = vec4(result.rgb / vec3(weight_sum), 1.0);
}
