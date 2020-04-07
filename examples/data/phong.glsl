
vec3 phong(vec3 position, vec3 normal, vec3 eye)
{
    vec3 k_a = vec3(0.05, 0.05, 0.05);
    vec3 k_d = vec3(0.80, 0.80, 0.80);
    vec3 k_s = vec3(0.70, 0.70, 0.70);
    float shininess = 0.25 * 128.0;

    vec3 k_e = vec3(0.0, 0.0, 0.0);

    vec3 I_d0 = vec3(255.0 / 255.0, 250.0 / 255.0, 192.0 / 255.0);
    vec3 I_s0 = I_d0;

    vec3 I_d1 = vec3( 64.0 / 255.0, 128.0 / 255.0, 192.0 / 255.0);
    vec3 I_s1 = I_d1;

    vec3 N = normalize(normal);
    vec3 V = normalize(eye - position);

    vec3 L0 = normalize(vec3(+2.0, 3.0, 2.0));
    vec3 L1 = normalize(vec3(-3.0,-1.0, 1.0));

    vec3 R0 = reflect(-L0, N);
    vec3 R1 = reflect(-L1, N);

    vec3 I_a_global = vec3( 29.0 / 255.0,  35.0 / 255.0,  56.0 / 255.0);

    float NdotL0 = clamp(dot(N, L0), 0.0, 1.0);
    float NdotL1 = clamp(dot(N, L1), 0.0, 1.0);
    float RdotV0 = clamp(dot(R0, V), 0.0, 1.0);
    float RdotV1 = clamp(dot(R1, V), 0.0, 1.0);

    vec3 I = I_a_global * k_a + k_e
        + I_d0 * k_d * NdotL0
        + I_s0 * k_s * pow(RdotV0, shininess)
        + I_d1 * k_d * NdotL1
        + I_s1 * k_s * pow(RdotV1, shininess);

    return I;
}
