
precision lowp float;

@import ../../source/shaders/facade.frag;
@import ../../source/shaders/tonemapping;


uniform sampler2D u_albedoTexture;
uniform sampler2D u_roughnessTexture;
uniform sampler2D u_metallicTexture;
uniform sampler2D u_normalTexture;
uniform sampler2D u_brdfLUT;
uniform bool u_textured;

uniform vec3 u_eye;

uniform samplerCube u_cubemap;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


varying vec4 v_vertex;
varying vec2 v_uv;
varying vec3 v_normal;

const float MIP_COUNT = 8.0;

// Adapted from the sample glTF viewer
// https://github.com/KhronosGroup/glTF-Sample-Viewer/blob/master/src/shaders/metallic-roughness.frag
// Commit 6f1fb2d
vec3 getIBLContribution(vec3 n, vec3 v, float perceptualRoughness, vec3 diffuseColor, vec3 specularColor)
{
    float NdotV = clamp(dot(n, v), 0.0, 1.0);

    float lod = clamp(perceptualRoughness * MIP_COUNT, 0.0, MIP_COUNT);
    vec3 reflection = normalize(reflect(-v, n));

    vec2 brdfSamplePoint = clamp(vec2(NdotV, perceptualRoughness), vec2(0.0, 0.0), vec2(1.0, 1.0));
    vec2 brdf = texture(u_brdfLUT, brdfSamplePoint).rg;

    vec4 specularSample = textureLod(u_cubemap, reflection, lod);

    // TODO: use a prefiltered diffuse environment map
    vec3 diffuseLight = vec3(0.8);
    vec3 specularLight = SRGBtoLINEAR(specularSample).rgb;

    vec3 diffuse = diffuseLight * diffuseColor;
    vec3 specular = specularLight * (specularColor * brdf.x + brdf.y);

    return diffuse + specular;
}

void main(void)
{
    vec3 N = normalize(v_normal);
    vec3 T = normalize(dFdx(v_vertex.xyz));
    vec3 B = normalize(cross(T, N));
    mat3 TBN = mat3(T, B, N);

    vec3 view = normalize(u_eye - v_vertex.xyz);

    vec3 albedoColor = texture(u_albedoTexture, v_uv).rgb;
    albedoColor = pow(albedoColor, vec3(GAMMA));

    vec3 normalSample = texture(u_normalTexture, v_uv).rgb;
    vec3 normal = normalize(normalSample * 2.0 - 1.0);
    normal = normalize(TBN * normal);

    float roughness = texture(u_roughnessTexture, v_uv).r;
    float metallic = texture(u_metallicTexture, v_uv).r;

    const vec3 f0 = vec3(0.04);
    vec3 diffuseColor = albedoColor * (vec3(1.0) - f0) * (1.0 - metallic);
    vec3 specularColor = mix(f0, albedoColor, metallic);

    vec3 IBL = getIBLContribution(normal, view, roughness, diffuseColor, specularColor);
    fragColor = vec4(IBL, 1.0);
    fragColor.rgb = toneMapUncharted(fragColor.rgb);
}
