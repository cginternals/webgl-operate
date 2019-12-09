
precision lowp float;
precision lowp int;

@import ../../source/shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


uniform sampler2D u_patches;
uniform int u_numcubes;

varying float v_heightAddition;
varying vec3 v_cube;
varying vec3 v_global;


vec2 extract(in vec3 x)
{
    return mix(mix(x.xy, x.xz, float(abs(x.y) > 0.999)), x.zy, float(abs(x.x) > 0.999));
}

vec3 extractNormal(in vec3 x)
{
    return mix(mix(
        vec3(0.0, 0.0, 1.0),
        vec3(0.0, 1.0, 0.0),
        float(abs(x.y) > 0.999)
    ),
    vec3(1.0, 0.0, 0.0),
    float(abs(x.x) > 0.999)
    );
}


void main()
{
	vec2 texCoord = extract(v_cube) * 0.5 + 0.5;
	float cubeHeight = 2.0 / float(u_numcubes);
	if(v_cube.y < 0.999)
		texCoord.y = mod(v_global.y, cubeHeight) / cubeHeight;
	texCoord.x *= 0.25;

    // compute shadow
    vec3 light = vec3(-2.0, 3.0, 1.0);
    vec3 light_ray = normalize(light - v_global);
    vec3 normal = extractNormal(v_cube);
    float a = dot(normal, light_ray);

    // compute color
	float t = (2.0 / 3.0 - v_heightAddition * 2.0) * 1.5 * 4.0 - 1.0;
	vec3 c0 = texture(u_patches, texCoord + max(floor(t), 0.0) * vec2(0.25, 0.0)).xyz;
	vec3 c1 = texture(u_patches, texCoord + min(floor(t) + 1.0, 3.0) * vec2(0.25, 0.0)).xyz;

	fragColor = vec4(mix(c0, c1, smoothstep(0.25, 0.75, fract(t))) * pow(a, 0.5), 1.0);
}
