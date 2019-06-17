
precision highp float;


@import ../../source/shaders/facade.frag;


in vec4 v_vertex;

uniform float u_lightFarPlane;

out vec2 depths;


@import ../../source/shaders/shadow_mapping;


void main(void)
{
    depths = calculateDepths(v_vertex.xyz, u_lightFarPlane);
}
