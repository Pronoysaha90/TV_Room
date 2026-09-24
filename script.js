// ---------- basic setup ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0f14);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- helper: build a canvas texture procedurally ----------
function makeTexture(draw, w = 256, h = 256) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// wood texture (TV stand / cabinet)
const woodTexture = makeTexture((ctx, w, h) => {
  ctx.fillStyle = '#5b3a29';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.08})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    const y = Math.random() * h;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(w * 0.3, y + Math.random() * 10 - 5, w * 0.7, y + Math.random() * 10 - 5, w, y);
    ctx.stroke();
  }
});
woodTexture.repeat.set(2, 1);

// wall texture
const wallTexture = makeTexture((ctx, w, h) => {
  ctx.fillStyle = '#cdd3da';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
});
wallTexture.repeat.set(4, 2);

// floor texture (tiles)
const floorTexture = makeTexture((ctx, w, h) => {
  const tile = 32;
  for (let y = 0; y < h; y += tile) {
    for (let x = 0; x < w; x += tile) {
      const shade = ((x / tile + y / tile) % 2 === 0) ? '#2e2b28' : '#3a3632';
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, tile, tile);
    }
  }
});
floorTexture.repeat.set(6, 6);

// ceiling texture
const ceilTexture = makeTexture((ctx, w, h) => {
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(0, 0, w, h);
});

// carpet texture
const carpetTexture = makeTexture((ctx, w, h) => {
  ctx.fillStyle = '#7a1f2b';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#c9a24b';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.strokeStyle = 'rgba(201,162,75,0.4)';
  ctx.lineWidth = 2;
  for (let i = 30; i < w - 30; i += 20) { ctx.strokeRect(i, i, w - 2 * i, h - 2 * i); }
});

// sofa fabric texture
const sofaTexture = makeTexture((ctx, w, h) => {
  ctx.fillStyle = '#33506b';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < h; i += 10) { ctx.fillRect(0, i, w, 4); }
});

// curtain texture
const curtainTexture = makeTexture((ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#7d1f3f'); g.addColorStop(0.5, '#9e2c52'); g.addColorStop(1, '#7d1f3f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 3;
  for (let x = 0; x < w; x += 14) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
});

// painting texture (bonus wall art)
const paintingTexture = makeTexture((ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#ffb74d'); g.addColorStop(0.5, '#ff7043'); g.addColorStop(1, '#4a148c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.arc(w * 0.7, h * 0.3, 40, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, h * 0.7, w, h * 0.3);
});

// ---------- Room ----------
const ROOM_W = 12, ROOM_H = 5, ROOM_D = 12;
const roomMaterials = [
  new THREE.MeshStandardMaterial({ map: wallTexture, side: THREE.BackSide }), // +x
  new THREE.MeshStandardMaterial({ map: wallTexture, side: THREE.BackSide }), // -x
  new THREE.MeshStandardMaterial({ map: ceilTexture, side: THREE.BackSide }), // +y ceiling
  new THREE.MeshStandardMaterial({ map: floorTexture, side: THREE.BackSide }), // -y floor
  new THREE.MeshStandardMaterial({ map: wallTexture, side: THREE.BackSide }), // +z
  new THREE.MeshStandardMaterial({ map: wallTexture, side: THREE.BackSide })  // -z
];
const room = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D), roomMaterials);
room.position.y = ROOM_H / 2;
scene.add(room);

// carpet
const carpet = new THREE.Mesh(
  new THREE.PlaneGeometry(4, 3),
  new THREE.MeshStandardMaterial({ map: carpetTexture })
);
carpet.rotation.x = -Math.PI / 2;
carpet.position.set(0, 0.01, 0.5);
scene.add(carpet);

// curtains beside a "window" wall section
const curtainGeo = new THREE.PlaneGeometry(1.2, 3.2);
const curtainMat = new THREE.MeshStandardMaterial({ map: curtainTexture, side: THREE.DoubleSide });
const curtainL = new THREE.Mesh(curtainGeo, curtainMat);
curtainL.position.set(-ROOM_W / 2 + 0.05, 2.2, 2);
curtainL.rotation.y = Math.PI / 2;
scene.add(curtainL);
const curtainR = curtainL.clone();
curtainR.position.z = 4.2;
scene.add(curtainR);

// wall painting (bonus decor)
const painting = new THREE.Mesh(
  new THREE.PlaneGeometry(1.4, 1.0),
  new THREE.MeshStandardMaterial({ map: paintingTexture })
);
painting.position.set(ROOM_W / 2 - 0.06, 2.6, -2);
painting.rotation.y = -Math.PI / 2;
scene.add(painting);
const paintingFrame = new THREE.Mesh(
  new THREE.BoxGeometry(1.5, 1.1, 0.04),
  new THREE.MeshStandardMaterial({ color: 0x2a1a0f })
);
paintingFrame.position.set(ROOM_W / 2 - 0.08, 2.6, -2);
paintingFrame.rotation.y = -Math.PI / 2;
scene.add(paintingFrame);

// ceiling lamp (bonus extra lighting fixture)
const lampCord = new THREE.Mesh(
  new THREE.CylinderGeometry(0.01, 0.01, 0.8, 6),
  new THREE.MeshStandardMaterial({ color: 0x222222 })
);
lampCord.position.set(2.5, ROOM_H - 0.4, 1);
scene.add(lampCord);
const lampShade = new THREE.Mesh(
  new THREE.ConeGeometry(0.3, 0.35, 24, 1, true),
  new THREE.MeshStandardMaterial({ color: 0xfff4d6, side: THREE.DoubleSide, emissive: 0x664c1a })
);
lampShade.position.set(2.5, ROOM_H - 0.85, 1);
scene.add(lampShade);
const ceilingLamp = new THREE.PointLight(0xffe9b3, 0.6, 6);
ceilingLamp.position.set(2.5, ROOM_H - 0.9, 1);
scene.add(ceilingLamp);

// ---------- TV stand + cabinet drawers ----------
const standGeo = new THREE.BoxGeometry(2.6, 0.9, 0.8);
const standMat = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.8, metalness: 0.05 });
const stand = new THREE.Mesh(standGeo, standMat);
stand.position.set(0, 0.45, -ROOM_D / 2 + 0.6);
scene.add(stand);

const drawerMat = new THREE.MeshStandardMaterial({ color: 0x3d2718, roughness: 0.7 });
for (let i = -1; i <= 1; i++) {
  const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.35, 0.05), drawerMat);
  drawer.position.set(i * 0.85, 0.45, -ROOM_D / 2 + 1.0);
  scene.add(drawer);
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.03, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.8 })
  );
  handle.position.set(i * 0.85, 0.4, -ROOM_D / 2 + 1.03);
  scene.add(handle);
}

// speakers beside the TV
const speakerMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.6 });
[-1.55, 1.55].forEach((x) => {
  const spk = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), speakerMat);
  spk.position.set(x, 0.45, -ROOM_D / 2 + 0.6);
  scene.add(spk);
  for (let r = 0; r < 3; r++) {
    const cone = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), new THREE.MeshStandardMaterial({ color: 0x222 }));
    cone.position.set(x, 0.25 + r * 0.28, -ROOM_D / 2 + 0.76);
    scene.add(cone);
  }
});

// sofa
function buildSofa(x, z, rotY) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.9), new THREE.MeshStandardMaterial({ map: sofaTexture }));
  base.position.y = 0.3;
  group.add(base);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.25), new THREE.MeshStandardMaterial({ map: sofaTexture }));
  back.position.set(0, 0.7, -0.32);
  group.add(back);
  [-1.05, 1.05].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.9), new THREE.MeshStandardMaterial({ map: sofaTexture }));
    arm.position.set(ax, 0.45, 0);
    group.add(arm);
  });
  group.position.set(x, 0, z);
  group.rotation.y = rotY;
  scene.add(group);
}
buildSofa(0, 3.6, Math.PI);

// ---------- TV screen (custom shader) ----------
const channelTextures = [
  makeTexture((ctx, w, h) => { // channel 1: color bars
    const colors = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
    const bw = w / colors.length;
    colors.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(i * bw, 0, bw, h * 0.75); });
    ctx.fillStyle = '#111'; ctx.fillRect(0, h * 0.75, w, h * 0.25);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Arial'; ctx.fillText('CH 1 - TEST PATTERN', 10, h - 15);
  }),
  makeTexture((ctx, w, h) => { // channel 2: news-ish gradient
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#0b3d91'); g.addColorStop(1, '#1e88e5');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 26px Arial'; ctx.fillText('BREAKING NEWS', 20, 50);
    ctx.fillStyle = '#ffd54f'; ctx.fillRect(0, h - 40, w, 40);
    ctx.fillStyle = '#111'; ctx.font = '16px Arial'; ctx.fillText('CSE444 Live Update...', 15, h - 14);
  }),
  makeTexture((ctx, w, h) => { // channel 3: sports scoreboard
    ctx.fillStyle = '#0a5d1e'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < h; i += 20) { ctx.fillStyle = i % 40 === 0 ? '#0c6b22' : '#0a5d1e'; ctx.fillRect(0, i, w, 20); }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial'; ctx.fillText('TEAM A  2 - 1  TEAM B', 15, 40);
    ctx.fillStyle = '#fff'; ctx.font = '16px Arial'; ctx.fillText("70'  Live", 15, h - 15);
  })
];
let channelIndex = 0;
let tvOn = true;

const screenGeo = new THREE.PlaneGeometry(2.2, 1.25);
const screenUniforms = {
  uTexture: { value: channelTextures[0] },
  uTime: { value: 0.0 },
  uOn: { value: 1.0 }
};
const screenMaterial = new THREE.ShaderMaterial({
  uniforms: screenUniforms,
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uTime;
    uniform float uOn;
    varying vec2 vUv;
    void main() {
      vec4 tex = texture2D(uTexture, vUv);
      float scan = sin(vUv.y * 300.0 - uTime * 6.0) * 0.04;
      float dist = distance(vUv, vec2(0.5));
      float vignette = smoothstep(0.75, 0.25, dist);
      float flicker = 0.97 + 0.03 * sin(uTime * 40.0);
      vec3 color = (tex.rgb - scan) * flicker;
      color *= mix(0.85, 1.05, vignette);
      color += 0.03;
      color *= uOn;
      gl_FragColor = vec4(color, 1.0);
    }
  `
});
const screen = new THREE.Mesh(screenGeo, screenMaterial);
screen.position.set(0, 1.35, -ROOM_D / 2 + 0.62);
scene.add(screen);

// TV frame / bezel with buttons
const bezel = new THREE.Mesh(
  new THREE.BoxGeometry(2.4, 1.4, 0.06),
  new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.6 })
);
bezel.position.set(0, 1.35, -ROOM_D / 2 + 0.58);
scene.add(bezel);

for (let i = 0; i < 3; i++) {
  const btn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8),
    new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7 })
  );
  btn.rotation.x = Math.PI / 2;
  btn.position.set(1.0 + i * 0.08, 0.75, -ROOM_D / 2 + 0.61);
  scene.add(btn);
}

// TV remote on the stand
const remote = new THREE.Mesh(
  new THREE.BoxGeometry(0.18, 0.04, 0.5),
  new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.5 })
);
remote.position.set(0.9, 0.92, -ROOM_D / 2 + 0.6);
scene.add(remote);

// ---------- Lighting ----------
const ambient = new THREE.AmbientLight(0x404050, 0.5);
scene.add(ambient);

// orbiting point light (MUST-DO: rotates around the TV)
const pointLight = new THREE.PointLight(0xfff2cc, 1.2, 15);
pointLight.position.set(2, 2.2, -2);
scene.add(pointLight);

const lightHelper = new THREE.Mesh(
  new THREE.SphereGeometry(0.08, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0xfff2cc })
);
scene.add(lightHelper);

// warm spotlight glow on the TV (bonus extra lighting)
const tvSpot = new THREE.SpotLight(0x99ccff, 0.8, 6, Math.PI / 6, 0.5);
tvSpot.position.set(0, 3, -ROOM_D / 2 + 2);
tvSpot.target = screen;
scene.add(tvSpot);
scene.add(tvSpot.target);

// ---------- Day / Night mood toggle (bonus) ----------
let isNight = false;
function applyMood() {
  if (isNight) {
    scene.background.set(0x03040a);
    ambient.color.set(0x1a1e3a);
    ambient.intensity = 0.25;
  } else {
    scene.background.set(0x0d0f14);
    ambient.color.set(0x404050);
    ambient.intensity = 0.5;
  }
}

// ---------- Mouse interaction: light orbits the TV ----------
let mouseX = 0.5; // normalized 0..1
window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX / window.innerWidth;
});

// ---------- HUD helpers ----------
const channelBadge = document.getElementById('channelBadge');
const powerBadge = document.getElementById('powerBadge');
function updateHUD() {
  channelBadge.textContent = 'CH ' + (channelIndex + 1);
  powerBadge.textContent = 'TV: ' + (tvOn ? 'ON' : 'OFF');
  powerBadge.classList.toggle('off', !tvOn);
}
updateHUD();

// ---------- Keyboard interaction ----------
const keys = {};
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;

  if (k === 't') {
    channelIndex = (channelIndex + 1) % channelTextures.length;
    screenUniforms.uTexture.value = channelTextures[channelIndex];
    updateHUD();
  }
  if (['1', '2', '3'].includes(k)) {
    channelIndex = parseInt(k, 10) - 1;
    screenUniforms.uTexture.value = channelTextures[channelIndex];
    updateHUD();
  }
  if (k === ' ') {
    tvOn = !tvOn;
    tvSpot.intensity = tvOn ? 0.8 : 0.05;
    updateHUD();
  }
  if (k === 'n') {
    isNight = !isNight;
    applyMood();
  }
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

let yaw = 0;
const MOVE_SPEED = 0.06;
const TURN_SPEED = 0.03;
const BOUND = ROOM_W / 2 - 0.5, BOUND_Z = ROOM_D / 2 - 0.5;

function updateCamera() {
  if (keys['a'] || keys['arrowleft']) yaw += TURN_SPEED;
  if (keys['d'] || keys['arrowright']) yaw -= TURN_SPEED;

  const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  if (keys['w'] || keys['arrowup']) camera.position.addScaledVector(dir, -MOVE_SPEED);
  if (keys['s'] || keys['arrowdown']) camera.position.addScaledVector(dir, MOVE_SPEED);

  camera.position.x = Math.max(-BOUND, Math.min(BOUND, camera.position.x));
  camera.position.z = Math.max(-BOUND_Z, Math.min(BOUND_Z, camera.position.z));

  camera.rotation.set(0, yaw, 0);
}

// ---------- Loading screen simulation ----------
const loader = document.getElementById('loader');
const loaderProgress = document.getElementById('loaderProgress');
let progress = 0;
const loadInterval = setInterval(() => {
  progress += 8 + Math.random() * 12;
  if (progress >= 100) {
    progress = 100;
    clearInterval(loadInterval);
    setTimeout(() => loader.classList.add('hidden'), 250);
  }
  loaderProgress.style.width = progress + '%';
}, 90);

// ---------- Animation loop ----------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // MUST-DO: light orbits the TV, angle driven by mouse X
  const angle = mouseX * Math.PI * 2;
  const radius = 3;
  pointLight.position.x = Math.cos(angle) * radius;
  pointLight.position.z = -ROOM_D / 2 + 0.6 + Math.sin(angle) * radius;
  pointLight.position.y = 2.2 + Math.sin(t * 0.5) * 0.3;
  lightHelper.position.copy(pointLight.position);
  pointLight.intensity = tvOn ? 1.2 : 0.5;

  // MUST-DO: auto channel switch every 6 seconds
  if (tvOn) {
    const autoIndex = Math.floor(t / 6) % channelTextures.length;
    if (autoIndex !== channelIndex) {
      channelIndex = autoIndex;
      screenUniforms.uTexture.value = channelTextures[channelIndex];
      updateHUD();
    }
  }
  screenUniforms.uTime.value = t;
  screenUniforms.uOn.value = tvOn ? 1.0 : 0.03;

  // gentle lamp flicker for realism
  ceilingLamp.intensity = 0.6 + Math.sin(t * 3.0) * 0.03;

  updateCamera();
  renderer.render(scene, camera);
}
animate();
