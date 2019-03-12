
precision highp float;


@import ./facade.frag;


in vec4 v_vertex;

uniform float u_lightFarPlane;

out vec2 depths;


void main(void)
{
  float depth = length(v_vertex.xyz) / u_lightFarPlane;

  float dx = dFdx(depth);
  float dy = dFdy(depth);
  float moment = pow(depth, 2.0) + 0.25 * (dx*dx + dy*dy);

  depths = vec2(depth, moment);
}
