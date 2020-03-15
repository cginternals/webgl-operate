
precision lowp float;

@import ../../source/shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

# define NUMBER_OF_METABALLS 4
# define BASE_ENERGY 0.06

varying vec2 v_uv;

struct MetaBall {
    vec3 position;
    float energy;
};

/*struct FragmentValues {
    float energy;
    vec3 normal;
};*/

const vec4 metaballColor = vec4(0.372549, 0.623529, 0.623529, 1.0);
const vec4 backgroundColor = vec4(0.8, 0.8, 0.8, 1.0);

float distFunc(MetaBall metaball, vec3 rayPosition) {
    return metaball.energy / distance(metaball.position, rayPosition);
}

float rayMarch(MetaBall[NUMBER_OF_METABALLS] metaballs, vec2 rayPosition) {
    //FragmentValues fragmentValues;
    //fragmentValues.energy = 0.0;
    float max_energy = 0.0;

    for (float marchDistance = 0.0; marchDistance < 1.0; marchDistance += 0.01) {
        //FragmentValues currentFragmentValues;
        //currentFragmentValues.energy = 0.0;
        float currentEnergy = 0.0;
        vec3 currentRayPosition = vec3(rayPosition, marchDistance);

        for (int metaballIndex = 0; metaballIndex < metaballs.length(); metaballIndex++) {
            MetaBall currentMetaball = metaballs[metaballIndex];
            currentEnergy += distFunc(currentMetaball, currentRayPosition);
            //fragmentValues.energy += currentEnergy;
            //vec3 currentNormal = currentRayPosition - currentMetaball.position;
            //fragmentValues.normal += currentNormal * currentEnergy;
        }
        //fragmentValues.energy = currentFragmentValues.energy > fragmentValues.energy ? currentFragmentValues.energy : fragmentValues.energy;
        max_energy = max(currentEnergy, max_energy);
    }
    //return fragmentValues;
    return max_energy;
}

void main(void)
{
    // Define all metaballs
    MetaBall metaballs[NUMBER_OF_METABALLS];
    metaballs[0].position = vec3(0.0, -0.5, 0.5);
    metaballs[0].energy = BASE_ENERGY;
    metaballs[1].position = vec3(-0.2, 0.2, 0.7);
    metaballs[1].energy = BASE_ENERGY * 1.5;
    metaballs[2].position = vec3(0.9, -0.2, 0.9);
    metaballs[2].energy = BASE_ENERGY;
    metaballs[3].position = vec3(0.5, 0.3, 0.2);
    metaballs[3].energy = BASE_ENERGY;


    // Compute the color
    float fragmentValues = rayMarch(metaballs, v_uv);
    fragColor = step(0.5, fragmentValues) * metaballColor;
    fragColor += (1.0 - step(0.5, fragmentValues)) * backgroundColor;
}


// NOTE for compilation errors look at the line number and subtract 7
