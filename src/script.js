import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import waterVertexShader from './shaders/water/vertex.glsl';
import waterFragmentShader from './shaders/water/fragment.glsl';

/* ===================================================
   ==================== WarningOrientation ===========
   =================================================== */
// const warning = document.getElementById('landscape-warning');

// function checkOrientation() {
//     if (window.innerWidth > window.innerHeight && window.innerWidth <= 1024) {
//         // celular em horizontal
//         warning.style.display = 'flex';
//     } else {
//         // celular em vertical ou desktop
//         warning.style.display = 'none';
//     }
// }

// // Checa a orientação ao carregar a página
// window.addEventListener('load', checkOrientation);

// // Checa sempre que a tela é redimensionada ou rotacionada
// window.addEventListener('resize', checkOrientation);
// window.addEventListener('orientationchange', checkOrientation);

// // Remove aviso ao clicar na tela
// window.addEventListener('click', () => {
//     warning.style.display = 'none';
// });


/* ===================================================
   ==================== PRELOADER ====================
   =================================================== */
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
    contador = 100;
    percent.textContent = '100%';
    setTimeout(() => {
        preloader.style.opacity = '0';
        setTimeout(() => {
            preloader.style.display = 'none';
            content.style.display = 'block';
        }, 500);
    }, 300);
};

/* ===================================================
   ==================== GUI / DEBUG ==================
   =================================================== */
const gui = new GUI({ width: 300, closed: true });
gui.domElement.style.position = 'fixed';
gui.domElement.style.bottom = '10px';
gui.domElement.style.right = '10px';
gui.domElement.style.top = 'auto';

const debugObject = {};
gui.close()

/* ===================================================
   ==================== THREE.JS =====================
   =================================================== */

// ---- Canvas & Scene ----
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();

// ---- Sizes ----
const sizes = { width: window.innerWidth, height: window.innerHeight };

// ---- Camera ----
const camera = new THREE.PerspectiveCamera(
    75,
    sizes.width / sizes.height,
    0.1,
    100);
camera.position.set(0, 0, 1);
scene.add(camera);

// ---- Renderer ----
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

// ---- Controls ----
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enableZoom = false;
controls.enableRotate = false;
controls.enablePan = false;

// ---- Resize ----
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/* ===================================================
   ==================== PARTICLES ====================
   =================================================== */
const particlesCount = 1200;
const positions = new Float32Array(particlesCount * 3);
const colors = new Float32Array(particlesCount * 3);

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
particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

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

/* ===================================================
   ==================== WATER ========================
   =================================================== */
debugObject.depthColor = '#920C80';
debugObject.surfaceColor = '#151c37';

// const waterGeometry = new THREE.PlaneGeometry(3, 2, 512, 512);
const isMobile = window.innerWidth <= 1024;
const segments = isMobile ? 128 : 256; // mobile: 128, desktop: 512
const waterGeometry = new THREE.PlaneGeometry(3, 2, segments, segments);

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
});

gui.addColor(debugObject, 'depthColor').onChange(() => waterMaterial.uniforms.uDepthColor.value.set(debugObject.depthColor));
gui.addColor(debugObject, 'surfaceColor').onChange(() => waterMaterial.uniforms.uSurfaceColor.value.set(debugObject.surfaceColor));
gui.add(waterMaterial.uniforms.uBigWavesElevation, 'value').min(0).max(1).step(0.001).name('uBigWavesElevation');
gui.add(waterMaterial.uniforms.uBigWavesFrequency.value, 'x').min(0).max(10).step(0.001).name('uBigWavesFrequencyX');
gui.add(waterMaterial.uniforms.uBigWavesFrequency.value, 'y').min(0).max(10).step(0.001).name('uBigWavesFrequencyY');
gui.add(waterMaterial.uniforms.uBigWavesSpeed, 'value').min(0).max(4).step(0.001).name('uBigWavesSpeed');
gui.add(waterMaterial.uniforms.uSmallWavesElevation, 'value').min(0).max(1).step(0.001).name('uSmallWavesElevation');
gui.add(waterMaterial.uniforms.uSmallWavesFrequency, 'value').min(0).max(30).step(0.001).name('uSmallWavesFrequency');
gui.add(waterMaterial.uniforms.uSmallWavesSpeed, 'value').min(0).max(4).step(0.001).name('uSmallWavesSpeed');
gui.add(waterMaterial.uniforms.uSmallIterations, 'value').min(0).max(5).step(1).name('uSmallIterations');
gui.add(waterMaterial.uniforms.uColorOffset, 'value').min(0).max(1).step(0.001).name('uColorOffset');
gui.add(waterMaterial.uniforms.uColorMultiplier, 'value').min(0).max(10).step(0.001).name('uColorMultiplier');

const water = new THREE.Mesh(waterGeometry, waterMaterial);
water.rotation.x = -Math.PI * 0.35;
scene.add(water);

/* ===================================================
   ==================== MOUSE INTERACTION =============
   =================================================== */
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

    camera.position.x = mouseX * 0.2;
    camera.position.y = mouseY * 0.2;
    camera.lookAt(0, 0, 0);
});

/* ===================================================
   ==================== SMOOTH SCROLL =================
   =================================================== */
function smoothScroll(target, duration = 1000) {
    const start = window.scrollY;
    const end = target.offsetTop;
    const distance = end - start;
    let startTime = null;

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animation(currentTime) {
        if (!startTime) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        const ease = easeInOutCubic(progress);

        window.scrollTo(0, start + distance * ease);

        if (timeElapsed < duration) requestAnimationFrame(animation);
    }

    requestAnimationFrame(animation);
}

document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) smoothScroll(target, 1200);
    });
});

/* ===================================================
   ==================== TYPEWRITER ====================
   =================================================== */
const text = "I am passionate about turning ideas into innovative digital experiences. Always seeking creative solutions for complex challenges, I found my true expression in web development. Since 2024, I have fully dedicated myself to mastering and expanding my skills, diving deeper into the world of creative development. Skills: HTML | CSS | Javascript | ThreeJs | NodeJs | Blender";
const el = document.getElementById("typewriter");
let i = 0, forward = true;

// Função typewriter
function typeWriter() {
    if (forward) {
        if (i < text.length) el.textContent += text.charAt(i++);
    } else {
        if (i > 0) el.textContent = text.substring(0, --i);
        else forward = true;
    }

    setTimeout(typeWriter, forward ? 100 : 50);
}

// Observer para disparar quando a seção entrar na tela
let typewriterStarted = false;
const observerType = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !typewriterStarted) {
            typewriterStarted = true;
            setTimeout(typeWriter, 1000); // espera 1s antes de começar
            obs.unobserve(entry.target); // dispara apenas uma vez
        }
    });
}, { threshold: 0.5 });

// Observa o elemento do typewriter
observerType.observe(el);

/* ===================================================
   ==================== HTML TEXT INTERACTION =========
   =================================================== */
// Só habilita o efeito em telas grandes e dispositivos com hover
if (window.innerWidth > 768 && window.matchMedia("(hover: hover)").matches) {
    const texts = document.querySelectorAll('.h1-brazillian, .h1-front-end, .h1-creative-developer, .menu-header li');

    texts.forEach(text => {
        text.style.position = 'relative';
        text.style.display = 'inline-block';
        text.style.transition = 'transform 0.05s';

        text.addEventListener('mouseenter', () => text.followCursor = true);
        text.addEventListener('mouseleave', () => {
            text.followCursor = false;
            text.style.transform = 'translate(0, 0)';
        });
    });

    document.addEventListener('mousemove', (event) => {
        const mouseX = event.clientX, mouseY = event.clientY;
        texts.forEach(text => {
            if (text.followCursor) {
                const rect = text.getBoundingClientRect();
                const offsetX = mouseX - (rect.left + rect.width / 2);
                const offsetY = mouseY - (rect.top + rect.height / 2);
                text.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
            }
        });
    });
}
/* ===================================================
   ==================== FRAMES INTERACTION ============
   =================================================== */
const frames = document.querySelectorAll('work-frame');
frames.forEach(frame => {
    frame.style.position = 'relative';
    frame.style.display = 'inline-block';
    frame.style.transition = 'transform 0.05s';
    frame.addEventListener('mouseenter', () => frame.followCursor = true);
    frame.addEventListener('mouseleave', () => {
        frame.followCursor = false;
        frame.style.transform = 'translate(0, 0)';
    });
});

document.addEventListener('mousemove', (event) => {
    const mouseX = event.clientX, mouseY = event.clientY;
    frames.forEach(frame => {
        if (frame.followCursor) {
            const rect = frame.getBoundingClientRect();
            const offsetX = mouseX - (rect.left + rect.width / 2);
            const offsetY = mouseY - (rect.top + rect.height / 2);
            frame.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        }
    });
});


/* ===================================================
   ==================== WORKS ANIMATION===============
   =================================================== */
document.addEventListener('DOMContentLoaded', () => {
    const sectionWorks = document.querySelector("#works");
    const works = document.querySelectorAll(".works");

    if (!sectionWorks || works.length === 0) return; // segurança

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                works.forEach(el => el.classList.add("animate"));
                obs.unobserve(sectionWorks); // dispara apenas uma vez
            }
        });
    }, { threshold: 0.3 });

    observer.observe(sectionWorks);
});

/* ===================================================
   ==================== SMOKY ========================
   =================================================== */
document.querySelectorAll("ul.smoky").forEach(ul => {
    ul.addEventListener("click", () => {
        ul.classList.add("animate");

        const link = ul.getAttribute("data-link");

        setTimeout(() => {
            window.open(link, "_blank");

            ul.classList.remove("animate");
        }, 1200);
    });
});

/* ===================================================
   ==================== ANIMATE ========================
   =================================================== */
const clock = new THREE.Clock();

const tick = () => {
    waterMaterial.uniforms.uTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
};

tick();
