precision highp float;

// Adapted from https://github.com/KhronosGroup/glTF-WebGL-PBR

@import ../../source/shaders/facade.vert;


#if __VERSION__ == 100
    attribute vec3 a_position;
    attribute vec2 a_uv;
#else
    layout (location = 0) in vec3 a_position;
    layout (location = 1) in vec2 a_uv;
#endif

varying vec2 v_uv;

uniform mat4 u_viewProjection;

void main(void)
{
    v_uv = a_uv;

    float x = float(gl_InstanceID % 4) * 1.5;
    float y = float(gl_InstanceID / 4) * 1.5;

    vec3 position = a_position.xyz;
    position.xy += vec2(x, y);
    gl_Position = u_viewProjection * vec4(position, 1.0);
}
