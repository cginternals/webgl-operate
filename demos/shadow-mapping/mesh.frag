
precision highp float;


@import ../../source/shaders/facade.frag;

const vec4 shadowColor = vec4(0.494, 0.753, 0.933, 0.0);

in vec4 v_lightVertex;
in float v_height;

uniform float u_lightFarPlane;
uniform mat4 u_lightProjectionMatrix;

uniform sampler2D u_depthTexture;

out vec4 fragColor;

@import ../../source/shaders/shadowpass;


void main(void)
{
    vec4 projLightVertex = u_lightProjectionMatrix * vec4(v_lightVertex.xyz, 1.0);
    vec2 lightUV = (projLightVertex.xy / projLightVertex.w) * 0.5 + 0.5;
    float lightDepth = clamp(length(v_lightVertex.xyz) / u_lightFarPlane, 0.0, 1.0);

    float visibility = VSMCompare(u_depthTexture, lightUV, lightDepth, -0.05);

    vec4 objectColor = (v_height < -1.0) ? vec4(vec3(1.0), 1.0) : vec4(vec3(0.5), 1.0);

    fragColor = calculateShadowColor(objectColor, visibility, 0.2, shadowColor, 0.1);
}
