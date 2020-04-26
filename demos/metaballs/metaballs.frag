
precision lowp float;

@import ../../source/shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


uniform sampler2D u_metaballsTexture;
uniform sampler2D u_metaballColorsTexture;
uniform int u_metaballsTextureSize;
uniform vec3 u_lookAt;

uniform sampler2D u_lightsTexture;
uniform int u_lightsTextureSize;

uniform samplerCube u_cubemap;

varying vec2 v_uv;
varying vec4 v_ray;


# define BASE_ENERGY 0.06
# define THRESHOLD 0.5
# define STEP_THRESHOLD 0.001
# define METABALL_TRANSPARENCY 0.8

// NOTE: the phong shading coeffcients are currently assumed to be the same for all metaballs.
# define AMBIENT_ILLUMINATION 0.3
# define DIFFUSE_ILLUMINATION 0.7
# define SPECULAR_ILLUMINATION 0.7
# define REFRACTION_INDEX 1.0
# define REFLECTION_INTENSITY 0.25
# define REFRACTION_INTENSITY 0.25

struct MetaBall {
    vec4 position;
    vec3 color;
    float energy;
};

struct FragmentValues {
    float energy;
    vec4 normal;
    vec3 color;
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
    vec2 texCoords = calculateAbsoluteTextureCoords(index, 0, u_metaballsTextureSize, 1);
    vec4 positionAndEnergy = texture(u_metaballsTexture, texCoords);
    MetaBall metaball;
    metaball.position = vec4(positionAndEnergy.xyz, 1.0);
    metaball.energy = BASE_ENERGY * positionAndEnergy.w;
    metaball.color = texture(u_metaballColorsTexture, texCoords).xyz;
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

FragmentValues calculateEnergyAndOtherFragmentValues(vec4 currentRayPosition) {
    FragmentValues currentFragmentValues;
    currentFragmentValues.normal = vec4(0.0);
    currentFragmentValues.energy = 0.0;
    for (int metaballIndex = 0; metaballIndex < u_metaballsTextureSize; metaballIndex++) {

        MetaBall currentMetaball = getMetaball(metaballIndex);
        float currentEnergy = distFunc(currentMetaball, currentRayPosition);
        currentFragmentValues.energy += currentEnergy;
        vec4 currentNormal = normalize(currentRayPosition - currentMetaball.position);
        currentFragmentValues.normal += currentNormal * currentEnergy;
        currentFragmentValues.color += currentMetaball.color * currentEnergy;
    }
    currentFragmentValues.rayPosition = currentRayPosition;
    return currentFragmentValues;
}

float fresnelReflection(vec3 rayDirection, vec3 normal)
{
    float cosi = clamp(dot(rayDirection, normal), -1.0, 1.0);
    float etai = cosi > 0.0 ? REFRACTION_INDEX : 1.0;
    float etat = cosi > 0.0 ? 1.0 : REFRACTION_INDEX;
    float sint = etai / etat * sqrt(max(0.0, 1.0 - cosi * cosi));
    return cosi + 0.7;
    if (sint >= 1.0) {
        return 1.0;
    }
    else
    {
        float cost = sqrt(max(0.0, 1.0 - sint * sint));
        cosi = abs(cosi);
        float Rs = ((etat * cosi) - (etai * cost)) / ((etat * cosi) + (etai * cost));
        float Rp = ((etai * cosi) - (etat * cost)) / ((etai * cosi) + (etat * cost));
        return (Rs * Rs + Rp * Rp) / 2.0;
    }
}

float fresnelSchlick(vec3 rayDir, vec3 normal, float bias) {
    float cosTheta = dot(rayDir, normal);
    return bias + (1.0 - bias) * pow(1.0 - cosTheta, 5.0);
}

float calculateEnergy(vec4 currentRayPosition) {
    float energy = 0.0;
    for (int metaballIndex = 0; metaballIndex < u_metaballsTextureSize; metaballIndex++) {
        MetaBall currentMetaball = getMetaball(metaballIndex);
        energy += distFunc(currentMetaball, currentRayPosition);
    }
    return energy;
}

float calculateEnergyOverDerivative(vec4 rayPosition, vec4 rayDirection, float marchDistance) {
    const float derivativeDistance = 0.1;
    float energy = 0.0;
    float nearerEnergy = 0.0;
    vec4 currentRayPosition = rayPosition + rayDirection * marchDistance;
    vec4 currentNearerRayPosition = rayPosition + rayDirection * (marchDistance - derivativeDistance);
    for (int metaballIndex = 0; metaballIndex < u_metaballsTextureSize; metaballIndex++) {
        MetaBall currentMetaball = getMetaball(metaballIndex);
        energy += distFunc(currentMetaball, currentRayPosition);
        nearerEnergy += distFunc(currentMetaball, currentNearerRayPosition);
    }
    float derivativeValue = (energy - nearerEnergy) / (derivativeDistance);
    derivativeValue = derivativeValue != 0.0 ? derivativeValue : 0.0000000001;
    return (energy - THRESHOLD) / derivativeValue;
}

FragmentValues newtonMethod(vec4 rayPosition, vec4 rayDirection, float marchDistance, int numberOfNewtonIterations)
{
    for (int i = 0; i < numberOfNewtonIterations; i++)
    {
        float energyOverDerivative = calculateEnergyOverDerivative(rayPosition, rayDirection, marchDistance);
        marchDistance = marchDistance - energyOverDerivative;
    }
    vec4 finalRayPositionAndEnergy = rayPosition + rayDirection * marchDistance;
    FragmentValues finalFragmentValues = calculateEnergyAndOtherFragmentValues(finalRayPositionAndEnergy);
    finalFragmentValues.energy = finalFragmentValues.energy > THRESHOLD ? finalFragmentValues.energy : 0.51;
    return finalFragmentValues;
}

FragmentValues rayMarchWithFragmentValues(vec4 rayPosition, vec4 rayDirection, float stepWidth, float initialMarchDistance, int numberOfNewtonIterations) {
    FragmentValues fragmentValues;
    for (float marchDistance = initialMarchDistance; marchDistance < 1.0; marchDistance += stepWidth) {
        vec4 currentRayPosition = rayPosition + rayDirection * marchDistance;
        float energy = calculateEnergy(currentRayPosition);
        if (energy > THRESHOLD) {
            return newtonMethod(rayPosition, rayDirection, marchDistance, numberOfNewtonIterations);
        }
    }
    return fragmentValues;
}

FragmentValues inverseRayMarchWithFragmentValues(vec4 rayPosition, vec4 rayDirection, float stepWidth, float initialMarchDistance, int numberOfNewtonIterations) {
    FragmentValues fragmentValues;
    for (float marchDistance = initialMarchDistance; marchDistance < 1.0; marchDistance += stepWidth) {
        vec4 currentRayPosition = rayPosition + rayDirection * marchDistance;
        float energy = calculateEnergy(currentRayPosition);
        if (energy < THRESHOLD) {
            return newtonMethod(rayPosition, rayDirection, marchDistance, numberOfNewtonIterations);
        }
    }
    return fragmentValues;
}

bool rayMarchHitMetaball(vec4 rayPosition, vec4 rayDirection, float stepWidth, float initialMarchDistance) {
    FragmentValues fragmentValues;
    for (float marchDistance = initialMarchDistance; marchDistance < 1.0; marchDistance += stepWidth) {
        vec4 currentRayPosition = rayPosition + rayDirection * marchDistance;
        float energy = calculateEnergy(currentRayPosition);
        if (energy > THRESHOLD) {
            return true;
        }
    }
    return false;
}

float calculateIllumination(FragmentValues fragmentValues) {
    // Phong shading
    float illumination = AMBIENT_ILLUMINATION;
    for (int lightIndex = 0; lightIndex < u_lightsTextureSize; lightIndex++) {
        PointLight pointLight = getPointLight(lightIndex);
        vec4 lightDirection = pointLight.position - fragmentValues.rayPosition;
        bool hitMetaballBetweenLight = rayMarchHitMetaball(fragmentValues.rayPosition, lightDirection, 0.1, 0.011);
        if (!hitMetaballBetweenLight) {
            vec4 lightDirectionNormalized = normalize(lightDirection);
            vec4 reflectDir = reflect(-lightDirectionNormalized, fragmentValues.normal);

            float diffuse = max(dot(fragmentValues.normal, lightDirectionNormalized), 0.0);

            float specularAngle = max(dot(reflectDir, fragmentValues.normal), 0.0);
            float specular = pow(specularAngle, pointLight.shininess);

            illumination += DIFFUSE_ILLUMINATION * diffuse;
            illumination += SPECULAR_ILLUMINATION * specular;
        }
    }
    return illumination;
}

FragmentValues fullRayMarchWithLightCalculation(vec4 rayPosition, vec4 rayDirection)
{
    FragmentValues fragmentValues = rayMarchWithFragmentValues(rayPosition, rayDirection, 0.1, 0.01, 5);
    fragmentValues.normal = normalize(fragmentValues.normal);

    float illumination = 1.0;
    if (fragmentValues.energy > THRESHOLD) {
        illumination = calculateIllumination(fragmentValues);
    }
    vec4 texturePositon = rayPosition + rayDirection;
    vec4 envMap = texture(u_cubemap, texturePositon.xyz);
    fragmentValues.color = fragmentValues.energy > THRESHOLD ? mix(envMap.xyz, (fragmentValues.color * 2.0) * illumination, METABALL_TRANSPARENCY) : envMap.xyz;
    return fragmentValues;
}

void main(void)
{
    vec2 uv = v_uv;
    vec3 ray = v_ray.xyz;
    //ray.x += uv.x;
    //ray.y += uv.y;
    ray = normalize(ray);
    ray.x *= -1.0;
    // Compute the color
    FragmentValues fragmentValues = fullRayMarchWithLightCalculation(vec4(vec3(0.0), 1.0), vec4(ray, 0.0));
    //vec4 reflectionDir = reflect(normalize(fragmentRayDirection), fragmentValues.normal);
    //FragmentValues reflectionValues = fullRayMarchWithLightCalculation(fragmentValues.rayPosition, reflectionDir);
    //vec4 refractionDir = refract(normalize(fragmentRayDirection), fragmentValues.normal, REFRACTION_INDEX);
    //vec4 refractionDir = fragmentRayDirection;
    //FragmentValues refractionValues = fullRayMarchWithLightCalculation(fragmentValues.rayPosition, refractionDir);
    //vec4 finalColor = vec4(fragmentValues.color * (1.0 - REFLECTION_INTENSITY - REFRACTION_INTENSITY) +
                            //reflectionValues.color * REFLECTION_INTENSITY +
                            //refractionValues.color * REFRACTION_INTENSITY, 1.0);
    //PointLight temp = getPointLight(0);
    //fragColor = vec4(vec3(fresnelSchlick(normalize((fragmentValues.rayPosition - temp.position).xyz), normalize(fragmentValues.normal.xyz), 0.017)), 1.0);
    //fragColor = vec4(vec3(fresnelReflection(normalize((fragmentValues.rayPosition - temp.position).xyz), normalize(fragmentValues.normal.xyz))), 1.0);
    //fragColor = vec4(fragmentValues.normal.xyz, 1.0);
    //fragColor = vec4(u_lookAt, 1.0);


    //fragColor = vec4(texture(u_cubemap, ray).xyz, 1.0);
    fragColor = vec4(fragmentValues.color, 1.0);
    //fragColor = vec4(ray, 1.0);
}

// NOTE for compilation errors look at the line number and subtract 7
