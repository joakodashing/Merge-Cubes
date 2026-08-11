window.addEventListener("DOMContentLoaded", () => {
  // Aquí empieza tu código de Matter.js...
  const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;

// ---------- CONFIGURACIÓN ----------
const IMAGE_FOLDER = "images";
const MAX_LEVEL = 10;
let puntaje = 0;
let nextLevel = randomSpawnLevel();

// Dimensiones de la pantalla de juego
const WIDTH = 480;
const HEIGHT = 720;

// Tamaños exactos para las imágenes y colisiones de cada nivel (Mismo tamaño para evitar glitches)
const CUBE_SIZES = {
  1: 45, 2: 55, 3: 65, 4: 75, 5: 85, 
  6: 95, 7: 105, 8: 115, 9: 125, 10: 140
};

// Generador de niveles para los nuevos cubos (1 al 3)
function randomSpawnLevel() {
  const r = Math.random();
  if (r < 0.6) return 1;
  if (r < 0.9) return 2;
  return 3;
}

// ---------- INICIALIZACIÓN DE MATTER.JS ----------
const engine = Engine.create({ gravity: { y: 1.2 } }); // Gravedad hacia abajo estable
const world = engine.world;

const render = Render.create({
  element: contenedorJuego,
  engine: engine,
  options: {
    width: WIDTH,
    height: HEIGHT,
    wireframes: false,
    
    // 🌟 RUTA LOCAL ACTUALIZADA: Apunta a tu nueva subcarpeta
    // Recuerda escribir las mayúsculas y minúsculas exactamente igual que en GitHub
    background: 'images/backgrounds/game_bg_01_001-uhd.png' 
  }
});

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// Crear los límites físicos de la caja (Paredes invisibles pero sólidas)
const suelo = Bodies.rectangle(WIDTH / 2, HEIGHT + 30, WIDTH, 60, { isStatic: true });
const paredIzquierda = Bodies.rectangle(-30, HEIGHT / 2, 60, HEIGHT, { isStatic: true });
const paredDerecha = Bodies.rectangle(WIDTH + 30, HEIGHT / 2, 60, HEIGHT, { isStatic: true });
Composite.add(world, [suelo, paredIzquierda, paredDerecha]);

// ---------- CONTROL DE IMÁGENES ----------
function getCubeRenderOptions(level) {
  return {
    sprite: {
      texture: `${IMAGE_FOLDER}/cube${level}.png`,
      xScale: CUBE_SIZES[level] / 100, // Ajusta la escala según el tamaño original de tus PNGs (asume 100px base)
      yScale: CUBE_SIZES[level] / 100
    }
  };
}

// Actualizar el recuadro visual del siguiente cubo en la UI
function actualizarPreview() {
  const previewDiv = document.getElementById("nextPreview");
  previewDiv.innerHTML = `<img src="${IMAGE_FOLDER}/cube${nextLevel}.png" alt="Siguiente">`;
}
actualizarPreview();

// ---------- LANZAMIENTO DE CUBOS ----------
window.addEventListener("click", (e) => {
  // Evitar disparar si se hace clic en el botón de reinicio
  if (e.target.id === "btnReset") return;

  const rect = render.canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;

  // Solo disparar si el clic fue dentro de los márgenes horizontales del canvas
  if (clickX >= 0 && clickX <= WIDTH) {
    const size = CUBE_SIZES[nextLevel];
    
    // Limitar la posición para que el cubo no nazca traspasando las paredes laterales
    const spawnX = Math.max(size / 2, Math.min(clickX, WIDTH - size / 2));

    const nuevoCubo = Bodies.rectangle(spawnX, 80, size, size, {
      restitution: 0.2, // Rebote controlado
      friction: 0.1,
      render: getCubeRenderOptions(nextLevel),
      plugin: { level: nextLevel, id: Math.random() } // Datos personalizados para la lógica
    });

    Composite.add(world, nuevoCubo);

    // Preparar el siguiente cubo
    nextLevel = randomSpawnLevel();
    actualizarPreview();
  }
});

// ---------- MOTOR DE COLISIONES Y PUNTOS (MATTER.JS) ----------
Events.on(engine, 'collisionStart', (event) => {
  event.pairs.forEach((pair) => {
    const { bodyA, bodyB } = pair;

    // Verificar que ambos objetos sean cubos válidos del juego
    if (bodyA.plugin && bodyB.plugin && bodyA.plugin.level && bodyB.plugin.level) {
      
      // Si son del mismo nivel, se produce la magia de la fusión
      if (bodyA.plugin.level === bodyB.plugin.level) {
        const nivelActual = bodyA.plugin.level;
        const nuevoNivel = nivelActual + 1;

        // ✅ CÓDIGO CORREGIDO:
        if (Composite.allBodies(world).includes(bodyA) && Composite.allBodies(world).includes(bodyB)) {
        return; 
      }

        // Eliminar del mundo los dos cubos pequeños de forma limpia
        Composite.remove(world, bodyA);
        Composite.remove(world, bodyB);

        // Calcular el punto medio exacto de la colisión para que aparezca ahí el nuevo cubo
        const midX = (bodyA.position.x + bodyB.position.x) / 2;
        const midY = (bodyA.position.y + bodyB.position.y) / 2;

        if (nuevoNivel <= MAX_LEVEL) {
          const nuevoTamaño = CUBE_SIZES[nuevoNivel];
          
          const cuboFusionado = Bodies.rectangle(midX, midY, nuevoTamaño, nuevoTamaño, {
            restitution: 0.2,
            friction: 0.1,
            render: getCubeRenderOptions(nuevoNivel),
            plugin: { level: nuevoNivel, id: Math.random() }
          });

          // Le aplicamos un leve impulso hacia arriba para simular un salto satisfactorio en la fusión
          Body.setVelocity(cuboFusionado, { x: (Math.random() - 0.5) * 2, y: -4 });
          Composite.add(world, cuboFusionado);

          // 🌟 SISTEMA DE PUNTUACIÓN INTEGRADO DE FORMA ESTABLE
          puntaje += nuevoNivel * 10;
          document.getElementById("puntos").textContent = puntaje;
        }
      }
    }
  });
});

// ---------- BOTÓN DE REINICIO ----------
document.getElementById("btnReset").addEventListener("click", () => {
  // Limpiar todos los cubos sueltos dejando solo el suelo y las paredes estáticas
  const todosLosCuerpos = Composite.allBodies(world);
  todosLosCuerpos.forEach(body => {
    if (!body.isStatic) {
      Composite.remove(world, body);
    }
  });

  // Resetear puntaje
  puntaje = 0;
  document.getElementById("puntos").textContent = puntaje;

  // Resetear niveles
  nextLevel = randomSpawnLevel();
  actualizarPreview();

    if (btnReset) btnReset.addEventListener('click', resetGame);
  if (btnWinReset) btnWinReset.addEventListener('click', resetGame);
});
}
