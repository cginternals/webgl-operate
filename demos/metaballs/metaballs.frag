
precision lowp float;

@import ../../source/shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

// NOTE: the phong shading coeffcients are currently assumed to be the same for all metaballs.

# define NUMBER_OF_METABALLS 4
# define BASE_ENERGY 0.06
# define POSITVE_METABALL 1.0
# define NEGATIVE_METABALL -1.0

# define NUMBER_OF_LIGHTS 1
# define AMBIENT_ILLUMINATION 0.3
# define DIFFUSE_ILLUMINATION 0.7
# define SPECULAR_ILLUMINATION 0.7

varying vec2 v_uv;

struct MetaBall {
    vec3 position;
    float energy;
    float metaballEneryOrientation; // should be POSITIVE_METABALL or NEGATIVE_METABALL
};

struct FragmentValues {
    float energy;
    vec3 normal;
    vec3 rayPosition;
};

struct PointLight {
    vec3 position;
    float shininess;
};

const vec3 metaballColor = vec3(1.0, 0.5, 1.0);
const vec3 backgroundColor = vec3(0.9, 0.9, 0.9);

float distFunc(MetaBall metaball, vec3 rayPosition) {
    return metaball.energy / distance(metaball.position, rayPosition);
}

FragmentValues rayMarch(MetaBall[NUMBER_OF_METABALLS] metaballs, vec2 rayPosition) {
    FragmentValues fragmentValues;

    for (float marchDistance = 0.0; marchDistance < 1.0; marchDistance += 0.01) {
        FragmentValues currentFragmentValues;
        currentFragmentValues.energy = 0.0;
        vec3 currentRayPosition = vec3(rayPosition, marchDistance);

        for (int metaballIndex = 0; metaballIndex < NUMBER_OF_METABALLS; metaballIndex++) {

            MetaBall currentMetaball = metaballs[metaballIndex];
            float currentEnergy = currentMetaball.metaballEneryOrientation * distFunc(currentMetaball, currentRayPosition);
            currentFragmentValues.energy += currentEnergy;
            vec3 currentNormal = currentRayPosition - currentMetaball.position;
            fragmentValues.normal += currentNormal * currentEnergy;
        }
        fragmentValues.normal = currentFragmentValues.energy > fragmentValues.energy ? currentFragmentValues.normal : fragmentValues.normal;
        fragmentValues.rayPosition = currentFragmentValues.energy > fragmentValues.energy ? currentRayPosition : fragmentValues.rayPosition;
        fragmentValues.energy = max(currentFragmentValues.energy, fragmentValues.energy);
    }
    return fragmentValues;
}

void main(void)
{
    // Define all metaballs
    MetaBall metaballs[NUMBER_OF_METABALLS];
    metaballs[0].position = vec3(0.0, -0.5, 0.9);
    metaballs[0].energy = BASE_ENERGY;
    metaballs[0].metaballEneryOrientation = POSITVE_METABALL;
    metaballs[1].position = vec3(-0.2, 0.2, 0.7);
    metaballs[1].energy = BASE_ENERGY * 1.5;
    metaballs[1].metaballEneryOrientation = POSITVE_METABALL;
    metaballs[2].position = vec3(0.9, -0.2, 0.9);
    metaballs[2].energy = BASE_ENERGY;
    metaballs[2].metaballEneryOrientation = POSITVE_METABALL;
    metaballs[3].position = vec3(0.5, 0.3, 0.2);
    metaballs[3].energy = BASE_ENERGY;
    metaballs[3].metaballEneryOrientation = POSITVE_METABALL;

    // Point Lights
    PointLight pointLights[NUMBER_OF_LIGHTS];
    pointLights[0].position = vec3(0.0, 3.0, -2.0);
    pointLights[0].shininess = 100.0;

    // Compute the color
    FragmentValues fragmentValues = rayMarch(metaballs, v_uv);
    fragmentValues.normal = normalize(fragmentValues.normal);

    float illumination = 1.0;
    // Phong shading
    if (fragmentValues.energy > 0.5) {
        illumination = AMBIENT_ILLUMINATION;

        for (int lightIndex = 0; lightIndex < NUMBER_OF_LIGHTS; lightIndex++) {
            PointLight pointLight = pointLights[lightIndex];
            vec3 lightDirection = normalize(pointLight.position - fragmentValues.rayPosition);
            vec3 reflectDir = reflect(-lightDirection, fragmentValues.normal);

            float diffuse = max(dot(fragmentValues.normal, lightDirection), 0.0);

            float specularAngle = max(dot(reflectDir, fragmentValues.normal), 0.0);
            float specular = pow(specularAngle, pointLight.shininess);

            illumination += DIFFUSE_ILLUMINATION * diffuse;
            illumination += SPECULAR_ILLUMINATION * specular;
        }
    }
    fragColor = fragmentValues.energy > 0.5 ? vec4(metaballColor * illumination, 1.0) : vec4(backgroundColor, 1.0);
}

// NOTE for compilation errors look at the line number and subtract 7
