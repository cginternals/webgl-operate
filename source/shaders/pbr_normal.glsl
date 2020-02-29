
vec3 pbrNormal(in vec3 position, in vec2 uv, in vec3 normal_v, in sampler2D normal_t)
{
    // Retrieve the tangent space matrix
    mat3 tbn;

    vec3 pos_dx = dFdx(position);
    vec3 pos_dy = dFdy(position);

    vec3 tex_dx = dFdx(vec3(uv, 0.0));
    vec3 tex_dy = dFdy(vec3(uv, 0.0));

    vec3 t = (tex_dy.t * pos_dx - tex_dx.t * pos_dy) / (tex_dx.s * tex_dy.t - tex_dy.s * tex_dx.t);

    vec3 ng;
    ng = normalize(normal_v);

    t = normalize(t - ng * dot(ng, t));
    vec3 b = normalize(cross(ng, t));
    tbn = mat3(t, b, ng);

    vec3 n = texture(normal_t, uv).rgb;
    n = normalize(tbn * ((2.0 * n - 1.0) * vec3(1.0, 1.0, 1.0)));

    n *= (2.0 * float(gl_FrontFacing) - 1.0);

    return n;
}
