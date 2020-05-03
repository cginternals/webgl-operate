
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

uniform sampler2D u_lightsTexture;
uniform int u_lightsTextureSize;

uniform samplerCube u_cubemap;

varying vec2 v_uv;
varying vec4 v_ray;


# define BASE_ENERGY 0.06
# define THRESHOLD 0.51
# define STEP_THRESHOLD 0.001
# define METABALL_TRANSPARENCY 0.8

// NOTE: the phong shading coeffcients are currently assumed to be the same for all metaballs.
# define AMBIENT_ILLUMINATION 0.3
# define DIFFUSE_ILLUMINATION 0.7
# define SPECULAR_ILLUMINATION 0.7
# define REFRACTION_INDEX 0.96
# define REFLECTION_INTENSITY 0.25
# define REFRACTION_INTENSITY 0.25
# define REFRACTION_AND_REFLECTION_INTENSITY 1.00

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

void calculateEnergyAndOtherFragmentValues(vec4 currentRayPosition, inout FragmentValues fragmentValues) {
    fragmentValues.normal = vec4(0.0);
    fragmentValues.energy = 0.0;
    for (int metaballIndex = 0; metaballIndex < u_metaballsTextureSize; metaballIndex++) {

        MetaBall currentMetaball = getMetaball(metaballIndex);
        float currentEnergy = distFunc(currentMetaball, currentRayPosition);
        fragmentValues.energy += currentEnergy;
        vec4 currentNormal = normalize(currentRayPosition - currentMetaball.position);
        fragmentValues.normal += currentNormal * currentEnergy;
        fragmentValues.color += currentMetaball.color * currentEnergy;
    }
    fragmentValues.rayPosition = currentRayPosition;
    fragmentValues.normal = normalize(fragmentValues.normal);
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

float calculateEnergyOverDerivative(vec4 rayPosition, vec4 rayDirection, float marchDistance, bool isInverseRayMarch) {
    float derivativeDistance = isInverseRayMarch ? -0.1 : 0.1;
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

void newtonMethod(vec4 rayPosition, vec4 rayDirection, float marchDistance, int numberOfNewtonIterations, bool isInverseNewton, inout FragmentValues fragmentValues)
{
    for (int i = 0; i < numberOfNewtonIterations; i++)
    {
        float energyOverDerivative = calculateEnergyOverDerivative(rayPosition, rayDirection, marchDistance, false);
        marchDistance = marchDistance - energyOverDerivative;
    }
    vec4 finalRayPositionAndEnergy = rayPosition + rayDirection * marchDistance;
    calculateEnergyAndOtherFragmentValues(finalRayPositionAndEnergy, fragmentValues);
    // Set the energy slightly higher since we might be sloghtly below the threshold because of the newton method.
    fragmentValues.energy = THRESHOLD + 0.01;
}

void rayMarchWithFragmentValues(vec4 rayPosition, vec4 rayDirection, float stepWidth, float initialMarchDistance, int numberOfNewtonIterations, bool isInverseMarch, inout FragmentValues fragmentValues) {
    for (float marchDistance = initialMarchDistance; marchDistance < 1.0; marchDistance += stepWidth) {
        vec4 currentRayPosition = rayPosition + rayDirection * marchDistance;
        float energy = calculateEnergy(currentRayPosition);
        if (energy > THRESHOLD && !isInverseMarch || energy < THRESHOLD && isInverseMarch) {
            newtonMethod(rayPosition, rayDirection, marchDistance, numberOfNewtonIterations, isInverseMarch, fragmentValues);
            return;
        }
    }
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

void fullRayMarchWithLightCalculation(vec4 rayPosition, vec4 rayDirection, bool isInverseMarch, inout FragmentValues outValues)
{
    float stepWidth = 0.1;
    float initialMarchDistance = isInverseMarch ? 0.001 : 0.2;
    int numberOfNewtonIterations = isInverseMarch ? 5 : 7;
    rayMarchWithFragmentValues(rayPosition, rayDirection, stepWidth, initialMarchDistance, numberOfNewtonIterations, isInverseMarch, outValues);

    float illumination = 1.0;
    if (outValues.energy > THRESHOLD) {
        illumination = calculateIllumination(outValues);
    }

    if (isInverseMarch) {
        rayDirection = refract(rayDirection, outValues.normal, 1.0 / REFRACTION_INDEX);
    }
    vec4 texturePositon = rayPosition + rayDirection;
    vec4 envMap = texture(u_cubemap, texturePositon.xyz);

    if (isInverseMarch) {
        outValues.color = outValues.energy > THRESHOLD ? mix(envMap.xyz, (outValues.color * 2.0) * illumination, METABALL_TRANSPARENCY) : envMap.xyz;
    } else {
        outValues.color = outValues.energy > THRESHOLD ? (outValues.color * 2.0) * illumination : envMap.xyz;
    }
}

void main(void)
{
    vec3 ray = v_ray.xyz;
    ray = normalize(ray);
    ray.x *= -1.0;
    // Compute the color
    FragmentValues fragmentValues;
    fullRayMarchWithLightCalculation(vec4(vec3(0.0), 1.0), vec4(ray, 0.0), false, fragmentValues);
    vec3 reflectionDir = reflect(ray, fragmentValues.normal.xyz);
    vec3 refractionAndReflectionColor;
    FragmentValues refractionValues;
    FragmentValues reflectionValues;
    if (fragmentValues.energy > THRESHOLD) {
        fullRayMarchWithLightCalculation(fragmentValues.rayPosition, vec4(reflectionDir, 0.0), false, reflectionValues);

        vec3 refractionDir = refract(ray, fragmentValues.normal.xyz, REFRACTION_INDEX);
        if (refractionDir != vec3(0.0)) {
            fullRayMarchWithLightCalculation(fragmentValues.rayPosition, vec4(refractionDir, 0.0), true, refractionValues);
            float reflectionPercentage = fresnelReflection(ray, fragmentValues.normal.xyz);
            refractionAndReflectionColor = mix(refractionValues.color, reflectionValues.color, reflectionPercentage);
        }
        else
        {
            refractionAndReflectionColor = reflectionValues.color;
        }
    }
    else {
        refractionAndReflectionColor = fragmentValues.color;
    }
    vec4 finalColor = vec4(mix(fragmentValues.color, refractionAndReflectionColor, REFRACTION_AND_REFLECTION_INTENSITY), 1.0);
    //fragColor = vec4(refractionValues.color, 1.0);
    //fragColor = vec4(vec3(fresnelReflection(ray, normalize(fragmentValues.normal.xyz))), 1.0);
    //fragColor = vec4(reflectionAndRefractionColor, 1.0);
    fragColor = finalColor;
}

// NOTE for compilation errors look at the line number and subtract 7
