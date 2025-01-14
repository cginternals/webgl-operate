precision lowp float;

@import ../../source/shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

# define TIME_SCALE_FACTOR 0.1

uniform sampler2D u_metaballsTexture;
uniform int u_metaballsTextureSize;
uniform float u_deltaTime;


// wie viele voxel pro dimension
# define FORCE_VECTOR_FIELD_DIMENSION_SIZE 3
// breite une hoehe des cubes in Einheit
# define FORCE_VECTOR_FIELD_EXTENSION 2.0

vec3 forceVectorField[FORCE_VECTOR_FIELD_DIMENSION_SIZE * FORCE_VECTOR_FIELD_DIMENSION_SIZE * FORCE_VECTOR_FIELD_DIMENSION_SIZE] = vec3[FORCE_VECTOR_FIELD_DIMENSION_SIZE * FORCE_VECTOR_FIELD_DIMENSION_SIZE * FORCE_VECTOR_FIELD_DIMENSION_SIZE](
    // negative plane: y = -1
    // x = variable, y = -1, z = -1
    vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0),
    // x = variable, y = -1, z = 0
    vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, -1.0), vec3(0.0, 0.0, 1.0),
    // x = variable, y = -1, z = 1
    vec3(1.0, 0.0, 0.0), vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0),

    // neutral plane: y = 0
    // x = variable, y = 0, z = -1
    vec3(0.0, -1.0, 0.0), vec3(-1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0),
    // x = variable, y = 0, z = 0
    vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0), vec3(-1.0, 0.0, 0.0),
    // x = variable, y = 0, z = 1
    vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), vec3(-1.0, 0.0, 0.0),

    // positive plane: y = 1
    // x = variable, y = 1, z = -1
    vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0),
    // x = variable, y = 1, z = 0
    vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0 ,1.0),
    // x = variable, y = 1, z = -1
    vec3(0.0, -1.0, 0.0), vec3(0.0, -1.0, 0.0), vec3(0.0, -1.0, 0.0));

const vec3 forceVectorFieldOffset = vec3(FORCE_VECTOR_FIELD_EXTENSION, FORCE_VECTOR_FIELD_EXTENSION, FORCE_VECTOR_FIELD_EXTENSION) / 2.0;
const float forceVectorVoxelSize = FORCE_VECTOR_FIELD_EXTENSION / float(FORCE_VECTOR_FIELD_DIMENSION_SIZE);

vec3 fetchForceVector(ivec3 voxel) {
    // if the voxel is not inside the force field return 0 as force vector.
    if (any(lessThan(voxel, ivec3(0))) || any(greaterThanEqual(voxel, ivec3(FORCE_VECTOR_FIELD_DIMENSION_SIZE)))) {
        return vec3(0.0);
    }
    int index = voxel.x + voxel.z * FORCE_VECTOR_FIELD_DIMENSION_SIZE + voxel.y * FORCE_VECTOR_FIELD_DIMENSION_SIZE * FORCE_VECTOR_FIELD_DIMENSION_SIZE;
    return forceVectorField[index];
}

vec3 getForceVector(vec3 metaballPosition) {

    vec3 positionInForceField = (metaballPosition + forceVectorFieldOffset) * forceVectorVoxelSize;
    ivec3 positionInForceFieldFloor = clamp(ivec3(floor(positionInForceField)), 0, FORCE_VECTOR_FIELD_DIMENSION_SIZE - 1);
    ivec3 positionInForceFieldCeil = clamp(ivec3(ceil(positionInForceField)), 0, FORCE_VECTOR_FIELD_DIMENSION_SIZE -1);

    ivec3 conceringVoxels[8] = ivec3[8](
        ivec3(positionInForceFieldFloor.x, positionInForceFieldFloor.y, positionInForceFieldFloor.z),
        ivec3(positionInForceFieldFloor.x, positionInForceFieldFloor.y, positionInForceFieldCeil.z),
        ivec3(positionInForceFieldFloor.x, positionInForceFieldCeil.y, positionInForceFieldFloor.z),
        ivec3(positionInForceFieldFloor.x, positionInForceFieldCeil.y, positionInForceFieldCeil.z),
        ivec3(positionInForceFieldCeil.x, positionInForceFieldFloor.y, positionInForceFieldFloor.z),
        ivec3(positionInForceFieldCeil.x, positionInForceFieldFloor.y, positionInForceFieldCeil.z),
        ivec3(positionInForceFieldCeil.x, positionInForceFieldCeil.y, positionInForceFieldFloor.z),
        ivec3(positionInForceFieldCeil.x, positionInForceFieldCeil.y, positionInForceFieldCeil.z)
    );

    vec3 conceringForceVectors[8] = vec3[8](
        fetchForceVector(conceringVoxels[0]),
        fetchForceVector(conceringVoxels[1]),
        fetchForceVector(conceringVoxels[2]),
        fetchForceVector(conceringVoxels[3]),
        fetchForceVector(conceringVoxels[4]),
        fetchForceVector(conceringVoxels[5]),
        fetchForceVector(conceringVoxels[6]),
        fetchForceVector(conceringVoxels[7])
    );

    vec3 forceVector = vec3(0.0);
    for (int i = 0; i < 8; i++)
    {
        vec3 currentVector = conceringForceVectors[i];
        if (currentVector != vec3(0.0))
        {
            forceVector += currentVector * distance(positionInForceField, vec3(conceringVoxels[i]));
        }
    }

    // individual force vector
    int individualId = int(gl_FragCoord.x);
    float x = float(individualId % 3 - 1) * 2.0;
    float y = float(individualId % 5 - 2);
    float z = float(individualId % 3 - 1) * 2.0;
    vec3 individualVector = normalize(vec3(x, y, z));
    return normalize(mix(forceVector, individualVector, 0.5));
}

vec3 calculateNewPositionAndVelocity(inout vec4 positionAndMass, inout vec3 velocity) {
    vec3 acceleration = getForceVector(positionAndMass.xyz) / positionAndMass.w;
    velocity = velocity + acceleration * u_deltaTime * TIME_SCALE_FACTOR;
    positionAndMass.xyz = positionAndMass.xyz + velocity * u_deltaTime * TIME_SCALE_FACTOR;
    positionAndMass.xyz = clamp(positionAndMass.xyz, vec3(-FORCE_VECTOR_FIELD_EXTENSION / 2.0), vec3(FORCE_VECTOR_FIELD_EXTENSION / 2.0));
    return velocity;
}

vec4 getCurrentVelocity(vec2 texCoords) {
    texCoords += vec2(1.0 / float(u_metaballsTextureSize), 0.0);
    return texture(u_metaballsTexture, texCoords);
}

vec4 getCurrentPosition(vec2 texCoords) {
    return texture(u_metaballsTexture, texCoords);
}

void main(void)
{
    ivec2 texCoords = ivec2(gl_FragCoord.xy);
    bool isVelocityFragment = bool(mod(gl_FragCoord.x - 0.5, 2.0));
    texCoords = isVelocityFragment ? texCoords - ivec2(1,0) : texCoords;

    vec3 velocity = texelFetch(u_metaballsTexture, texCoords + ivec2(1, 0), 0).xyz;
    vec4 positionAndMass = texelFetch(u_metaballsTexture, texCoords, 0);
    vec3 acc = calculateNewPositionAndVelocity(positionAndMass, velocity);
    fragColor = isVelocityFragment ? vec4(velocity, 1.0) : positionAndMass;
}

// NOTE for compilation errors look at the line number and subtract 7
