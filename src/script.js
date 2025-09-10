import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import waterVertexShader from './shaders/water/vertex.glsl'
import waterFragmentShader from './shaders/water/fragment.glsl'

/**
 * ====================
 * Preloader
 * ====================
 */
const percent = document.getElementById('percent');
const preloader = document.getElementById('preloader');
const content = document.getElementById('content');

let contador = 1;
const duracaoTotal = 1800;
const numerosTotais = 100;
const intervalo = duracaoTotal / numerosTotais;

function mostrarNumero() {
  percent.textContent = contador + '%';
  if (contador < 100) {
    contador++;
    setTimeout(mostrarNumero, intervalo);
  }
}

mostrarNumero();

window.onload = () => {
  // garante que termine em 100%
  contador = 100;
  percent.textContent = '100%';

  // fade-out
  setTimeout(() => {
    preloader.style.opacity = '0';
    setTimeout(() => {
      preloader.style.display = 'none';
      content.style.display = 'block';
    }, 500); // coincide com transition
  }, 300);
};


/**
 * ====================
 * GUI / DEBUG
 * ====================
 */
const gui = new GUI({ 
    width: 340,
    closed: true
});

gui.domElement.style.position = 'fixed';
gui.domElement.style.bottom = '10px';
gui.domElement.style.right = '10px';
gui.domElement.style.top = 'auto';

const debugObject = {}

/**
 * ====================
 * CANVAS & SCENE
 * ====================
 */
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()

/**
 * ====================
 * PARTICLES
 * ====================
 */
const particlesCount = 2000;
const positions = new Float32Array(particlesCount * 3);
const colors = new Float32Array(particlesCount * 3)

for (let i = 0; i < particlesCount; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 15;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

    colors[i * 3 + 0] = Math.random() * 0.5;
    colors[i * 3 + 1] = Math.random() * 0.5;
    colors[i * 3 + 2] = Math.random() * 0.5;
}

const particlesGeometry = new THREE.BufferGeometry();
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

const particlesMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.003,
    sizeAttenuation: true,
    transparent: true,
    alphaTest: 0.01,
    vertexColors: true
});

const particles = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particles);

/**
 * ====================
 * WATER
 * ====================
 */
const waterGeometry = new THREE.PlaneGeometry(2, 2, 512, 512)

debugObject.depthColor = '#ff4000'
debugObject.surfaceColor = '#151c37'

const waterMaterial = new THREE.ShaderMaterial({
    vertexShader: waterVertexShader,
    fragmentShader: waterFragmentShader,
    uniforms: {
        uTime: { value: 0 },
        
        uBigWavesElevation: { value: 0.2 },
        uBigWavesFrequency: { value: new THREE.Vector2(4, 1.5) },
        uBigWavesSpeed: { value: 0.55 },

        uSmallWavesElevation: { value: 0.15 },
        uSmallWavesFrequency: { value: 3 },
        uSmallWavesSpeed: { value: 0.2 },
        uSmallIterations: { value: 3.6 },

        uDepthColor: { value: new THREE.Color(debugObject.depthColor) },
        uSurfaceColor: { value: new THREE.Color(debugObject.surfaceColor) },
        uColorOffset: { value: 0.925 },
        uColorMultiplier: { value: 1 }
    }
})

gui.addColor(debugObject, 'depthColor').onChange(() => { waterMaterial.uniforms.uDepthColor.value.set(debugObject.depthColor) })
gui.addColor(debugObject, 'surfaceColor').onChange(() => { waterMaterial.uniforms.uSurfaceColor.value.set(debugObject.surfaceColor) })
gui.add(waterMaterial.uniforms.uBigWavesElevation, 'value').min(0).max(1).step(0.001).name('uBigWavesElevation')
gui.add(waterMaterial.uniforms.uBigWavesFrequency.value, 'x').min(0).max(10).step(0.001).name('uBigWavesFrequencyX')
gui.add(waterMaterial.uniforms.uBigWavesFrequency.value, 'y').min(0).max(10).step(0.001).name('uBigWavesFrequencyY')
gui.add(waterMaterial.uniforms.uBigWavesSpeed, 'value').min(0).max(4).step(0.001).name('uBigWavesSpeed')
gui.add(waterMaterial.uniforms.uSmallWavesElevation, 'value').min(0).max(1).step(0.001).name('uSmallWavesElevation')
gui.add(waterMaterial.uniforms.uSmallWavesFrequency, 'value').min(0).max(30).step(0.001).name('uSmallWavesFrequency')
gui.add(waterMaterial.uniforms.uSmallWavesSpeed, 'value').min(0).max(4).step(0.001).name('uSmallWavesSpeed')
gui.add(waterMaterial.uniforms.uSmallIterations, 'value').min(0).max(5).step(1).name('uSmallIterations')
gui.add(waterMaterial.uniforms.uColorOffset, 'value').min(0).max(1).step(0.001).name('uColorOffset')
gui.add(waterMaterial.uniforms.uColorMultiplier, 'value').min(0).max(10).step(0.001).name('uColorMultiplier')

gui.close()

const water = new THREE.Mesh(waterGeometry, waterMaterial)
water.rotation.x = - Math.PI * 0.35
scene.add(water)

/**
 * ====================
 * SIZES & RESIZE
 * ====================
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * ====================
 * CAMERA
 * ====================
 */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 0, 1)
scene.add(camera)

/**
 * ====================
 * CONTROLS
 * ====================
 */
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.enableZoom = false
controls.enableRotate = false
controls.enablePan = false

let mouseX = 0
let mouseY = 0
particlesGeometry.attributes.position.needsUpdate = true;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1

    camera.position.x = mouseX * 0.2
    camera.position.y = mouseY * 0.2
    camera.lookAt(0, 0, 0)
})

/**
 * ====================
 * SMOOTH
 * ====================
 */

function smoothScroll(target, duration = 1000) {
    const start = window.scrollY; // posição inicial
    const end = target.offsetTop; // posição final
    const distance = end - start;
    let startTime = null;

    // função de easing (easeInOutCubic)
    function easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        const ease = easeInOutCubic(progress);

        window.scrollTo(0, start + distance * ease);

        if (timeElapsed < duration) {
            requestAnimationFrame(animation);
        }
    }

    requestAnimationFrame(animation);
}

// Exemplo: adicionando aos links do menu
const links = document.querySelectorAll('a[href^="#"]');

links.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) smoothScroll(target, 1800); // 1200ms de duração
    });
});

/**
 * ====================
 * SECTION 2 - About me
 * ====================
 */

const text = "I am passionate about turning ideas into innovative digital experiences. Always seeking creative solutions for complex challenges, I found my true expression in web development. \nSince 2024, I have fully dedicated myself to mastering and expanding my skills, diving deeper into the world of creative development.\n \nSkills:\nHTML\nCSS\nJavascript\nThreeJs\nNodeJs\nBlender";
const el = document.getElementById("typewriter");
let i = 0;
let forward = true;

function typeWriter() {
    if (forward) {
        if (i < text.length) {
            el.textContent += text.charAt(i);
            i++;
        } 
    } else {
        if (i > 0) {
            el.textContent = text.substring(0, i - 1);
            i--;
        } else {
            forward = true;
        }
    }
    setTimeout(typeWriter, forward ? 100 : 50);
}

typeWriter();

/**
 * ====================
 * HTML TEXT INTERACTION
 * ====================
 */
const texts = document.querySelectorAll(
    '.h1-brazillian, .h1-front-end, .h1-creative-developer, .menu-header li'
)

texts.forEach((text) => {
    text.style.position = 'relative'
    text.style.display = 'inline-block'
    text.style.transition = 'transform 0.05s'

    text.addEventListener('mouseenter', () => { text.followCursor = true })
    text.addEventListener('mouseleave', () => { 
        text.followCursor = false
        text.style.transform = 'translate(0, 0)'
    })
})

document.addEventListener('mousemove', (event) => {
    const mouseX = event.clientX
    const mouseY = event.clientY

    texts.forEach((text) => {
        if (text.followCursor) {
            const rect = text.getBoundingClientRect()
            const offsetX = mouseX - (rect.left + rect.width / 2)
            const offsetY = mouseY - (rect.top + rect.height / 2)

            text.style.transform = `translate(${offsetX}px, ${offsetY}px)`
        }
    })
})



/**
 * ====================
 * FRAMES
 * ====================
 */

const frames = document.querySelectorAll(
    'work-frame'
)

frames.forEach((frame) => {
    frames.style.position = 'relative'
    frame.style.display = 'inline-block'
    frame.style.transition = 'transform 0.05s'

    text.addEventListener('mouseenter', () => { frame.followCursor = true })
    frame.addEventListener('mouseleave', () => { 
        frame.followCursor = false
        frame.style.transform = 'translate(0, 0)'
    })
})

document.addEventListener('mousemove', (event) => {
    const mouseX = event.clientX
    const mouseY = event.clientY

    texts.forEach((frame) => {
        if (frame.followCursor) {
            const rect = text.getBoundingClientRect()
            const offsetX = mouseX - (rect.left + rect.width / 2)
            const offsetY = mouseY - (rect.top + rect.height / 2)

            frame.style.transform = `translate(${offsetX}px, ${offsetY}px)`
        }
    })
})

/**
 * ====================
 * RENDERER
 * ====================
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas, 
    alpha: true
})
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * ====================
 * ANIMATE
 * ====================
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    waterMaterial.uniforms.uTime.value = elapsedTime

    renderer.render(scene, camera)
    window.requestAnimationFrame(tick)
}

tick()
