let puntaje = 0;

/* script.js — Merge Cubes Suika-like (square hitboxes, visual scaling)
   Put images in: images/cube1.png ... images/cube10.png
*/

// ---------- CONFIG ----------
const IMAGE_FOLDER = "images"; // El "./" fuerza a GitHub a buscar en la ruta correcta del repositorio
const MAX_LEVEL = 10;

// visual sizes (pixels) for each level (index by level)
const VISUAL_SIZE = {
  1: 80,
  2: 90,
  3: 100,
  4: 110,
  5: 120,
  6: 128,
  7: 135,
  8: 145,
  9: 155,
  10:165
};

// hitbox sizes (internal collision square), max 85px as requested
const HITBOX_SIZE = {
  1: 55,
  2: 60,
  3: 67,
  4: 74,
  5: 80,
  6: 85,
  7: 85,
  8: 85,
  9: 85,
  10:85
};

const GRAVITY = 0.9;
const RESTITUTION = 0.32; // bounce
const FRICTION = 0.995;
const SPAWN_Y = 60; // spawn vertical position (higher)
const NEXT_PREVIEW_SIZE = 64; // px

// spawn probabilities for levels 1..3
function randomSpawnLevel(){
  const r = Math.random();
  if (r < 0.6) return 1;
  if (r < 0.9) return 2;
  return 3;
}

// ---------- DOM & CANVAS ----------
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const nextPreview = document.getElementById("nextPreview");
const aimCanvas = document.getElementById("aimCanvas");
const aimCtx = aimCanvas.getContext("2d");
const btnReset = document.getElementById("btnReset");
const winOverlay = document.getElementById("winOverlay");
const btnWinReset = document.getElementById("btnWinReset");

let width = 800, height = 1200;
function resizeCanvas(){
  const parentW = Math.min(window.innerWidth * 0.96, 960);
  const parentH = Math.min(window.innerHeight * 0.84, 1600);
  canvas.style.width = parentW + "px";
  canvas.style.height = parentH + "px";
  canvas.width = Math.round(parentW * devicePixelRatio);
  canvas.height = Math.round(parentH * devicePixelRatio);
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  width = parentW;
  height = parentH;
  aimCanvas.width = aimCanvas.clientWidth;
  aimCanvas.height = aimCanvas.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ---------- preload images ----------
const images = {};
for (let i=1;i<=MAX_LEVEL;i++){
  const img = new Image();
  img.src = `${IMAGE_FOLDER}/cube${i}.png`;
  img.onload = ()=> { images[i] = img; };
  img.onerror = ()=> { images[i] = null; }; // graceful fallback
}

// ---------- state ----------
let objects = []; // {id, x,y, vx,vy, level, w,h, hitW, hitH, _remove}
let nextLevel = randomSpawnLevel();
let dragState = null; // {id,startX,startY,x,y}
let lastTime = 0;
let idcnt = 1;
let win = false;

// ---------- helper: render next preview ----------
function renderNextPreview(){
  nextPreview.innerHTML = "";
  if (images[nextLevel]) {
    const node = document.createElement("img");
    node.src = images[nextLevel].src;
    node.style.width = "100%";
    node.style.height = "100%";
    node.style.objectFit = "cover";
    nextPreview.appendChild(node);
  } else {
    const lbl = document.createElement("div");
    lbl.style.width = "100%";
    lbl.style.height = "100%";
    lbl.style.display = "flex";
    lbl.style.alignItems = "center";
    lbl.style.justifyContent = "center";
    lbl.style.background = "#666";
    lbl.style.color = "white";
    lbl.style.fontWeight = "700";
    lbl.textContent = "L" + nextLevel;
    nextPreview.appendChild(lbl);
  }
}
renderNextPreview();

// ---------- input on preview to aim & launch ----------
function getPointer(ev){
  if (ev.touches && ev.touches.length>0) return {id: ev.touches[0].identifier, x: ev.touches[0].clientX, y: ev.touches[0].clientY};
  if (ev.changedTouches && ev.changedTouches.length>0) return {id: ev.changedTouches[0].identifier, x: ev.changedTouches[0].clientX, y: ev.changedTouches[0].clientY};
  return {id: "mouse", x: ev.clientX, y: ev.clientY};
}

let nextPreviewRect = nextPreview.getBoundingClientRect();
window.addEventListener('resize', ()=> nextPreviewRect = nextPreview.getBoundingClientRect());

function startPreviewDrag(ev){
  ev.preventDefault();
  if (win) return;
  dragState = getPointer(ev);
  drawAim();
}
function movePreviewDrag(ev){
  if (!dragState) return;
  const p = getPointer(ev);
  dragState.x = p.x; dragState.y = p.y;
  drawAim();
}
function endPreviewDrag(ev){
  if (!dragState) return;
  const p = getPointer(ev);
  dragState.x = p.x; dragState.y = p.y;
  launchFromPreview();
  dragState = null;
  clearAim();
}

nextPreview.addEventListener('mousedown', startPreviewDrag);
window.addEventListener('mousemove', movePreviewDrag);
window.addEventListener('mouseup', endPreviewDrag);

nextPreview.addEventListener('touchstart', startPreviewDrag, {passive:false});
window.addEventListener('touchmove', movePreviewDrag, {passive:false});
window.addEventListener('touchend', endPreviewDrag);

// aim drawing
function drawAim(){
  if (!dragState) return;
  const pr = nextPreview.getBoundingClientRect();
  const cx = pr.left + pr.width/2;
  const cy = pr.top + pr.height/2;
  const dx = dragState.x - cx;
  const dy = dragState.y - cy;
  aimCtx.clearRect(0,0,aimCanvas.width,aimCanvas.height);
  aimCtx.save();
  aimCtx.translate(aimCanvas.width/2, aimCanvas.height/2);
  aimCtx.beginPath();
  aimCtx.moveTo(0,0);
  const len = Math.min(120, Math.hypot(dx,dy));
  const nx = (dx / (Math.hypot(dx||1,dy||1))) * (len/2);
  const ny = (dy / (Math.hypot(dx||1,dy||1))) * (len/2);
  aimCtx.lineTo(nx, ny);
  aimCtx.strokeStyle = 'rgba(255,255,255,0.9)';
  aimCtx.lineWidth = 2;
  aimCtx.stroke();
  aimCtx.restore();
}
function clearAim(){ aimCtx.clearRect(0,0,aimCanvas.width,aimCanvas.height); }

// ---------- launch logic ----------
function launchFromPreview(){
  if (win) return;
  const pr = nextPreview.getBoundingClientRect();
  const centerX = pr.left + pr.width/2;
  const centerY = pr.top + pr.height/2;
  const tx = dragState ? dragState.x : centerX;
  const ty = dragState ? dragState.y : centerY;
  const vx = (centerX - tx) * 0.09;
  const vy = (centerY - ty) * 0.09;
  const rect = canvas.getBoundingClientRect();
  const spawnX = (centerX - rect.left) * (canvas.width / rect.width) / devicePixelRatio;
  const spawnY = SPAWN_Y;
  createCube(nextLevel, spawnX - VISUAL_SIZE[nextLevel]/2, spawnY - VISUAL_SIZE[nextLevel]/2, vx, vy);
  nextLevel = randomSpawnLevel();
  renderNextPreview();
}

// ---------- create object ----------
function createCube(level, x, y, vx=0, vy=0){
  const visualW = VISUAL_SIZE[level];
  const visualH = visualW;
  const hitW = HITBOX_SIZE[level];
  const hitH = hitW;
  const obj = {
    id: idcnt++,
    level, x, y, w: visualW, h: visualH,
    hitW, hitH,
    vx, vy,
    _remove: false
  };
  objects.push(obj);
  return obj;
}

// ---------- box helper math functions ----------
function hitOverlap(a, b) {
  return (a.x + (a.w - a.hitW)/2 < b.x + (b.w - b.hitW)/2 + b.hitW &&
          a.x + (a.w - a.hitW)/2 + a.hitW > b.x + (b.w - b.hitW)/2 &&
          a.y + (a.h - a.hitH)/2 < b.y + (b.h - b.hitH)/2 + b.hitH &&
          a.y + (a.h - a.hitH)/2 + a.hitH > b.y + (b.h - b.hitH)/2);
}

function getHitOverlap(a, b) {
  const ax1 = a.x + (a.w - a.hitW)/2;
  const ax2 = ax1 + a.hitW;
  const ay1 = a.y + (a.h - a.hitH)/2;
  const ay2 = ay1 + a.hitH;

  const bx1 = b.x + (b.w - b.hitW)/2;
  const bx2 = bx1 + b.hitW;
  const by1 = b.y + (b.h - b.hitH)/2;
  const by2 = by1 + b.hitH;

  const overlapX = Math.min(ax2, bx2) - Math.max(ax1, bx1);
  const overlapY = Math.min(ay2, by2) - Math.max(ay1, by1);

  if (overlapX <= 0 || overlapY <= 0) return null;

  const centerXA = ax1 + a.hitW / 2;
  const centerXB = bx1 + b.hitW / 2;
  const centerYA = ay1 + a.hitH / 2;
  const centerYB = by1 + b.hitH / 2;

  return {
    x: centerXA < centerXB ? -overlapX : overlapX,
    y: centerYA < centerYB ? -overlapY : overlapY
  };
}

// ---------- physics step ----------
function step(dt){
  for (let o of objects){
    o.vy += GRAVITY * dt;
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.vx *= FRICTION;
    if (o.x < 0){ o.x = 0; o.vx = -o.vx * RESTITUTION; }
    if (o.x + o.w > width){ o.x = width - o.w; o.vx = -o.vx * RESTITUTION; }
    if (o.y + o.h > height){
      o.y = height - o.h;
      o.vy = -o.vy * RESTITUTION;
      if (Math.abs(o.vy) < 0.8) o.vy = 0;
    }
    if (o.y < 0){ o.y = 0; o.vy = 0; }
  }

  for (let i=0;i<objects.length;i++){
    for (let j=i+1;j<objects.length;j++){
      const a = objects[i], b = objects[j];
      if (a._remove || b._remove) continue;
      if (hitOverlap(a,b)){
        const overlap = getHitOverlap(a,b);
        if (!overlap) continue;
        if (Math.abs(overlap.x) < Math.abs(overlap.y)){
          const sep = overlap.x;
          a.x -= sep/2;
          b.x += sep/2;
          const vx1 = a.vx, vx2 = b.vx;
          a.vx = vx2 * RESTITUTION;
          b.vx = vx1 * RESTITUTION;
        } else {
          const sep = overlap.y;
          a.y -= sep/2;
          b.y += sep/2;
          const vy1 = a.vy, vy2 = b.vy;
          a.vy = vy2 * RESTITUTION;
          b.vy = vy1 * RESTITUTION;
        }

        // SISTEMA DE FUSIÓN + MARCADOR DE PUNTOS
        if (a.level === b.level) {
          a._remove = true;
          b._remove = true;
          
          const midX = (a.x + a.w/2 + b.x + b.w/2) / 2;
          const midY = (a.y + a.h/2 + b.y + b.h/2) / 2;
          const nextLvl = a.level + 1;
          
          if (nextLvl <= MAX_LEVEL) {
            createCube(nextLvl, midX - VISUAL_SIZE[nextLvl]/2, midY - VISUAL_SIZE[nextLvl]/2);
            
            // LÓGICA DE PUNTOS
            puntaje += nextLvl * 10; 
            const displayPuntos = document.getElementById("puntos");
            if (displayPuntos) {
              displayPuntos.textContent = puntaje;
            }
            
            if (nextLvl === MAX_LEVEL) {
              triggerWin(); 
            }
          }
        }
      }
    }
  }
}

// ---------- game loop / update ----------
function update(timestamp){
  if (!lastTime) lastTime = timestamp;
  let dt = (timestamp - lastTime) / 16.666;
  if (dt > 3) dt = 3; 
  lastTime = timestamp;

  ctx.clearRect(0,0,width,height);
  step(dt);
  objects = objects.filter(o => !o._remove);

  for (let o of objects){
    if (images[o.level]) {
      ctx.drawImage(images[o.level], o.x, o.y, o.w, o.h);
    } else {
      ctx.fillStyle = "#ff5722";
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = "white";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.fillText("L" + o.level, o.x + o.w/2, o.y + o.h/2 + 5);
    }
  }

  requestAnimationFrame(update);
}
requestAnimationFrame(update);

function triggerWin(){
  win = true;
  winOverlay.style.display = "flex";
}

function resetGame(){
  objects = [];
  win = false;
  winOverlay.style.display = "none";
  nextLevel = randomSpawnLevel();
  
  puntaje = 0;
  const displayPuntos = document.getElementById("puntos");
  if (displayPuntos) displayPuntos.textContent = puntaje;
  
  renderNextPreview();
}

if (btnReset) btnReset.addEventListener('click', resetGame);
if (btnWinReset) btnWinReset.addEventListener('click', resetGame);
