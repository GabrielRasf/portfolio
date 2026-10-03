import * as THREE from 'three'
import waterVertexShader from './shaders/water/vertex.glsl'
import waterFragmentShader from './shaders/water/fragment.glsl'
import rainVertexShader from './shaders/rain/vertex.glsl'
import flowVertexShader from './shaders/rain/flowVertex.glsl'
import rainFragmentShader from './shaders/rain/fragment.glsl'

const MOBILE_MAX_WIDTH = 1024
const MOBILE_MAX_DPR = 1.25
const DESKTOP_MAX_DPR = 1.5
const DEPTH_DARKEN = 0.1
const SURFACE_DARKEN = 0.2
const PLANE_TILT = -Math.PI * 0.35

function readViewport() {
    const viewport = window.visualViewport
    return {
        width: viewport?.width ?? window.innerWidth,
        height: viewport?.height ?? window.innerHeight,
    }
}

function maxPixelRatio(width) {
    const cap = width <= MOBILE_MAX_WIDTH ? MOBILE_MAX_DPR : DESKTOP_MAX_DPR
    return Math.min(window.devicePixelRatio || 1, cap)
}

function segmentsForWidth(width) {
    return width <= MOBILE_MAX_WIDTH ? 48 : 80
}

function rainDetail(width, height) {
    const aspect = width / Math.max(height, 1)
    const visibleWidth = 2 * Math.tan((75 * Math.PI) / 360) * aspect
    const spread = Math.min(6.2, Math.max(1.15, visibleWidth * 2.05))
    const narrow = width <= 420 || aspect < 0.85
    if (width <= MOBILE_MAX_WIDTH) {
        return {
            columns: 2,
            slots: 1,
            scale: narrow ? 0.046 : 0.048,
            spread,
            lift: 0.08,
            forwardColumns: 1,
            forwardSlots: 1,
        }
    }
    return { columns: 2, slots: 2, scale: 0.05, spread, lift: 0.02, forwardColumns: 2, forwardSlots: 1 }
}

function unitHash(index) {
    const value = Math.sin(index * 127.1 + 311.7) * 43758.5453
    return value - Math.floor(value)
}

function applyTunedColor(uniform, hex, factor) {
    uniform.value.set(hex).multiplyScalar(factor)
}

function createBinaryAtlas() {
    const atlas = document.createElement('canvas')
    atlas.width = 128
    atlas.height = 64
    const context = atlas.getContext('2d')
    context.clearRect(0, 0, atlas.width, atlas.height)
    context.fillStyle = '#ffffff'
    context.font = '600 46px ui-monospace, monospace'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText('0', 32, 34)
    context.fillText('1', 96, 34)
    const texture = new THREE.CanvasTexture(atlas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
    return texture
}

export function initWebgl({ canvas, reduceMotion, showFallback, hideFallback }) {
    const signalEvents = new AbortController()
    const { signal } = signalEvents
    let disposed = false
    let frameId = 0
    let contextLost = false
    let running = true
    const sizes = readViewport()
    let waterSegments = segmentsForWidth(sizes.width)
    let rainKey = ''
    let renderer = null
    let water = null
    let waterMaterial = null
    let farMesh = null
    let forwardMesh = null
    let rainMaterial = null
    let forwardMaterial = null
    let rainAtlas = null
    const lookTarget = new THREE.Vector3()

    function stop() {
        disposed = true
        running = false
        window.cancelAnimationFrame(frameId)
        signalEvents.abort()
        water?.geometry?.dispose()
        waterMaterial?.dispose()
        farMesh?.geometry?.dispose()
        forwardMesh?.geometry?.dispose()
        rainMaterial?.dispose()
        forwardMaterial?.dispose()
        rainAtlas?.dispose()
        renderer?.dispose()
    }

    if (!canvas || reduceMotion()) {
        showFallback(reduceMotion())
        return stop
    }

    function buildRainMesh(columns, slots, material, renderOrder, seedOffset, uniqueSeeds = false) {
        const count = columns * slots
        const geometry = new THREE.PlaneGeometry(1, 1)
        const column = new Float32Array(count)
        const slot = new Float32Array(count)
        const seed = new Float32Array(count)
        const length = new Float32Array(count)
        const glyph = new Float32Array(count)
        const depth = new Float32Array(count)

        for (let x = 0; x < columns; x += 1) {
            const columnSeed = unitHash(x + 1 + seedOffset)
            for (let y = 0; y < slots; y += 1) {
                const index = x * slots + y
                column[index] = x
                slot[index] = y
                seed[index] = uniqueSeeds ? unitHash(seedOffset + x * 19.1 + y * 7.3 + 3) : columnSeed
                length[index] = slots
                glyph[index] = unitHash(seedOffset + x * 17 + y * 3 + 9) > 0.48 ? 1 : 0
                depth[index] = unitHash(seedOffset + x * 13 + y * 0.17 + 5)
            }
        }

        geometry.setAttribute('aColumn', new THREE.InstancedBufferAttribute(column, 1))
        geometry.setAttribute('aSlot', new THREE.InstancedBufferAttribute(slot, 1))
        geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1))
        geometry.setAttribute('aLength', new THREE.InstancedBufferAttribute(length, 1))
        geometry.setAttribute('aGlyph', new THREE.InstancedBufferAttribute(glyph, 1))
        geometry.setAttribute('aDepth', new THREE.InstancedBufferAttribute(depth, 1))

        const mesh = new THREE.InstancedMesh(geometry, material, count)
        mesh.frustumCulled = false
        mesh.renderOrder = renderOrder
        if (material.uniforms.uColumnCount) material.uniforms.uColumnCount.value = columns
        return mesh
    }

    function createRainLayers(width, height) {
        const detail = rainDetail(width, height)
        rainKey = `${detail.columns}x${detail.slots}x${detail.forwardColumns}x${detail.forwardSlots}`
        rainMaterial.uniforms.uGlyphScale.value = detail.scale
        rainMaterial.uniforms.uSpread.value = detail.spread
        rainMaterial.uniforms.uLift.value = detail.lift
        return {
            far: buildRainMesh(detail.columns, detail.slots, rainMaterial, 0, 0),
            forward: buildRainMesh(detail.forwardColumns, detail.forwardSlots, forwardMaterial, 1, 400, true),
        }
    }

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, sizes.width / Math.max(sizes.height, 1), 0.1, 100)
    camera.position.set(0, 0, 1)
    scene.add(camera)

    try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' })
    } catch {
        showFallback(false)
        return stop
    }

    renderer.toneMapping = THREE.ACESFilmicToneMapping
    canvas.style.pointerEvents = 'none'
    hideFallback()

    canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault()
        contextLost = true
        window.cancelAnimationFrame(frameId)
        showFallback(false)
    }, { signal })

    const depthColor = '#d9d9d9'
    const surfaceColor = '#ffbe6f'
    const rainColor = '#cbb59a'
    const waveUniforms = {
        uTime: { value: 0 },
        uBigWavesElevation: { value: 0.05 },
        uBigWavesFrequency: { value: new THREE.Vector2(4, 1.5) },
        uBigWavesSpeed: { value: 0.55 },
        uSmallWavesElevation: { value: 0.15 },
        uSmallWavesFrequency: { value: 3 },
        uSmallWavesSpeed: { value: 0.2 },
        uSmallIterations: { value: 1.6 },
    }

    waterMaterial = new THREE.ShaderMaterial({
        vertexShader: waterVertexShader,
        fragmentShader: waterFragmentShader,
        uniforms: {
            ...waveUniforms,
            uDepthColor: { value: new THREE.Color() },
            uSurfaceColor: { value: new THREE.Color() },
            uColorOffset: { value: 0.55 },
            uColorMultiplier: { value: 1.5 },
        },
        wireframe: true,
        transparent: true,
    })
    applyTunedColor(waterMaterial.uniforms.uDepthColor, depthColor, DEPTH_DARKEN)
    applyTunedColor(waterMaterial.uniforms.uSurfaceColor, surfaceColor, SURFACE_DARKEN)

    rainAtlas = createBinaryAtlas()
    const rainShared = {
        uTime: waveUniforms.uTime,
        uGlyphScale: { value: 0.07 },
        uSpread: { value: 3.15 },
        uLift: { value: 0.42 },
        uAtlas: { value: rainAtlas },
        uRainColor: { value: new THREE.Color(rainColor) },
        uRainOpacity: { value: 0.9 },
        uRainSpeed: { value: 0.55 },
    }
    rainMaterial = new THREE.ShaderMaterial({
        vertexShader: rainVertexShader,
        fragmentShader: rainFragmentShader,
        uniforms: { ...rainShared, uColumnCount: { value: 14 } },
        transparent: true,
        depthWrite: false,
    })
    forwardMaterial = new THREE.ShaderMaterial({
        vertexShader: flowVertexShader,
        fragmentShader: rainFragmentShader,
        uniforms: {
            ...waveUniforms,
            uMeshMatrix: { value: new THREE.Matrix4() },
            uGlyphScale: rainShared.uGlyphScale,
            uRainSpeed: rainShared.uRainSpeed,
            uAtlas: rainShared.uAtlas,
            uRainColor: rainShared.uRainColor,
            uRainOpacity: rainShared.uRainOpacity,
        },
        transparent: true,
        depthWrite: false,
    })

    const rainLayers = createRainLayers(sizes.width, sizes.height)
    farMesh = rainLayers.far
    forwardMesh = rainLayers.forward
    scene.add(farMesh, forwardMesh)

    water = new THREE.Mesh(new THREE.PlaneGeometry(4, 3, waterSegments, waterSegments), waterMaterial)
    water.rotation.x = PLANE_TILT
    water.renderOrder = 2
    scene.add(water)
    water.updateMatrixWorld()
    forwardMaterial.uniforms.uMeshMatrix.value.copy(water.matrixWorld)

    function applyViewport() {
        const next = readViewport()
        sizes.width = next.width
        sizes.height = Math.max(next.height, 1)
        camera.aspect = sizes.width / sizes.height
        camera.updateProjectionMatrix()
        renderer.setPixelRatio(maxPixelRatio(sizes.width))
        renderer.setSize(sizes.width, sizes.height)

        const segments = segmentsForWidth(sizes.width)
        if (segments !== waterSegments) {
            const nextGeometry = new THREE.PlaneGeometry(4, 3, segments, segments)
            water.geometry.dispose()
            water.geometry = nextGeometry
            waterSegments = segments
        }

        const nextRain = rainDetail(sizes.width, sizes.height)
        const nextKey = `${nextRain.columns}x${nextRain.slots}x${nextRain.forwardColumns}x${nextRain.forwardSlots}`
        if (nextKey !== rainKey) {
            const nextLayers = createRainLayers(sizes.width, sizes.height)
            scene.remove(farMesh, forwardMesh)
            farMesh.geometry.dispose()
            forwardMesh.geometry.dispose()
            farMesh = nextLayers.far
            forwardMesh = nextLayers.forward
            scene.add(farMesh, forwardMesh)
        } else {
            rainMaterial.uniforms.uGlyphScale.value = nextRain.scale
            rainMaterial.uniforms.uSpread.value = nextRain.spread
            rainMaterial.uniforms.uLift.value = nextRain.lift
        }
    }

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    if (finePointer.matches) {
        document.addEventListener('mousemove', (event) => {
            const pointerX = (event.clientX / sizes.width) * 2 - 1
            const pointerY = -(event.clientY / sizes.height) * 2 + 1
            camera.position.x = pointerX * 0.2
            camera.position.y = pointerY * 0.2
            camera.lookAt(lookTarget)
        }, { signal })
    }

    canvas.addEventListener('webglcontextrestored', () => {
        contextLost = false
        hideFallback()
        applyViewport()
        if (running) frameId = window.requestAnimationFrame(tick)
    }, { signal })

    window.addEventListener('resize', applyViewport, { signal })
    window.visualViewport?.addEventListener('resize', applyViewport, { signal })
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            running = false
            window.cancelAnimationFrame(frameId)
            return
        }
        running = true
        if (!contextLost && !disposed) frameId = window.requestAnimationFrame(tick)
    }, { signal })

    applyViewport()

    const clock = new THREE.Clock()
    function tick() {
        if (!running || contextLost || disposed) return
        if (!reduceMotion()) waveUniforms.uTime.value = clock.getElapsedTime()
        renderer.render(scene, camera)
        frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)
    return stop
}
