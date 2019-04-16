
precision highp float;


@import ../../source/shaders/facade.frag;


in vec4 v_lightVertex;

uniform float u_LightFarPlane;
uniform mat4 u_LightProjectionMatrix;

uniform sampler2D u_depthsTexture;

out vec4 fragColor;

@import ../../source/shaders/shadow_mapping;


void main(void)
{
    vec4 projLightVertex = u_lightProjectionMatrix * vec4(v_lightVertex.xyz, 1.0);
    vec2 lightUV = (projLightVertex.xy / projLightVertex.w) * 0.5 + 0.5;
    float lightDepth = clamp(length(v_lightVertex.xyz) / u_lightFarPlane, 0.0, 1.0);

    float visibility = hardShadowCompare(u_depthsTexture, lightUV, lightDepth, -0.001);

    const vec4 shadowColor = vec4(0.494, 0.753, 0.933, 0.0);
    const vec4 objectColor = vec4(1.0);

    fragColor = calculateShadowColor(objectColor, visibility, 0.2, shadowColor, 0.1);
}
