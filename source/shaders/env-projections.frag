precision highp float;
precision highp int;

/**
  To be replaced via Shader.replace();
 */
#define PROJECTION_TYPE

@import ./facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


uniform int u_mode;
uniform bool u_skipLod;

#if defined(CUBE_MAP)
    uniform samplerCube u_cubemap;
#elif defined(EQUI_MAP)
    uniform sampler2D u_equirectmap;
#elif defined(SPHERE_MAP)
    uniform sampler2D u_spheremap;
#elif defined(POLAR_MAP)
    uniform sampler2D u_polarmap[2];
#endif

varying vec2 v_uv;
varying vec4 v_ray;


const float PI = 3.141592653589793;
const float OneOver2PI = 0.1591549430918953357688837633725;
const float OneOverPI  = 0.3183098861837906715377675267450;


void main(void)
{
    vec2 uv = v_uv;
    vec3 ray = normalize(v_ray.xyz);

    #if defined(CUBE_MAP)
        #if __VERSION__ == 100
            fragColor = u_skipLod ? textureCubeLod(u_cubemap, vec3(ray), 0.0) : textureCube(u_cubemap, vec3(ray));
        #else
            fragColor = u_skipLod ? textureLod(u_cubemap, vec3(ray), 0.0) : texture(u_cubemap, vec3(ray));
        #endif
    #endif

    #if defined(EQUI_MAP)
        float v = acos(-ray.y) * OneOverPI;
        float m = atan(-ray.x, ray.z);
        uv = vec2(m * OneOver2PI + 0.5, v);

        fragColor = texture(u_equirectmap, uv);
    #endif

    #if defined(SPHERE_MAP)
        ray = -ray.xzy;
        ray.y *= -1.0;
        ray.z += +1.0;
        uv = 0.5 + 0.5 * ray.xy / length(ray);

        fragColor = texture(u_spheremap, uv);
    #endif

    #if defined(POLAR_MAP)
        ray.xz /= abs(ray.y) + 1.0;
        ray.xz = ray.xz * 0.5 + 0.5;
        ray.x *= -1.0;

        fragColor = mix(texture(u_polarmap[1], ray.xz),
                        texture(u_polarmap[0], vec2(1.0, -1.0) * ray.xz),
                        step(0.0, ray.y));
    #endif
}
