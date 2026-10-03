uniform float uTime;
uniform float uBigWavesElevation;
uniform vec2 uBigWavesFrequency;
uniform float uBigWavesSpeed;
uniform float uSmallWavesElevation;
uniform float uSmallWavesFrequency;
uniform float uSmallWavesSpeed;
uniform float uSmallIterations;

varying float vElevation;
varying vec3 vNormal;
varying vec3 vPosition;

#include ../includes/waveElevation.glsl

void main()
{
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    float elevation = waveElevation(modelPosition.xz, uTime);

    vec3 modelPositionA = modelPosition.xyz + vec3(0.01, 0.0, 0.0);
    vec3 modelPositionB = modelPosition.xyz + vec3(0.0, 0.0, 0.01);

    modelPosition.y += elevation;
    modelPositionA.y += waveElevation(modelPositionA.xz, uTime);
    modelPositionB.y += waveElevation(modelPositionB.xz, uTime);

    vec3 toA = normalize(modelPositionA - modelPosition.xyz);
    vec3 toB = normalize(modelPositionB - modelPosition.xyz);
    vec3 computedNormal = cross(toA, toB);

    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;

    vElevation = elevation;
    vNormal = computedNormal;
    vPosition = modelPosition.xyz;
}
