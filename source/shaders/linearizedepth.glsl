
float linearizeDepth(float zInNDC, float near, float far) {
    float zLinear = 2.0 * near;
    zLinear /= far + near - zInNDC * (far - near);
    return zLinear;
}
