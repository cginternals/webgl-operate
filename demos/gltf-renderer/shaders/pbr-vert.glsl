// Originally taken from https://github.com/KhronosGroup/glTF-WebGL-PBR
// Commit c28b5b8f5a83380857ad8395ac5302594ecc13ae

@import ./facade.vert;

#if __VERSION__ == 100
  attribute vec4 a_position;
  attribute vec4 a_normal;
  attribute vec4 a_tangent;
  attribute vec2 a_texcoord_0;
  attribute vec2 a_texcoord_1;
  attribute vec4 a_color;
#else
    layout (location = 0) in vec4 a_position;
    layout (location = 1) in vec3 a_normal;
    layout (location = 2) in vec4 a_tangent;
    layout (location = 3) in vec2 a_texcoord_0;
    layout (location = 4) in vec2 a_texcoord_1;
    layout (location = 5) in vec4 a_color;
#endif

// TODO!!!: WebGL1 support (int/bit operators...)
// vertex shader + fragment shader
const int HAS_NORMALS           = 1;
const int HAS_TANGENTS          = 1 << 1;
const int HAS_UV                = 1 << 2;
const int HAS_COLORS            = 1 << 3;

uniform mediump int u_PbrFlags;
uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewProjection;
uniform mat3 u_NormalMatrix;

varying vec3 v_Position;
varying vec2 v_UV[2];
varying vec4 v_Color;

varying mat3 v_TBN;
varying vec3 v_Normal;

bool checkFlag(int flag) {
    return (u_PbrFlags & flag) == flag;
}

void main()
{
  vec4 pos = u_ModelMatrix * a_position;
  v_Position = vec3(pos.xyz) / pos.w;

  if (checkFlag(HAS_NORMALS)) {
  if (checkFlag(HAS_TANGENTS)) {
  vec3 normalW = normalize(vec3(u_NormalMatrix * a_normal));
  vec3 tangentW = normalize(vec3(u_ModelMatrix * vec4(a_tangent.xyz, 0.0)));
  vec3 bitangentW = cross(normalW, tangentW) * a_tangent.w;
  v_TBN = mat3(tangentW, bitangentW, normalW);
  } else { // HAS_TANGENTS != 1
  v_Normal = normalize(vec3(u_ModelMatrix * vec4(a_normal.xyz, 0.0)));
  }
  }

  if (checkFlag(HAS_UV)) {
    v_UV[0] = a_texcoord_0;
    v_UV[1] = a_texcoord_1;
  }
  else {
    v_UV[0] = vec2(0., 0.);
    v_UV[1] = vec2(0., 0.);
  }

  if (checkFlag(HAS_COLORS))
  v_Color = a_color;
  else
  v_Color = vec4(1.0);

  gl_Position = u_ViewProjection * u_ModelMatrix * a_position; // needs w for proper perspective correction
}


