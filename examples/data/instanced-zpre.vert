
precision highp float;
precision highp int;

@import ../../source/shaders/facade.vert;

#if __VERSION__ == 100
    attribute vec3 a_vertex;
    attribute vec2 a_texCoord;
#else
    layout(location = 0) in vec3 a_vertex;
    layout(location = 1) in vec2 a_texCoord;
#endif

uniform float u_seed;

uniform mat4 u_model;
uniform mat4 u_viewProjection;

uniform int u_numInstances;
uniform int u_drawMode;


varying vec4 v_vertex;
varying vec2 v_uv;
// varying vec3 v_normal;

varying float v_attenuation;


float rand(in vec2 uv) {
    // return mod(uv.x * 12213.231 + uv.y * 32132.567, 1.0);
    return fract(sin(u_seed + dot(uv, vec2(12.9898, 78.233))) * 4375.5453123);
}

void main()
{
    int n = u_numInstances;
    float n05 = float(u_numInstances) * 0.5;

    vec3 offset = vec3(float(gl_InstanceID % n), float((gl_InstanceID / n) % n), float(gl_InstanceID / (n * n)));
    offset += 0.5 - n05 + 0.5 * vec3(rand(offset.yz), rand(offset.zx), rand(offset.xy)) - 0.25;

    vec4 vertex = u_model * vec4(a_vertex, 1.0);

    if(u_drawMode == 0) {

    } else {
        v_attenuation = min(1.0, pow(length(offset) / n05, 2.0));
        v_uv = a_texCoord;
        // v_normal = normalize(a_vertex);
        v_vertex = vertex;
    }

    offset.xyz *= 0.50;
    vertex.xyz *= 0.125;

    vec4 position = u_viewProjection * (vertex + vec4(offset, 1.0));
    gl_Position = position;
}
