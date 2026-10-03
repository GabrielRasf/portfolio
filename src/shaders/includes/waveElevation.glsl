#include ../includes/perlinClassic3D.glsl

float waveElevation(vec2 xz, float time)
{
    float elevation = sin(xz.x * uBigWavesFrequency.x + time * uBigWavesSpeed)
        * sin(xz.y * uBigWavesFrequency.y + time * uBigWavesSpeed)
        * uBigWavesElevation;

    for(float i = 1.0; i <= uSmallIterations; i++)
    {
        elevation -= abs(
            perlinClassic3D(vec3(xz * uSmallWavesFrequency * i, time * uSmallWavesSpeed))
            * uSmallWavesElevation / i
        );
    }

    return elevation;
}
