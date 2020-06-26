precision lowp float;

@import ../../source/shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

uniform sampler2D u_metaballsTexture;
uniform int u_metaballsTextureSize;

varying vec2 v_uv;
varying vec4 v_ray;

const int forceVectorFieldDimension = 3;
const float forceVectorFieldExtension = 2.0;

// TODO change to uniform and give to shader from typescript
const float deltaTime = 0.1;

vec3 forceVectorField[forceVectorFieldDimension * forceVectorFieldDimension * forceVectorFieldDimension] = vec3[forceVectorFieldDimension * forceVectorFieldDimension * forceVectorFieldDimension](
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

const vec3 forceVectorFieldOffset = vec3(forceVectorFieldExtension, forceVectorFieldExtension, forceVectorFieldExtension) / 2.0;
const float forceVectorVoxelSize = forceVectorFieldExtension / float(forceVectorFieldDimension);

vec3 fetchForceVector(ivec3 voxel) {
    // if the voxel is not inside the force field return 0 as force vector.
    if (any(lessThan(ivec3(0), voxel)) || any(greaterThanEqual(ivec3(forceVectorFieldDimension), voxel))) {
        return vec3(0.0);
    }
    int index = voxel.x + voxel.z * forceVectorFieldDimension + voxel.y * forceVectorFieldDimension * forceVectorFieldDimension;
    return forceVectorField[index];
}

vec3 getForceVector(vec3 metaballPosition) {

    vec3 positionInForceField = (metaballPosition + forceVectorFieldOffset) * forceVectorVoxelSize;
    ivec3 positionInForceFieldFloor = ivec3(floor(positionInForceField));
    ivec3 positionInForceFieldCeil = ivec3(ceil(positionInForceField));

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

    float sumOfDistances = 0.0;
    vec3 forceVector = vec3(0.0);
    for (int i = 0; i < 8; i++)
    {
        vec3 currentVector = conceringForceVectors[i];
        if (currentVector != vec3(0.0))
        {
            float currentDistance = distance(positionInForceField, vec3(conceringVoxels[i]));
            sumOfDistances += currentDistance;
            forceVector += currentVector * currentDistance;
        }
    }
    return forceVector / sumOfDistances;
}

void calculateNewPositionAndVelocity(inout vec4 positionAndMass, inout vec3 velocity) {
    vec3 acceleration = getForceVector(positionAndMass.xyz) / positionAndMass.w;
    velocity = velocity + acceleration * deltaTime;
    positionAndMass.xyz = positionAndMass.xyz + velocity * deltaTime;
    positionAndMass.xyz = clamp(positionAndMass.xyz, vec3(-forceVectorFieldExtension / 2.0), vec3(forceVectorFieldExtension / 2.0));
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
    //float metaballsIndex = gl_FragCoord.x - 0.5;
    vec2 texCoords = (gl_PointCoord + 1.0) / 2.0;
    bool isVelocityFragment = bool(mod(gl_FragCoord.x - 0.5, 2.0));
    texCoords = isVelocityFragment ? texCoords - vec2(1.0 / 14.0, 0.0) : texCoords;

    /*vec3 velocity = getCurrentVelocity(texCoords).xyz;
    vec4 positionAndMass = getCurrentPosition(texCoords);
    calculateNewPositionAndVelocity(positionAndMass, velocity);
    fragColor = isVelocityFragment ? positionAndMass : vec4(velocity, 0.0);*/

    //fragColor = vec4(texCoords, vec2(0.0));
    fragColor = isVelocityFragment ? getCurrentVelocity(texCoords) : getCurrentPosition(texCoords);
}

// NOTE for compilation errors look at the line number and subtract 7
