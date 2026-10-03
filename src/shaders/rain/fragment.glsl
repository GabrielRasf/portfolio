uniform sampler2D uAtlas;
uniform vec3 uRainColor;
uniform float uRainOpacity;

varying vec2 vUv;
varying float vAlpha;
varying float vGlyph;
varying float vGlow;

void main()
{
    if (vAlpha < 0.04) discard;

    vec2 atlasUv = vec2(vUv.x * 0.5 + vGlyph * 0.5, vUv.y);
    float mask = texture2D(uAtlas, atlasUv).a;
    if (mask < 0.35) discard;

    vec3 color = uRainColor * mix(0.9, 1.45, vGlow);
    float alpha = mask * vAlpha * uRainOpacity * mix(0.78, 1.0, vGlow);
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
