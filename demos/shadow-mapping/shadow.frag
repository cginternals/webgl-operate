
precision highp float;


@import ../../source/shaders/facade.frag;


in vec4 v_vertex;

uniform float u_LightFarPlane;

out vec2 depths;


void main(void)
{
  float depth = length(v_vertex.xyz) / u_LightFarPlane;

  float dx = dFdx(depth);
  float dy = dFdy(depth);
  float moment = pow(depth, 2.0) + 0.25 * (dx*dx + dy*dy);

  depths = vec2(depth, moment);
}
