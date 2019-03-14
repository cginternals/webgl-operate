
precision highp float;


@import ../../source/shaders/facade.frag;


in vec4 v_lightVertex;

uniform float u_LightFarPlane;
uniform mat4 u_LightProjectionMatrix;

uniform sampler2D u_depthsTexture;

out vec4 fragColor;

@import ../../source/shaders/shadowmap.frag;


void main(void)
{
    vec4 projLightVertex = u_LightProjectionMatrix * vec4(v_lightVertex.xyz, 1.0);
    vec2 lightUV = (projLightVertex.xy / projLightVertex.w) * 0.5 + 0.5;
    float lightDepth = clamp(length(v_lightVertex.xyz) / u_LightFarPlane, 0.0, 1.0);

    float visibility = VSMCompare(u_depthsTexture, lightUV, lightDepth, -0.03);
    //float visibility = hardShadowCompare(u_depthsTexture, lightUV, lightDepth, -0.001);

    fragColor = vec4(vec3(visibility), 1.0);
}
