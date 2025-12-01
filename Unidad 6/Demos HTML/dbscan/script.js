document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('dbscanCanvas');
    const ctx = canvas.getContext('2d');

    // Controles de la UI
    const epsSlider = document.getElementById('eps');
    const minPtsSlider = document.getElementById('minPts');
    const speedSlider = document.getElementById('speed');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const statusDiv = document.getElementById('status');
    
    // Muestra de valores de los sliders
    const epsValueSpan = document.getElementById('eps-value');
    const minPtsValueSpan = document.getElementById('minPts-value');
    const speedValueSpan = document.getElementById('speed-value');

    // Estado de la simulación
    let points = [];
    let animationState = {
        isRunning: false,
        isPaused: false,
        timeoutId: null,
        generator: null
    };
    
    // Colores para los clusters
    const CLUSTER_COLORS = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324'];
    const POINT_COLOR = '#808080'; // Gris para no visitado
    const NOISE_COLOR = '#000000'; // Negro para ruido
    const CORE_POINT_SIZE = 4;
    const DEFAULT_POINT_SIZE = 4;

function generatePoints(numPoints = 150) {
        points = [];
        // Generar algunos clusters para que sea más interesante
        const numClusters = Math.floor(Math.random() * 4) + 2;
        for (let c = 0; c < numClusters; c++) {
            const centerX = Math.random() * (canvas.width - 200) + 100;
            const centerY = Math.random() * (canvas.height - 200) + 100;
            const numPointsInCluster = Math.floor(numPoints / numClusters);
            for (let i = 0; i < numPointsInCluster; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const radius = Math.random() * 60; // Puntos más agrupados
                points.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius,
                    clusterId: undefined, 
                    type: 'unvisited'
                });
            }
        }
        // Añadir algunos puntos aleatorios como posible ruido
        for(let i = 0; i < 40; i++){
             points.push({
                x: Math.random() * (canvas.width - 40) + 20,
                y: Math.random() * (canvas.height - 40) + 20,
                clusterId: undefined,
                type: 'unvisited'
            });
        }
    }

    function draw(activePoint = null, epsRadius = 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        points.forEach(p => {
            let color = POINT_COLOR;
            if (p.clusterId === 0) {
                color = NOISE_COLOR;
            } else if (p.clusterId > 0) {
                color = CLUSTER_COLORS[(p.clusterId - 1) % CLUSTER_COLORS.length];
            }

            ctx.beginPath();
            ctx.fillStyle = color;
            const size = (p.type === 'core') ? CORE_POINT_SIZE : DEFAULT_POINT_SIZE;
            ctx.arc(p.x, p.y, size, 0, 2 * Math.PI);
            ctx.fill();
        });

        if (activePoint) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.arc(activePoint.x, activePoint.y, epsRadius, 0, 2 * Math.PI);
            ctx.stroke();
        }
    }

    function distance(p1, p2) {
        return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
    }

    function getNeighbors(point, eps) {
        return points.filter(p => p !== point && distance(point, p) <= eps);
    }

    function* dbscanGenerator() {
        const eps = parseInt(epsSlider.value);
        const minPts = parseInt(minPtsSlider.value);
        let clusterId = 0;

        for (const p of points) {
            // --- LÓGICA DE VISUALIZACIÓN MEJORADA ---
            // Solo procesamos puntos que no han sido visitados.
            if (p.clusterId !== undefined) {
                continue; 
            }
            
            statusDiv.textContent = `Analizando punto nuevo...`;
            yield { activePoint: p, eps };

            const neighbors = getNeighbors(p, eps);

            if (neighbors.length + 1 < minPts) {
                p.clusterId = 0; 
                p.type = 'noise';
                statusDiv.textContent = `Punto marcado como ruido.`;
                yield { activePoint: p, eps: 0 }; // Mostrar cambio de color sin círculo
                continue;
            }
            
            // ¡Punto núcleo encontrado!
            clusterId++;
            statusDiv.textContent = `¡Punto núcleo encontrado! Creando Cluster ${clusterId}.`;
            p.clusterId = clusterId;
            p.type = 'core';
            
            const seedSet = [...neighbors];
            // Coloreamos la primera "oleada" de vecinos.
            seedSet.forEach(n => { n.clusterId = clusterId; });
            yield { activePoint: p, eps }; // Mostramos el núcleo y sus vecinos ya coloreados

            // Proceso de expansión del cluster
            for (let i = 0; i < seedSet.length; i++) {
                const currentPoint = seedSet[i];
                
                // Si el punto a expandir ya fue procesado como parte de otro cluster, lo ignoramos.
                // Esto es raro que ocurra pero es una salvaguarda.
                if (currentPoint.clusterId !== clusterId) continue;
                
                const newNeighbors = getNeighbors(currentPoint, eps);

                if (newNeighbors.length + 1 >= minPts) {
                    currentPoint.type = 'core'; // Ascender a punto núcleo

                    // Solo añadimos a la lista los puntos realmente nuevos
                    let discoveredCount = 0;
                    newNeighbors.forEach(newN => {
                        if (newN.clusterId === undefined || newN.clusterId === 0) {
                           newN.clusterId = clusterId;
                           newN.type = 'border';
                           seedSet.push(newN);
                           discoveredCount++;
                        }
                    });
                    
                    if (discoveredCount > 0) {
                        statusDiv.textContent = `Cluster ${clusterId} se expande, ${discoveredCount} puntos nuevos encontrados.`;
                        yield { activePoint: currentPoint, eps }; // Pausa para mostrar la expansión
                    }
                }
            }
        }
        statusDiv.textContent = `¡Algoritmo completado! Se encontraron ${clusterId} clusters.`;
        return;
    }

    function runAnimation() {
        if (animationState.isPaused) return;
        const result = animationState.generator.next();
        if (result.done) {
            animationState.isRunning = false;
            pauseBtn.disabled = true;
            pauseBtn.textContent = 'Pausar';
            draw();
            return;
        }
        const { activePoint, eps } = result.value;
        draw(activePoint, eps);
        const speed = parseInt(speedSlider.value);
        animationState.timeoutId = setTimeout(runAnimation, speed);
    }
    
    function start() {
        if (animationState.timeoutId) clearTimeout(animationState.timeoutId);
        generatePoints();
        animationState.generator = dbscanGenerator();
        animationState.isRunning = true;
        animationState.isPaused = false;
        startBtn.textContent = 'Reiniciar';
        pauseBtn.disabled = false;
        pauseBtn.textContent = 'Pausar';
        runAnimation();
    }
    
    function togglePause() {
        if (!animationState.isRunning) return;
        animationState.isPaused = !animationState.isPaused;
        if (animationState.isPaused) {
            pauseBtn.textContent = 'Reanudar';
            clearTimeout(animationState.timeoutId);
            statusDiv.textContent = `Simulación pausada.`;
        } else {
            pauseBtn.textContent = 'Pausar';
            statusDiv.textContent = `Reanudando simulación...`;
            runAnimation();
        }
    }
    
    startBtn.addEventListener('click', start);
    pauseBtn.addEventListener('click', togglePause);
    epsSlider.addEventListener('input', () => epsValueSpan.textContent = epsSlider.value);
    minPtsSlider.addEventListener('input', () => minPtsValueSpan.textContent = minPtsSlider.value);
    speedSlider.addEventListener('input', () => speedValueSpan.textContent = speedSlider.value);

    generatePoints();
    draw();
});