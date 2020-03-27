
precision lowp float;

@import ../../source/shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

uniform mat4 u_viewProjection;

uniform sampler2D u_metaballsTexture;
uniform int u_metaballsTextureSize;

uniform sampler2D u_lightsTexture;
uniform int u_lightsTextureSize;


uniform samplerCube u_cubemap;


varying vec2 v_uv;

# define BASE_ENERGY 0.06
# define THRESHOLD 0.5
# define STEP_THRESHOLD 0.001
# define METABALL_TRANSPARENCY 0.9

// NOTE: the phong shading coeffcients are currently assumed to be the same for all metaballs.
# define AMBIENT_ILLUMINATION 0.3
# define DIFFUSE_ILLUMINATION 0.7
# define SPECULAR_ILLUMINATION 0.7


struct MetaBall {
    vec4 position;
    float energy;
};

struct FragmentValues {
    float energy;
    vec4 normal;
    vec4 rayPosition;
};

struct PointLight {
    vec4 position;
    float shininess;
};

const vec3 metaballColor = vec3(1.0, 0.5, 1.0);
const vec3 backgroundColor = vec3(0.9, 0.9, 0.9);

vec2 calculateAbsoluteTextureCoords(int width, int height, int maxWidth, int maxHeight) {
    return vec2(
        (2.0 * float(width) + 1.0) / (2.0 * float(maxWidth)),
        (2.0 * float(height) + 1.0) / (2.0 * float(maxHeight))
    );
}

MetaBall getMetaball(int index) {
    vec4 texVals = texture(u_metaballsTexture, calculateAbsoluteTextureCoords(index, 0, u_metaballsTextureSize, 1));
    MetaBall metaball;
    metaball.position = vec4(texVals.xyz, 1.0);
    metaball.energy = BASE_ENERGY * texVals.w;
    return metaball;
}

PointLight getPointLight(int index) {
    vec4 texVals = texture(u_lightsTexture, calculateAbsoluteTextureCoords(index, 0, u_lightsTextureSize, 1));
    PointLight pointLight;
    pointLight.position = vec4(texVals.xyz, 1.0);
    pointLight.shininess = texVals.w;
    return pointLight;
}

float distFunc(MetaBall metaball, vec4 rayPosition) {
    return metaball.energy / distance(metaball.position, rayPosition);
}


FragmentValues rayMarch(vec4 rayPosition, vec4 rayDirection) {
    FragmentValues fragmentValues;
    float stepWidth = 0.1;
    bool alreadyPassedThreshold = false;
    float marchSign = 1.0;
    bool finishedSearching = false;
    for (float marchDistance = 0.0; marchDistance < 1.0 && !finishedSearching; marchDistance += stepWidth * marchSign) {
    FragmentValues currentFragmentValues;
        currentFragmentValues.normal = vec4(0.0);
        currentFragmentValues.energy = 0.0;
        vec4 currentRayPosition = rayPosition + vec4(rayDirection.xyz * marchDistance, 0.0);

        for (int metaballIndex = 0; metaballIndex < u_metaballsTextureSize; metaballIndex++) {

            MetaBall currentMetaball = getMetaball(metaballIndex);
            float currentEnergy = distFunc(currentMetaball, currentRayPosition);
            currentFragmentValues.energy += currentEnergy;
            vec4 currentNormal = normalize(currentRayPosition - currentMetaball.position);
            currentFragmentValues.normal += currentNormal * currentEnergy;
        }
        bool currentFragmentPassedThreshold = currentFragmentValues.energy > THRESHOLD;
        if (currentFragmentPassedThreshold) {
            currentFragmentValues.rayPosition = currentRayPosition;
            fragmentValues = currentFragmentValues;
            alreadyPassedThreshold = true;
        }
        stepWidth = alreadyPassedThreshold ? stepWidth / 2.0 : stepWidth;
        marchSign = alreadyPassedThreshold && currentFragmentPassedThreshold ? -1.0 : 1.0;
        finishedSearching = stepWidth < STEP_THRESHOLD;
    }
    return fragmentValues;
}

/*FragmentValues rayMarch(vec4 rayPosition, vec4 rayDirection) {
    for (float marchDistance = 0.0; marchDistance < 1.0; marchDistance += 0.01) {
        FragmentValues currentFragmentValues;
        currentFragmentValues.energy = 0.0;
        vec4 currentRayPosition = rayPosition + vec4(rayDirection.xyz * marchDistance, 0.0);

        for (int metaballIndex = 0; metaballIndex < u_metaballsTextureSize; metaballIndex++) {

            MetaBall currentMetaball = getMetaball(metaballIndex);
            float currentEnergy = distFunc(currentMetaball, currentRayPosition);
            currentFragmentValues.energy += currentEnergy;
            vec4 currentNormal = normalize(currentRayPosition - currentMetaball.position);
            currentFragmentValues.normal += currentNormal * currentEnergy;
        }
        if(currentFragmentValues.energy > THRESHOLD) {
            currentFragmentValues.rayPosition = currentRayPosition;
            return currentFragmentValues;
        }
    }
    FragmentValues fragmentValues;
    return fragmentValues;
}*/

float calculateIllumination(FragmentValues fragmentValues) {
    // Phong shading
    float illumination = AMBIENT_ILLUMINATION;
    for (int lightIndex = 0; lightIndex < u_lightsTextureSize; lightIndex++) {
        PointLight pointLight = getPointLight(lightIndex);
        vec4 lightDirection = normalize(pointLight.position - fragmentValues.rayPosition);
        vec4 reflectDir = reflect(-lightDirection, fragmentValues.normal);

        float diffuse = max(dot(fragmentValues.normal, lightDirection), 0.0);

        float specularAngle = max(dot(reflectDir, fragmentValues.normal), 0.0);
        float specular = pow(specularAngle, pointLight.shininess);

        illumination += DIFFUSE_ILLUMINATION * diffuse;
        illumination += SPECULAR_ILLUMINATION * specular;
    }
    return illumination;
}

void main(void)
{
    // Compute the color
    /*vec4 fragmentPosition = u_viewProjection * vec4(v_uv, 0.0, 1.0);
    fragmentPosition.w = 1.0;
    vec4 fragmentRayDirection = u_viewProjection * vec4(0.0, 0.0, 1.0, 1.0);
    fragColor = fragmentRayDirection == vec4(0.0, 0.0, 1.0, 1.0) ? backgroundColor : metaballColor;
    fragColor = fragmentPosition;
    /*if (distance(fragmentPosition, vec4(0.0, 0.0, 0.0, 1.0)) > distance(vec4(v_uv, 0.0, 1.0), vec4(0.0, 0.0, 0.0, 1.0)))
    {
        fragColor = metaballColor;
    }*/
    //fragColor = vec4(v_uv, 0.0, 1.0);*/
    vec4 fragmentPosition = vec4(v_uv, 0.0, 1.0);
    vec4 fragmentRayDirection = vec4(0.0, 0.0, 1.0, 1.0);
    FragmentValues fragmentValues = rayMarch(fragmentPosition, fragmentRayDirection);
    fragmentValues.normal = normalize(fragmentValues.normal);

    float illumination = 1.0;
    if (fragmentValues.energy > THRESHOLD) {
        illumination = calculateIllumination(fragmentValues);
    }
    vec4 envMap = texture(u_cubemap, vec3(normalize(abs(v_uv)), 1.0));
    fragColor = fragmentValues.energy > THRESHOLD ? mix(envMap, vec4(metaballColor * illumination, 1.0), METABALL_TRANSPARENCY) : envMap;
}

// NOTE for compilation errors look at the line number and subtract 7
