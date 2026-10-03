uniform float uTime;
uniform float uBigWavesElevation;
uniform vec2 uBigWavesFrequency;
uniform float uBigWavesSpeed;
uniform float uSmallWavesElevation;
uniform float uSmallWavesFrequency;
uniform float uSmallWavesSpeed;
uniform float uSmallIterations;
uniform mat4 uMeshMatrix;
uniform float uGlyphScale;
uniform float uRainSpeed;

attribute float aColumn;
attribute float aSlot;
attribute float aSeed;
attribute float aLength;
attribute float aGlyph;

varying vec2 vUv;
varying float vAlpha;
varying float vGlyph;
varying float vGlow;

#include ../includes/waveElevation.glsl

void main()
{
    vUv = uv;
    vGlyph = aGlyph;
    vGlow = 0.65;
    vAlpha = 0.0;

    vec2 home = vec2(
        (fract(aColumn * 0.37 + 0.18) * 2.0 - 1.0) * 1.3,
        (fract(aColumn * 0.73 + 0.41) * 2.0 - 1.0) * 0.9
    );
    vec2 drift = vec2(cos(aColumn * 1.7), sin(aColumn * 2.3));
    home += drift * uTime * mix(0.012, 0.028, fract(aColumn * 0.29)) * uRainSpeed;
    home.x = mod(home.x + 2.0, 4.0) - 2.0;
    home.y = mod(home.y + 1.5, 3.0) - 1.5;

    vec2 rest = vec2(fract(aSeed * 1.7) - 0.5, fract(aSeed * 2.9) - 0.5);
    rest *= mix(0.1, 0.26, fract(aSeed * 3.4));
    vec2 local = home + rest;

    float mode = mod(floor(aSeed * 5.0), 3.0);
    float sampleTime = uTime + aSeed * 5.5;
    vec3 probe = (uMeshMatrix * vec4(local.x, local.y, 0.0, 1.0)).xyz;
    float probed = waveElevation(probe.xz, sampleTime);
    float probedX = waveElevation(probe.xz + vec2(0.1, 0.0), sampleTime);
    float probedZ = waveElevation(probe.xz + vec2(0.0, 0.1), sampleTime);
    vec2 slope = vec2(probedX - probed, probedZ - probed) / 0.1;
    vec2 stimulus = mode < 0.5 ? -slope : (mode < 1.5 ? vec2(-slope.y, slope.x) : slope);
    local += stimulus * mix(0.28, 0.85, fract(aSeed * 8.1));
    local.x = clamp(local.x, -1.92, 1.92);
    local.y = clamp(local.y, -1.42, 1.42);

    vec3 center = (uMeshMatrix * vec4(local.x, local.y, 0.0, 1.0)).xyz;
    float elevation = waveElevation(center.xz, uTime);
    float elevationX = waveElevation(center.xz + vec2(0.08, 0.0), uTime);
    center.y += elevation;

    vec3 up = normalize(mat3(uMeshMatrix) * vec3(0.0, 0.0, 1.0));
    center += up * 0.02;
    float shear = (elevationX - elevation) * 4.0;

    vec2 corner = position.xy;
    corner.x += corner.y * shear;
    float scale = uGlyphScale * mix(1.55, 2.05, fract(aSeed * 4.7));

    vec3 right = vec3(viewMatrix[0][0], viewMatrix[0][1], viewMatrix[0][2]);
    vec3 camUp = vec3(viewMatrix[1][0], viewMatrix[1][1], viewMatrix[1][2]);
    vec3 worldPosition = center + (right * corner.x + camUp * corner.y) * scale;

    float edge = smoothstep(1.95, 1.55, abs(local.x)) * smoothstep(1.45, 1.1, abs(local.y));
    float streak = mix(0.72, 1.0, 1.0 - aSlot / max(aLength, 1.0));
    if (aSlot < aLength) vAlpha = streak * edge;

    vec4 viewPosition = viewMatrix * vec4(worldPosition, 1.0);
    viewPosition.z += 0.02;
    gl_Position = projectionMatrix * viewPosition;
}
