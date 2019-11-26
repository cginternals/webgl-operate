
#if __VERSION__ == 100

    #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
    #endif

#endif

precision highp float;

@import ../../../source/shaders/facade.frag;


uniform vec2 u_cameraNearFar;
uniform mat4 u_view;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif

const int HAS_NORMALS           = 1;
const int HAS_TANGENTS          = 1 << 1;
const int HAS_UV                = 1 << 2;
const int HAS_COLORS            = 1 << 3;
const int USE_IBL               = 1 << 4;
const int HAS_BASECOLORMAP      = 1 << 5;
const int HAS_NORMALMAP         = 1 << 6;
const int HAS_EMISSIVEMAP       = 1 << 7;
const int HAS_METALROUGHNESSMAP = 1 << 8;
const int HAS_OCCLUSIONMAP      = 1 << 9;
const int USE_TEX_LOD           = 1 << 10;

uniform mediump int u_geometryFlags;

varying vec3 v_position;
varying mat3 v_TBN;
varying vec3 v_normal;
varying vec2 v_uv[3];

bool checkGeometryFlag(int flag) {
    return (u_geometryFlags & flag) == flag;
}

// Find the normal for this fragment, pulling either from a predefined normal map
// or from the interpolated mesh normal and tangent attributes.
vec3 getNormal()
{
    mat3 TBN;
    // Retrieve the tangent space matrix
    if (!checkGeometryFlag(HAS_TANGENTS)) {
        vec3 pos_dx = dFdx(v_position);
        vec3 pos_dy = dFdy(v_position);
        vec3 tex_dx = dFdx(vec3(v_uv[0], 0.0));
        vec3 tex_dy = dFdy(vec3(v_uv[0], 0.0));
        vec3 t = (tex_dy.t * pos_dx - tex_dx.t * pos_dy) / (tex_dx.s * tex_dy.t - tex_dy.s * tex_dx.t);

        vec3 ng;
        if (checkGeometryFlag(HAS_NORMALS))
            ng = normalize(v_normal);
        else
            ng = cross(pos_dx, pos_dy);

            t = normalize(t - ng * dot(ng, t));
            vec3 b = normalize(cross(ng, t));
            TBN = mat3(t, b, ng);
        }
    else { // HAS_TANGENTS
        TBN = v_TBN;
    }

    // The tbn matrix is linearly interpolated, so we need to re-normalize
    vec3 n = normalize(TBN[2].xyz);

    // reverse backface normals
    n *= (2.0 * float(gl_FrontFacing) - 1.0);

    return n;
}

void main(void)
{
    vec4 viewPosition = u_view * vec4(v_position, 1.0);
    viewPosition /= viewPosition.w;

    float depth = length(viewPosition.xyz);
    fragColor = vec4(getNormal(), depth);
}
