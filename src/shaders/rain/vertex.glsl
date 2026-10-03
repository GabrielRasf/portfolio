uniform float uTime;
uniform float uGlyphScale;
uniform float uSpread;
uniform float uColumnCount;
uniform float uLift;
uniform float uRainSpeed;

attribute float aColumn;
attribute float aSlot;
attribute float aSeed;
attribute float aLength;
attribute float aGlyph;
attribute float aDepth;

varying vec2 vUv;
varying float vAlpha;
varying float vGlyph;
varying float vGlow;

void main()
{
    vUv = uv;
    vGlyph = aGlyph;
    vGlow = 0.0;
    vAlpha = 0.0;

    float depthT = clamp(aDepth, 0.0, 1.0);
    float speed = mix(0.05, 0.16, fract(aSeed * 3.17)) * uRainSpeed;
    float span = max(aLength, 1.0) * 0.1;
    float y = mod(aSlot * 0.1 - uTime * speed + fract(aSeed * 8.13) * span, span) - span * 0.5 + uLift;
    float x = ((aColumn + 0.5) / max(uColumnCount, 1.0) - 0.5) * uSpread;
    float z = mix(-2.55, -1.75, depthT);
    float scale = uGlyphScale * mix(0.72, 1.05, depthT);
    float variation = 0.55 + 0.3 * fract(aSeed * 17.2 + aSlot * 0.37);
    if (aSlot < aLength) vAlpha = variation * mix(0.4, 0.75, depthT);

    vec3 right = vec3(viewMatrix[0][0], viewMatrix[0][1], viewMatrix[0][2]);
    vec3 up = vec3(viewMatrix[1][0], viewMatrix[1][1], viewMatrix[1][2]);
    vec3 worldPosition = vec3(x, y, z) + (right * position.x + up * position.y) * scale;

    vec4 viewPosition = viewMatrix * vec4(worldPosition, 1.0);
    gl_Position = projectionMatrix * viewPosition;
}
