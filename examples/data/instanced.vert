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
varying float v_attenuation;
varying vec3 v_position;

uniform mat4 u_viewProjection;

void main(void)
{
    v_uv = a_uv;

    vec3 offset = vec3(float(gl_InstanceID % 32 - 16), float((gl_InstanceID / 32) % 32 - 16), float(gl_InstanceID / 1024 - 16));
    v_attenuation = min(1.0, length(offset) * 0.1);
    vec3 position = a_position.xyz;
    v_position = position * 0.6 + 0.5;
    gl_Position = u_viewProjection * vec4(position * 0.1 + offset * 0.25, 1.0);
}
