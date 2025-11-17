import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 1. Configuración de la escena
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 2. Controles de órbita
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// 3. Generación de datos de clusters
const points = [];
const colors = [];
const numPointsPerCluster = 300;
const numClusters = 5;
const clusterSpread = 10;

const clusterCenters = [];
for (let i = 0; i < numClusters; i++) {
    clusterCenters.push(
        new THREE.Vector3(
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 50
        )
    );
}

const clusterColors = [
    new THREE.Color(0xff0000), // Rojo
    new THREE.Color(0x00ff00), // Verde
    new THREE.Color(0x0000ff), // Azul
    new THREE.Color(0xffff00), // Amarillo
    new THREE.Color(0xff00ff)  // Magenta
];

clusterCenters.forEach((center, i) => {
    const color = clusterColors[i];
    for (let j = 0; j < numPointsPerCluster; j++) {
        const point = new THREE.Vector3(
            center.x + (Math.random() - 0.5) * clusterSpread,
            center.y + (Math.random() - 0.5) * clusterSpread,
            center.z + (Math.random() - 0.5) * clusterSpread
        );
        points.push(point.x, point.y, point.z);
        colors.push(color.r, color.g, color.b);
    }
});

// 4. Creación de la nube de puntos
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true
});

const pointCloud = new THREE.Points(geometry, material);
scene.add(pointCloud);

// 5. Ejes y fondo
scene.background = new THREE.Color(0x111111);
const axesHelper = new THREE.AxesHelper(50);
scene.add(axesHelper);

// Posición inicial de la cámara
camera.position.z = 100;

// 6. Bucle de animación
function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Requerido si enableDamping es true
    renderer.render(scene, camera);
}

// 7. Manejo del redimensionamiento de la ventana
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
