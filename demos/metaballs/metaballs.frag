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
uniform int u_metaballsColorTextureSize;

uniform sampler2D u_lightsTexture;
uniform mat4 u_inverseViewProjection;
uniform int u_lightsTextureSize;

uniform samplerCube u_cubemap;

varying vec2 v_uv;
varying vec4 v_ray;
varying vec4 v_origin;


# define BASE_ENERGY 0.06
# define THRESHOLD 0.50
# define METABALL_TRANSPARENCY 0.8
# define RAYMARCH_DISTANCE_FACTOR 6.0
# define METABALL_BUFFER_SIZE 16

// NOTE: the phong shading coeffcients are currently assumed to be the same for all metaballs.
# define AMBIENT_ILLUMINATION 0.5
# define DIFFUSE_ILLUMINATION 0.7
# define SPECULAR_ILLUMINATION 0.7
# define REFRACTION_INDEX 0.96
# define REFRACTION_AND_REFLECTION_INTENSITY 0.80

vec4 metaballArray[METABALL_BUFFER_SIZE];
vec3 metaballColorArray[METABALL_BUFFER_SIZE];

struct FragmentValues {
    float energy;
    vec4 normal;
    vec3 color;
    vec4 rayPosition;
    float marchDistance;
};

vec2 calculateAbsoluteTextureCoords(int width, int height, int maxWidth, int maxHeight) {
    return vec2(
        (2.0 * float(width) + 1.0) / (2.0 * float(maxWidth)),
        (2.0 * float(height) + 1.0) / (2.0 * float(maxHeight))
    );
}

float distFunc(vec4 metaball, vec4 rayPosition) {
    return metaball.w / distance(metaball.xyz, rayPosition.xyz);
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

vec4 getMetaballPositionAnEnergy(int index){
    //return metaballArray[index];
    vec4 metaball = texelFetch(u_metaballsTexture, ivec2(index * 2, 0), 0);
    metaball.w *= BASE_ENERGY;
    return metaball;
}

vec3 getMetaballColor(int index){
    //return metaballColorArray[index];
    return texelFetch(u_metaballColorsTexture, ivec2(index, 0), 0).xyz;
}

float calculateEnergy(vec4 currentRayPosition) {
    float energy = 0.0;
    for (int metaballIndex = 0; metaballIndex < u_metaballsTextureSize; metaballIndex++) {
        vec4 currentMetaball = getMetaballPositionAnEnergy(metaballIndex);
        energy += distFunc(currentMetaball, currentRayPosition);
    }
    return energy;
}

void calculateEnergyAndOtherFragmentValues(vec4 currentRayPosition, inout FragmentValues fragmentValues) {
    fragmentValues.normal = vec4(0.0);
    fragmentValues.energy = 0.0;
    for (int metaballIndex = 0; metaballIndex < u_metaballsTextureSize; metaballIndex++) {

        vec4 currentMetaball = getMetaballPositionAnEnergy(metaballIndex);
        float currentEnergy = distFunc(currentMetaball, currentRayPosition);
        fragmentValues.energy += currentEnergy;
        vec4 currentNormal = normalize(currentRayPosition - vec4(currentMetaball.xyz, 1.0));
        fragmentValues.normal += currentNormal * (currentEnergy * 50.0);
        fragmentValues.color += getMetaballColor(metaballIndex) * currentEnergy;
    }
    fragmentValues.rayPosition = currentRayPosition;
    fragmentValues.normal = normalize(fragmentValues.normal);
}

float calculateEnergyOverDerivative(vec4 rayPosition, vec4 rayDirection, float marchDistance, bool isInverseRayMarch) {
    float derivativeDistance = isInverseRayMarch ? -0.1 : 0.1;
    float energy = 0.0;
    float nearerEnergy = 0.0;
    vec4 currentRayPosition = rayPosition + rayDirection * marchDistance;
    vec4 currentNearerRayPosition = rayPosition + rayDirection * (marchDistance - derivativeDistance);
    for (int metaballIndex = 0; metaballIndex < u_metaballsTextureSize; metaballIndex++) {
        vec4 currentMetaball = metaballArray[metaballIndex];
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
    // Set the energy slightly higher since we might be slightly below the threshold because of the newton method.
    fragmentValues.energy = THRESHOLD + 0.01;
}

void rayMarchWithFragmentValues(vec4 rayPosition, vec4 rayDirection, float stepWidth, float initialMarchDistance, int numberOfNewtonIterations, bool isInverseMarch, bool exitedMetaBall, inout FragmentValues fragmentValues) {
    for (float marchDistance = initialMarchDistance; marchDistance < RAYMARCH_DISTANCE_FACTOR; marchDistance += stepWidth) {
        vec4 currentRayPosition = rayPosition + rayDirection * marchDistance;
        float energy = calculateEnergy(currentRayPosition);
        if ((energy > THRESHOLD && !isInverseMarch || energy < THRESHOLD && isInverseMarch) && exitedMetaBall) {
            newtonMethod(rayPosition, rayDirection, marchDistance, numberOfNewtonIterations, isInverseMarch, fragmentValues);
            fragmentValues.marchDistance = marchDistance;
            return;
        }
        exitedMetaBall = exitedMetaBall || energy < THRESHOLD || marchDistance > 0.2;
    }
}

bool rayMarchHitMetaball(vec4 rayPosition, vec4 rayDirection, float stepWidth, float initialMarchDistance) {
    FragmentValues fragmentValues;
    for (float marchDistance = initialMarchDistance; marchDistance < RAYMARCH_DISTANCE_FACTOR; marchDistance += stepWidth) {
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
        vec4 pointLightPositionAndShininess = texelFetch(u_lightsTexture, ivec2(lightIndex, 0), 0);
        vec4 lightDirection = vec4(pointLightPositionAndShininess.xyz, 1.0) - fragmentValues.rayPosition;
        bool hitMetaballBetweenLight = rayMarchHitMetaball(fragmentValues.rayPosition, lightDirection, 0.1, 0.11);
        if (!hitMetaballBetweenLight) {
            vec4 lightDirectionNormalized = normalize(lightDirection);
            vec4 reflectDir = reflect(-lightDirectionNormalized, fragmentValues.normal);

            float diffuse = max(dot(fragmentValues.normal, lightDirectionNormalized), 0.0);

            float specularAngle = max(dot(reflectDir, fragmentValues.normal), 0.0);
            float specular = pow(specularAngle, pointLightPositionAndShininess.w);

            illumination += DIFFUSE_ILLUMINATION * diffuse;
            illumination += SPECULAR_ILLUMINATION * specular;
        }
    }
    return illumination;
}

float fullRayMarchWithLightCalculation(vec4 rayPosition, vec4 rayDirection, bool isInverseMarch, float initialMarchDistance, int numberOfNewtonIterations, bool exitedMetaBall, float stepWidth, inout FragmentValues outValues)
{
    rayMarchWithFragmentValues(rayPosition, rayDirection, stepWidth, initialMarchDistance, numberOfNewtonIterations, isInverseMarch, exitedMetaBall, outValues);

    float illumination = 1.0;
    if (outValues.energy > THRESHOLD) {
        illumination = calculateIllumination(outValues);
    }

    if (isInverseMarch) {
        rayDirection = refract(rayDirection, outValues.normal, 1.0 / REFRACTION_INDEX);
    }
    vec4 texturePositon = rayDirection;
    vec4 envMap = texture(u_cubemap, texturePositon.xyz);

    outValues.color = outValues.energy > THRESHOLD ? mix(envMap.xyz, (outValues.color * 2.0) * illumination, METABALL_TRANSPARENCY) : envMap.xyz;
    //outValues.color = envMap.xyz;
    return illumination;
}

void prepareMetaballsArray()
{
    if (u_metaballsColorTextureSize >= METABALL_BUFFER_SIZE)
    {
        discard;
    }
    for (int metaballIndex = 0; metaballIndex < u_metaballsTextureSize; metaballIndex++) {
        // Position and Energy
        // We need to double the index since the texture also includes the velocity per metaball => 2 texels per metaball
        vec4 metaball = texelFetch(u_metaballsTexture, ivec2(metaballIndex * 2, 0), 0);
        metaball.w *= BASE_ENERGY;
        metaballArray[metaballIndex] = metaball;
        // Color
        metaballColorArray[metaballIndex] = texelFetch(u_metaballColorsTexture, ivec2(metaballIndex, 0), 0).xyz;
    }
}

void main(void)
{
    // buffer the metaball texture data in a static array with max size and pass the acutual number of metaballs per uniform.
    // parameter optimieren und physics shader rein machen, keine IBL, random metaballs / colors.
    prepareMetaballsArray();
    vec3 ray = normalize(v_ray.xyz);
    //ray = normalize(ray) * 2.0;
    // Compute the color
    vec4 rayPosition = v_origin;
    float deleteme = 0.0;
    //vec4 rayPosition = vec4(-4.0 * ray, 1.0);
    FragmentValues fragmentValues;
    fullRayMarchWithLightCalculation(rayPosition, vec4(ray, 0.0), false, 2.0, 7, true, 0.05, fragmentValues);
    vec3 reflectionDir;
    vec3 refractionAndReflectionColor;
    FragmentValues refractionValues;
    FragmentValues reflectionValues;
    float reflectionPercentage;
    vec3 refractionDir;
    if (fragmentValues.energy > THRESHOLD) {
        reflectionDir = reflect(ray, fragmentValues.normal.xyz);
        fullRayMarchWithLightCalculation(fragmentValues.rayPosition, vec4(reflectionDir, 0.0), false, 0.05, 7, false, 0.1, reflectionValues);

        refractionDir = refract(ray, fragmentValues.normal.xyz, REFRACTION_INDEX);
        if (refractionDir != vec3(0.0)) {
            deleteme = fullRayMarchWithLightCalculation(fragmentValues.rayPosition, vec4(refractionDir, 0.0), true, 0.01, 5, true, 0.1, refractionValues);
            reflectionPercentage = fresnelReflection(ray, fragmentValues.normal.xyz);
            refractionAndReflectionColor = mix(refractionValues.color, reflectionValues.color, reflectionPercentage);
        }
        else {
            refractionAndReflectionColor = reflectionValues.color;
        }
    }
    else {
        refractionAndReflectionColor = fragmentValues.color;
    }
    vec4 finalColor = vec4(mix(fragmentValues.color, refractionAndReflectionColor, REFRACTION_AND_REFLECTION_INTENSITY), 1.0);
    fragColor = finalColor;
}

// NOTE for compilation errors look at the line number and subtract 7
