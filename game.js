/**
 * ============================================================================
 * HALCYON // 2000 — MAIN GAME ENGINE (ES MODULE)
 * ============================================================================
 * Whimsical Y2K retro pixel fruit-slicing experience with webcam hand tracking,
 * tactile particle burst physics, synth audio visualizer, and custom music player.
 *
 * Architecture:
 *   - Section 0: Imports, MediaPipe Dynamic Loader, Constants & DOM Cache
 *   - Section 1: Pixel Art Sprites & Dual-Half Slicing Renderer
 *   - Section 2: High-Performance Particle Engine (Sparkles, Hearts, Confetti)
 *   - Section 3: Magic Wand Trail Renderer (Rainbow Ribbon)
 *   - Section 4: Game Targets (Fruit Physics, Floaty Arcs & Halves)
 *   - Section 5: Continuous Sweep Collision Detection (Line-to-Circle)
 *   - Section 6: Score Popups & Floating Retro Typography
 *   - Section 7: State Machine (Camera Setup, Start Screen, Gameplay, Game Over)
 *   - Section 8: Multi-Modal Input System (MediaPipe Vision + Mouse / Touch)
 *   - Section 9: Canvas Render Pipeline & Audio-Reactive Border Pulsing
 *   - Section 10: Persistent Music Player UI (Local, Stream & Procedural)
 *   - Section 11: Main Game Simulation Loop
 *   - Section 12: Initialization & Event Binding
 * ============================================================================
 */

import { AudioEngine } from './audio.js';

// ----------------------------------------------------------------------------
// MediaPipe Tasks-Vision Dynamic Import
// ----------------------------------------------------------------------------
let HandLandmarker = null;
let FilesetResolver = null;

try {
  const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18');
  HandLandmarker = vision.HandLandmarker;
  FilesetResolver = vision.FilesetResolver;
} catch (e) {
  console.warn('MediaPipe unavailable, using mouse/touch only:', e);
}

// ----------------------------------------------------------------------------
// Color Palette (Pastel 2000 Aesthetic)
// ----------------------------------------------------------------------------
const COLORS = {
  SAKURA: '#FFD1E8',
  LAVENDER: '#E2D1F9',
  MINT: '#D4F8E8',
  BUTTER: '#FFF3C4',
  CLOUD: '#FFFDF9',
  COCOA: '#5C3A58',
  PEACH: '#FFCBA4',
  ROSE: '#FFB7C5',
  PASTEL_CYCLE: ['#FFD1E8', '#E2D1F9', '#D4F8E8', '#FFF3C4', '#FFB7C5', '#FFCBA4']
};

// ----------------------------------------------------------------------------
// Cached DOM Elements
// ----------------------------------------------------------------------------
const elements = {
  cameraDialog: document.getElementById('camera-dialog'),
  cameraBtn: document.getElementById('camera-btn'),
  skipCameraBtn: document.getElementById('skip-camera-btn'),
  cameraLoader: document.getElementById('camera-loader'),
  startScreen: document.getElementById('start-screen'),
  modeToggle: document.getElementById('mode-toggle'),
  gameOverScreen: document.getElementById('game-over-screen'),
  finalScore: document.getElementById('final-score'),
  bestScore: document.getElementById('best-score'),
  peakCombo: document.getElementById('peak-combo'),
  hud: document.getElementById('hud'),
  scorePill: document.getElementById('score-pill'),
  scoreVal: document.getElementById('score-val'),
  bestPill: document.getElementById('best-pill'),
  bestVal: document.getElementById('best-val'),
  comboPill: document.getElementById('combo-pill'),
  comboVal: document.getElementById('combo-val'),
  livesPill: document.getElementById('lives-pill'),
  livesVal: document.getElementById('lives-val'),
  timerPill: document.getElementById('timer-pill'),
  timerVal: document.getElementById('timer-val'),
  feverOverlay: document.getElementById('fever-overlay'),
  musicWidget: document.getElementById('music-widget'),
  musicToggleBtn: document.getElementById('music-toggle-btn'),
  musicContent: document.getElementById('music-content'),
  musicTabs: document.getElementById('music-tabs'),
  tabLocal: document.getElementById('tab-local'),
  tabStream: document.getElementById('tab-stream'),
  tabBuiltin: document.getElementById('tab-builtin'),
  audioFileInput: document.getElementById('audio-file-input'),
  dropZone: document.getElementById('drop-zone'),
  fileName: document.getElementById('file-name'),
  streamUrl: document.getElementById('stream-url'),
  streamGoBtn: document.getElementById('stream-go-btn'),
  streamFrameContainer: document.getElementById('stream-frame-container'),
  playPauseBtn: document.getElementById('play-pause-btn'),
  loopBtn: document.getElementById('loop-btn'),
  volumeSlider: document.getElementById('volume-slider'),
  nowPlaying: document.getElementById('now-playing'),
  webcam: document.getElementById('webcam'),
  gameCanvas: document.getElementById('gameCanvas'),
  startGameBtn: document.getElementById('start-game-btn'),
  restartGameBtn: document.getElementById('restart-game-btn'),
  durationPicker: document.getElementById('duration-picker'),
  customDuration: document.getElementById('custom-duration'),
  customDurationBtn: document.getElementById('custom-duration-btn'),
  bestBadgeScore: document.getElementById('best-badge-score'),
  snapPolaroidBtn: document.getElementById('snap-polaroid-btn'),
  downloadPolaroidBtn: document.getElementById('download-polaroid-btn'),
  polaroidCanvas: document.getElementById('polaroid-canvas'),
  polaroidPreview: document.getElementById('polaroid-preview'),
  rankTitle: document.getElementById('rank-title')
};

const canvas = elements.gameCanvas;
const ctx = canvas.getContext('2d');
const video = elements.webcam;


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1: PIXEL ART SPRITES & RENDERERS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Color mappings for each fruit and bomb sprite.
 * '.' or ' ' is treated as transparent.
 */
const SPRITE_COLORS = {
  strawberry: {
    r: '#FFB7C5',
    R: '#FF8FA3',
    s: '#FFF3C4',
    g: '#A8E6CF',
    G: '#7BC8A4',
    h: '#FFD1E8'
  },
  peach: {
    p: '#FFCBA4',
    P: '#FFB088',
    h: '#FFD1E8',
    w: '#FFFDF9',
    W: '#FFF3C4'
  },
  boba: {
    c: '#E2D1F9',
    C: '#C9B1E8',
    l: '#FFFDF9',
    s: '#FFB7C5',
    b: '#5C3A58',
    t: '#FFCBA4'
  },
  dragonfruit: {
    m: '#FFB7C5',
    M: '#FF8FA3',
    w: '#FFFDF9',
    d: '#5C3A58',
    g: '#A8E6CF'
  },
  starfruit: {
    y: '#FFF3C4',
    Y: '#FFE082',
    w: '#FFFDF9',
    s: '#FFD1E8'
  },
  raincloud: {
    c: '#C9B8DB',
    C: '#A99BC4',
    d: '#8A7A9E',
    e: '#5C3A58',
    y: '#FFF3C4',
    w: '#FFFDF9'
  }
};

/**
 * Hand-crafted 16x16 pixel sprites designed specifically for high-contrast
 * pastel rendering and crisp split-in-half slicing animations.
 */
const SPRITE_DATA = {
  strawberry: [
    '.....gg..gg.....',
    '....gGGGgGGg....',
    '...ggGggGggGg...',
    '....hrRRRRrh....',
    '...hrRsRRsRrh...',
    '..hrRRRRRRRRrh..',
    '..rRRsRRRsRRRr..',
    '..rRRRRRRRRRRr..',
    '..rRsRRRsRRRRr..',
    '..rRRRRRRRRRRr..',
    '...rRRsRRRsRr...',
    '...rRRRRRRRRr...',
    '....rRsRRRr.....',
    '.....rRRRr......',
    '......rRr.......',
    '.......r........'
  ],

  peach: [
    '.....pp....pp...',
    '...pppp....pppp.',
    '..ppwwpp..pppppp',
    '.ppwwwwp..pppppp',
    '.ppwwppp..pphhpP',
    'pppppppppppphhPP',
    'pppppppppppphhPP',
    'pppppppppppphhPP',
    'ppppppppppppppPP',
    'ppppppppppppppPP',
    '.ppppppppppppPP.',
    '.pppppppppppPPP.',
    '..pppppppppPPP..',
    '...ppppppppPP...',
    '....pPPPPPPP....',
    '......PPPPP.....'
  ],

  boba: [
    '........ss......',
    '.......ss.......',
    '......ss........',
    '.....ss.........',
    '...llllllllll...',
    '..llllllllllll..',
    '..cccccccccccc..',
    '..ccttttttttCC..',
    '..ctttttttttCC..',
    '..ctttttttttCC..',
    '..cttbtttbtCCC..',
    '...ctbtttbtCC...',
    '...cttbbttCCC...',
    '...cbbbbbbCCC...',
    '....cbbbbCCC....',
    '.....CCCCCC.....'
  ],

  dragonfruit: [
    '.....gg...gg....',
    '...ggmmmmmmmgg..',
    '..gmMwwwwwwwMmg.',
    '.gmMwwwwwwwwwMmg',
    '.gMwwdwwwwwdwwMg',
    'gmwwdwwwwwwwwwwm',
    'gMwwwwwwwdwwdwwM',
    'gMwwdwwwwwwwwwwM',
    'gMwwwwwwwwwdwwwM',
    'gMwwwdwwwwwwdwwM',
    '.MwwwwwwwwwwwwwM',
    '.gMwwdwwwwwdwwMg',
    '..gmMwwwwwwwMmg.',
    '...ggMMMMMMMMg..',
    '.....ggMMMMgg...',
    '.......MMMM.....'
  ],

  starfruit: [
    '.......ww.......',
    '.......yy.......',
    '......yyyy......',
    '.....yyyyyy.....',
    '....yyyyyyyy....',
    'wwyyyyyyyyyyyyww',
    '.wyyyyyyyyyyyyw.',
    '..yyyyyyyyyyyy..',
    '...yyyssssyyyY..',
    '..yyyyYyyyyyyY..',
    '..yyyyYYyyyyYY..',
    '.yyyyYY..yyYYyy.',
    '.yyYYY....YYYyy.',
    'wYYY........YYYw',
    'wYY..........YYw',
    'ww............ww'
  ],

  raincloud: [
    '....wwww........',
    '...wccccw...www.',
    '..wccccccw.wcccw',
    '.wccccccccwccccc',
    '.ccccccccccccCcc',
    'cccecccccecccCcc',
    'cccccccccCcccccc',
    'ccccceeeecCccccc',
    '.CccccccccCdddC.',
    '..dddddddddddd..',
    '.....yy.........',
    '....yyyy........',
    '......yy........',
    '.....yy.........',
    '....yy..........',
    '...y............'
  ]
};

/**
 * Draws a complete pixel sprite centered at (x, y) with scaling and rotation.
 */
function drawPixelSprite(targetCtx, type, x, y, size, rotation) {
  const data = SPRITE_DATA[type];
  const colors = SPRITE_COLORS[type];
  if (!data || !colors) return;

  targetCtx.save();
  targetCtx.translate(x, y);
  targetCtx.rotate(rotation);

  const rows = data.length;
  const cols = Math.max(...data.map(r => r.length));
  const pxSize = size / Math.max(rows, cols);
  const offX = -(cols * pxSize) / 2;
  const offY = -(rows * pxSize) / 2;

  for (let r = 0; r < rows; r++) {
    const rowStr = data[r];
    for (let c = 0; c < rowStr.length; c++) {
      const ch = rowStr[c];
      if (ch === '.' || ch === ' ') continue;
      targetCtx.fillStyle = colors[ch] || '#FF00FF';
      targetCtx.fillRect(offX + c * pxSize, offY + r * pxSize, pxSize + 0.5, pxSize + 0.5);
    }
  }

  targetCtx.restore();
}

/**
 * Draws either the left half (isRight = false) or right half (isRight = true)
 * of a sliced fruit sprite for dynamic post-slice physics.
 */
function drawPixelSpriteHalf(targetCtx, type, x, y, size, rotation, isRight) {
  const data = SPRITE_DATA[type];
  const colors = SPRITE_COLORS[type];
  if (!data || !colors) return;

  targetCtx.save();
  targetCtx.translate(x, y);
  targetCtx.rotate(rotation);

  const rows = data.length;
  const cols = Math.max(...data.map(r => r.length));
  const pxSize = size / Math.max(rows, cols);
  const offX = -(cols * pxSize) / 2;
  const offY = -(rows * pxSize) / 2;
  const mid = Math.floor(cols / 2);

  const startCol = isRight ? mid : 0;
  const endCol = isRight ? cols : mid;

  for (let r = 0; r < rows; r++) {
    const rowStr = data[r];
    const maxCol = Math.min(endCol, rowStr.length);
    for (let c = startCol; c < maxCol; c++) {
      const ch = rowStr[c];
      if (ch === '.' || ch === ' ') continue;
      targetCtx.fillStyle = colors[ch] || '#FF00FF';
      targetCtx.fillRect(offX + c * pxSize, offY + r * pxSize, pxSize + 0.5, pxSize + 0.5);
    }
  }

  // Draw slice highlight line along the inner cut plane
  targetCtx.fillStyle = COLORS.CLOUD;
  targetCtx.globalAlpha = 0.6;
  const cutX = isRight ? offX + mid * pxSize : offX + mid * pxSize - pxSize * 0.4;
  targetCtx.fillRect(cutX, offY + 2 * pxSize, pxSize * 0.5, (rows - 4) * pxSize);

  targetCtx.restore();
}

/**
 * Draws a subtle glowing radial aura behind interactive targets.
 */
function drawTargetAura(targetCtx, target) {
  targetCtx.save();
  const auraGrad = targetCtx.createRadialGradient(
    target.x, target.y, target.radius * 0.3,
    target.x, target.y, target.radius * 1.6
  );
  auraGrad.addColorStop(0, 'rgba(255, 209, 232, 0.45)');
  auraGrad.addColorStop(0.7, 'rgba(226, 209, 249, 0.2)');
  auraGrad.addColorStop(1, 'rgba(226, 209, 249, 0)');

  targetCtx.fillStyle = auraGrad;
  targetCtx.beginPath();
  targetCtx.arc(target.x, target.y, target.radius * 1.6, 0, Math.PI * 2);
  targetCtx.fill();
  targetCtx.restore();
}


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2: HIGH-PERFORMANCE PARTICLE SYSTEM
// ═════════════════════════════════════════════════════════════════════════════

const MAX_PARTICLES = 400;
let particles = [];

/**
 * Spawns a single particle into the active simulation pool.
 */
function spawnParticle(opts) {
  if (particles.length >= MAX_PARTICLES) {
    particles.shift();
  }
  particles.push({
    x: opts.x,
    y: opts.y,
    vx: opts.vx !== undefined ? opts.vx : (Math.random() - 0.5) * 4,
    vy: opts.vy !== undefined ? opts.vy : -(Math.random() * 3 + 1),
    gravity: opts.gravity !== undefined ? opts.gravity : 0.05,
    life: opts.life || 0.8,
    maxLife: opts.life || 0.8,
    size: opts.size || 4,
    color: opts.color || COLORS.SAKURA,
    type: opts.type || 'sparkle', // 'sparkle' | 'heart' | 'star' | 'confetti' | 'dust'
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: opts.rotSpeed !== undefined ? opts.rotSpeed : (Math.random() - 0.5) * 0.2
  });
}

/**
 * Radiates an explosion of sparkles, hearts, and stars around (x, y).
 */
function burstSparkles(x, y, count = 12) {
  const types = ['sparkle', 'heart', 'star'];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const speed = Math.random() * 4 + 2;
    spawnParticle({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: 0.06,
      life: 0.6 + Math.random() * 0.4,
      size: 4 + Math.random() * 4,
      color: COLORS.PASTEL_CYCLE[Math.floor(Math.random() * COLORS.PASTEL_CYCLE.length)],
      type: types[Math.floor(Math.random() * types.length)]
    });
  }
}

/**
 * Releases tumbling pastel square confetti subject to gravity.
 */
function burstConfetti(x, y, count = 20) {
  for (let i = 0; i < count; i++) {
    spawnParticle({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: -(Math.random() * 5 + 2),
      gravity: 0.12,
      life: 0.9 + Math.random() * 0.5,
      size: 5 + Math.random() * 4,
      color: COLORS.PASTEL_CYCLE[Math.floor(Math.random() * COLORS.PASTEL_CYCLE.length)],
      type: 'confetti',
      rotSpeed: (Math.random() - 0.5) * 0.35
    });
  }
}

/**
 * Spawns directional spark particles bursting along the slicing stroke vector.
 */
function burstSlice(x, y) {
  const dx = currentPos.x - prevPos.x;
  const dy = currentPos.y - prevPos.y;
  const strokeAngle = Math.atan2(dy, dx);
  const count = 10;

  for (let i = 0; i < count; i++) {
    const speed = Math.random() * 3.5 + 2;
    const spread = strokeAngle + (Math.random() - 0.5) * 1.4;
    spawnParticle({
      x,
      y,
      vx: Math.cos(spread) * speed,
      vy: Math.sin(spread) * speed,
      gravity: 0.08,
      life: 0.5 + Math.random() * 0.35,
      size: 3.5 + Math.random() * 3,
      color: COLORS.PASTEL_CYCLE[Math.floor(Math.random() * COLORS.PASTEL_CYCLE.length)],
      type: Math.random() < 0.6 ? 'sparkle' : 'star'
    });
  }
}

/**
 * Spawns a tactile puff of sparkles and cute hearts when UI elements are clicked.
 */
function tapSparkle(x, y) {
  for (let i = 0; i < 6; i++) {
    spawnParticle({
      x,
      y,
      vx: (Math.random() - 0.5) * 3.5,
      vy: -(Math.random() * 3 + 1),
      gravity: 0.08,
      life: 0.45 + Math.random() * 0.3,
      size: 3 + Math.random() * 3,
      color: COLORS.PASTEL_CYCLE[Math.floor(Math.random() * COLORS.PASTEL_CYCLE.length)],
      type: 'sparkle'
    });
  }
  for (let i = 0; i < 2; i++) {
    spawnParticle({
      x,
      y,
      vx: (Math.random() - 0.5) * 2.5,
      vy: -(Math.random() * 2 + 1),
      gravity: 0.04,
      life: 0.7,
      size: 4.5,
      color: COLORS.ROSE,
      type: 'heart'
    });
  }
}

/**
 * Updates positions, life decay, and rotations of active particles.
 */
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.life -= dt;
    p.rotation += p.rotSpeed;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

/**
 * Renders all active particles with type-specific pixel-art geometry.
 */
function renderParticles(targetCtx) {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const alpha = Math.max(0, p.life / p.maxLife);
    targetCtx.globalAlpha = alpha;
    targetCtx.fillStyle = p.color;

    targetCtx.save();
    targetCtx.translate(p.x, p.y);
    targetCtx.rotate(p.rotation);

    switch (p.type) {
      case 'sparkle':
        // Crisp cross (+)
        targetCtx.fillRect(-p.size / 2, -1, p.size, 2);
        targetCtx.fillRect(-1, -p.size / 2, 2, p.size);
        break;

      case 'heart':
        targetCtx.font = `${p.size * 3}px serif`;
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText('♥', 0, 0);
        break;

      case 'star':
        targetCtx.font = `${p.size * 2.8}px monospace`;
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText('✦', 0, 0);
        break;

      case 'confetti':
        targetCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        break;

      case 'dust':
        targetCtx.beginPath();
        targetCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        targetCtx.fill();
        break;
    }

    targetCtx.restore();
    targetCtx.globalAlpha = 1;
  }
}


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3: TRAIL RENDERER (MAGIC WAND RIBBON)
// ═════════════════════════════════════════════════════════════════════════════

let trailPoints = []; // Stores { x, y, time }
const TRAIL_MAX = 28;
const TRAIL_LIFETIME = 350; // Milliseconds
const WAND_PALETTES = {
  rainbow: [COLORS.SAKURA, COLORS.MINT, COLORS.BUTTER, COLORS.LAVENDER, COLORS.ROSE],
  sakura: ['#FFD1E8', '#FFB7C5', '#FF8FA3', '#FFCBA4', '#FFD1E8'],
  cyber: ['#D4F8E8', '#A8E6CF', '#7BC8A4', '#E2D1F9', '#D4F8E8']
};

/**
 * Appends the newest cursor or finger tip coordinate and prunes aged points.
 */
function updateTrail(x, y, now) {
  if (x > 0 && y > 0) {
    trailPoints.push({ x, y, time: now });
  }

  while (trailPoints.length > TRAIL_MAX) {
    trailPoints.shift();
  }

  trailPoints = trailPoints.filter(p => now - p.time < TRAIL_LIFETIME);
}

/**
 * Renders the multi-colored pastel ribbon trail with dynamic fading thickness.
 */
function renderTrail(targetCtx, now) {
  if (trailPoints.length < 2) return;

  for (let i = 1; i < trailPoints.length; i++) {
    const t = i / trailPoints.length; // 0 = tail, 1 = tip
    const age = (now - trailPoints[i].time) / TRAIL_LIFETIME;

    const palette = WAND_PALETTES[selectedWand] || WAND_PALETTES.rainbow;
    targetCtx.strokeStyle = palette[i % palette.length];
    targetCtx.lineWidth = 2 + t * 10;
    targetCtx.globalAlpha = Math.max(0, (1 - age) * 0.75 * t);
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';

    targetCtx.beginPath();
    targetCtx.moveTo(trailPoints[i - 1].x, trailPoints[i - 1].y);
    targetCtx.lineTo(trailPoints[i].x, trailPoints[i].y);
    targetCtx.stroke();
  }

  targetCtx.globalAlpha = 1;

  // Occasional stardust sparkle emission from newest trail point
  if (trailPoints.length > 3 && Math.random() < 0.3) {
    const tip = trailPoints[trailPoints.length - 1];
    spawnParticle({
      x: tip.x,
      y: tip.y,
      type: 'sparkle',
      size: 3,
      life: 0.4,
      color: (WAND_PALETTES[selectedWand] || WAND_PALETTES.rainbow)[Math.floor(Math.random() * (WAND_PALETTES[selectedWand] || WAND_PALETTES.rainbow).length)],
      gravity: -0.02,
      vx: (Math.random() - 0.5) * 2,
      vy: -(Math.random() * 1.5)
    });
  }
}


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4: GAME TARGETS & HALVES
// ═════════════════════════════════════════════════════════════════════════════

let targets = [];
let slicedHalves = [];

const FRUIT_TYPES = ['strawberry', 'peach', 'boba', 'dragonfruit', 'starfruit'];

/**
 * Launches a new fruit or raincloud bomb upward in a floaty parabolic trajectory.
 */
function spawnTarget(type) {
  const baseSize = Math.min(68, Math.max(46, Math.min(canvas.width, canvas.height) * 0.11));
  const speedScale = Math.sqrt(Math.max(380, canvas.height) / 720);
  targets.push({
    type,
    x: canvas.width * (0.12 + Math.random() * 0.76),
    y: canvas.height + 40,
    vx: (Math.random() - 0.5) * (4.5 * speedScale),
    vy: -(11 * speedScale + Math.random() * (4.5 * speedScale)),
    radius: baseSize * 0.5,
    size: baseSize,
    rotation: 0,
    rotSpeed: (Math.random() - 0.5) * 0.08,
    gravity: 0.28 * speedScale,
    sliced: false,
    active: true
  });
}

/**
 * Manages periodic spawning of fruit clusters based on current game mode.
 */
function updateSpawner(dt) {
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    const isZen = gameMode === 'zen';
    const count = isZen
      ? 1 + Math.floor(Math.random() * 3)
      : 2 + Math.floor(Math.random() * 4);

    for (let i = 0; i < count; i++) {
      const isBomb = Math.random() < (isZen ? 0.15 : 0.25);
      const type = isBomb
        ? 'raincloud'
        : FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
      spawnTarget(type);
    }

    spawnTimer = isZen
      ? 1.5 + Math.random() * 0.7
      : 0.7 + Math.random() * 0.4;
  }
}

/**
 * Updates physics for all active, unsliced targets.
 */
function updateTargets(dt) {
  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i];
    t.x += t.vx;
    t.y += t.vy;
    t.vy += t.gravity * (feverMode ? 0.6 : 1);
    t.rotation += t.rotSpeed;

    // Prune objects falling below viewport bounds
    if (t.y > canvas.height + 80) {
      targets.splice(i, 1);
    }
  }
}

/**
 * Updates physics, spin, and fade-out of severed fruit halves.
 */
function updateSlicedHalves(dt) {
  for (let i = slicedHalves.length - 1; i >= 0; i--) {
    const h = slicedHalves[i];
    h.x += h.vx;
    h.y += h.vy;
    h.vy += 0.35;
    h.rotation += h.rotSpeed;
    h.life -= dt;

    if (h.life <= 0 || h.y > canvas.height + 80) {
      slicedHalves.splice(i, 1);
    }
  }
}


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 5: COLLISION DETECTION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Continuous line segment to circle collision check for fast flick accuracy.
 */
function lineCircleHit(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;
  const a = dx * dx + dy * dy;

  if (a < 0.001) {
    return (fx * fx + fy * fy) <= r * r;
  }

  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  let disc = b * b - 4 * a * c;

  if (disc < 0) return false;

  disc = Math.sqrt(disc);
  const t1 = (-b - disc) / (2 * a);
  const t2 = (-b + disc) / (2 * a);

  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
}

/**
 * Checks slice intersections for all live targets against cursor/hand velocity.
 */
function checkCollisions() {
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    if (t.sliced || !t.active) continue;

    // Primary hand/mouse
    if (inputActive) {
      const hitBySweep = lineCircleHit(prevPos.x, prevPos.y, currentPos.x, currentPos.y, t.x, t.y, t.radius);
      const hitByProximity = Math.hypot(currentPos.x - t.x, currentPos.y - t.y) <= (t.radius * 1.15);
      if (hitBySweep || hitByProximity) {
        sliceTarget(t);
        continue;
      }
    }

    // Secondary hand (dual slicing)
    if (secondActive) {
      const hitBySweep2 = lineCircleHit(secondPrevPos.x, secondPrevPos.y, secondPos.x, secondPos.y, t.x, t.y, t.radius);
      const hitByProximity2 = Math.hypot(secondPos.x - t.x, secondPos.y - t.y) <= (t.radius * 1.15);
      if (hitBySweep2 || hitByProximity2) {
        sliceTarget(t);
      }
    }
  }
}

/**
 * Executes gameplay state updates, audio triggers, and physics splits upon slice.
 */
function sliceTarget(t) {
  t.sliced = true;
  t.active = false;

  if (audio && typeof audio.playSFX === 'function') {
    audio.playSFX('whoosh');
  }

  // Spawn opposing halves flying apart
  slicedHalves.push(
    {
      type: t.type,
      x: t.x - 10,
      y: t.y,
      vx: t.vx - 3,
      vy: t.vy - 2,
      rotation: t.rotation,
      rotSpeed: -0.15,
      size: t.size,
      life: 1.2,
      maxLife: 1.2,
      isRight: false
    },
    {
      type: t.type,
      x: t.x + 10,
      y: t.y,
      vx: t.vx + 3,
      vy: t.vy - 2,
      rotation: t.rotation,
      rotSpeed: 0.15,
      size: t.size,
      life: 1.2,
      maxLife: 1.2,
      isRight: true
    }
  );

  if (t.type === 'raincloud') {
    // ------------------------------------------------------------------------
    // Raincloud Bomb Detonation
    // In timed/endless: -5 points + reset combo (no lives lost)
    // In classic chaos: lives system
    // ------------------------------------------------------------------------
    if (gameMode === 'chaos' && !isEndless) {
      lives--;
      updateLivesDisplay();
      if (lives <= 0) {
        triggerGameOver();
      }
    } else {
      score = Math.max(0, score - 5);
      combo = 0;
      comboTimer = 0;
    }

    shakeAmount = 15;
    flashAlpha = 0.5;

    if (audio && typeof audio.playSFX === 'function') {
      audio.playSFX('bomb');
    }

    addPopup(t.x, t.y, BOMB_TEXT, '#A99BC4');
    burstSparkles(t.x, t.y, 8);
  } else {
    // ------------------------------------------------------------------------
    // Fruit Sliced Successfully
    // ------------------------------------------------------------------------
    combo++;
    comboTimer = 0;
    maxCombo = Math.max(maxCombo, combo);

    const pts = feverMode ? 2 : 1;
    score += pts;

    if (elements.scorePill) {
      elements.scorePill.classList.remove('bump');
      void elements.scorePill.offsetWidth;
      elements.scorePill.classList.add('bump');
    }
    updateHUD();

    if (audio && typeof audio.playSFX === 'function') {
      audio.playSFX('slice');
      if (combo > 1 && combo % 3 === 0) {
        audio.playSFX('combo');
      }
    }

    if (combo >= 5 && !feverMode) {
      triggerFever();
    }

    const textFn = POPUP_TEXTS[Math.floor(Math.random() * POPUP_TEXTS.length)];
    addPopup(t.x, t.y - 20, textFn(pts), COLORS.SAKURA);

    burstSparkles(t.x, t.y, 10);
    burstConfetti(t.x, t.y, 15);
    burstSlice(t.x, t.y);
  }
}


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 6: SCORE POPUPS
// ═════════════════════════════════════════════════════════════════════════════

let scorePopups = [];

const POPUP_TEXTS = [
  (n) => `SLAY! +${n}`,
  (n) => `SWEET! +${n}`,
  (n) => `CUTE! +${n}`,
  (n) => `DREAMY ✦ +${n}`,
  (n) => `WHIMSY x${n} ♥`
];
const BOMB_TEXT = 'OOPS! ⛈️';

/**
 * Creates a floating pastel celebratory text at (x, y).
 */
function addPopup(x, y, text, color) {
  scorePopups.push({
    x,
    y,
    text,
    color: color || COLORS.SAKURA,
    life: 1.0,
    maxLife: 1.0,
    vy: -2.5
  });
}

/**
 * Drifts popups upward and reduces their opacity.
 */
function updateScorePopups(dt) {
  for (let i = scorePopups.length - 1; i >= 0; i--) {
    const p = scorePopups[i];
    p.y += p.vy;
    p.life -= dt;
    if (p.life <= 0) {
      scorePopups.splice(i, 1);
    }
  }
}

/**
 * Renders retro-styled outlined text for each active score popup.
 */
function renderPopups(targetCtx) {
  for (let i = 0; i < scorePopups.length; i++) {
    const p = scorePopups[i];
    const alpha = Math.max(0, p.life / p.maxLife);
    targetCtx.globalAlpha = alpha;
    targetCtx.fillStyle = p.color;
    targetCtx.font = "bold 16px 'Press Start 2P', monospace";
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';
    targetCtx.strokeStyle = COLORS.CLOUD;
    targetCtx.lineWidth = 4;

    targetCtx.strokeText(p.text, p.x, p.y);
    targetCtx.fillText(p.text, p.x, p.y);
    targetCtx.globalAlpha = 1;
  }
}


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 7: GAME STATE MACHINE
// ═════════════════════════════════════════════════════════════════════════════

let gameState = 'camera-setup'; // 'camera-setup' | 'start' | 'playing' | 'gameover'
let score = 0;
let combo = 0;
let maxCombo = 0;
let highScore = parseInt(localStorage.getItem('pastel_slice_best') || '0', 10);
let lives = 3;
let gameMode = 'zen'; // 'zen' | 'chaos'
let zenTimer = 60;
let feverMode = false;
let feverTimer = 0;
let comboTimer = 0;
let spawnTimer = 0;
let shakeAmount = 0;
let flashAlpha = 0;
let startPeach = null;
let restartTarget = null;
let gameDuration = 60;         // seconds, 0 = endless
let isEndless = false;
let selectedWand = 'rainbow';  // 'rainbow' | 'sakura' | 'cyber'
let selectedFilter = 'cotton'; // 'cotton' | 'gameboy' | 'natural'
let peaceCooldown = 0;         // peace sign easter egg cooldown timer

/**
 * Resets combo multiplier if no fruit has been sliced for 2 seconds.
 */
function updateCombo(dt) {
  comboTimer += dt;
  if (comboTimer > 2 && combo > 0) {
    combo = 0;
  }
}

/**
 * Handles Fever Mode rainbow overlay expiration.
 */
function updateFever(dt) {
  if (!feverMode) return;
  feverTimer -= dt;
  if (feverTimer <= 0) {
    feverMode = false;
    elements.feverOverlay.classList.add('hidden');
  }
}

/**
 * Engages Fever Mode with floatier gravity and 2x point multipliers.
 */
function triggerFever() {
  feverMode = true;
  feverTimer = 6;
  elements.feverOverlay.classList.remove('hidden');
  burstConfetti(canvas.width / 2, canvas.height * 0.3, 30);
}

/**
 * Ticks the 60-second timer for Zen mode.
 */
function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function updateZenTimer(dt) {
  if (isEndless) {
    zenTimer += dt;
    elements.timerVal.textContent = formatTime(zenTimer);
    return;
  }
  zenTimer -= dt;
  elements.timerVal.textContent = formatTime(zenTimer);
  if (zenTimer <= 0) {
    triggerGameOver();
  }
}

/**
 * Synchronizes score, combo, and active values to the heads-up display.
 */
function updateHUD() {
  if (elements.scoreVal) elements.scoreVal.textContent = score;
  if (elements.comboVal) elements.comboVal.textContent = combo > 0 ? `${combo}x` : '0';
  if (elements.bestVal) elements.bestVal.textContent = Math.max(score, highScore);
}

/**
 * Updates the heart symbols in the lives pill.
 */
function updateLivesDisplay() {
  const hearts = Array(3)
    .fill(0)
    .map((_, i) => (i < lives ? '♥' : '♡'))
    .join(' ');
  elements.livesVal.textContent = hearts;
}

/**
 * Checks whether a screen coordinate is inside an active modal dialog card.
 */
function isOverModalCard(x, y) {
  const cards = document.querySelectorAll('.overlay:not(.hidden) .pixel-card');
  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i].getBoundingClientRect();
    if (x >= rect.left - 15 && x <= rect.right + 15 && y >= rect.top - 15 && y <= rect.bottom + 15) {
      return true;
    }
  }
  return false;
}

/**
 * Calculates a non-obstructing position for floating modal targets (Start Peach / Restart Fruit).
 */
function getModalTargetPosition(cardSelector, defaultYFactor = 0.88) {
  const card = document.querySelector(cardSelector);
  const rect = card ? card.getBoundingClientRect() : null;

  if (rect && canvas.width >= 780) {
    // Float visibly on the right side of the card
    const x = Math.min(canvas.width - 55, Math.max(canvas.width * 0.82, rect.right + 65));
    const y = canvas.height * 0.5;
    return { x, y };
  } else if (rect && rect.bottom < canvas.height - 65) {
    // Float below the card
    const x = canvas.width / 2;
    const y = Math.min(canvas.height - 45, rect.bottom + 50);
    return { x, y };
  } else {
    const x = canvas.width >= 600 ? canvas.width * 0.82 : canvas.width * 0.5;
    const y = canvas.height * defaultYFactor;
    return { x, y };
  }
}

/**
 * Spawns the iconic bobbing Cloud Peach in a clear, visible area outside the start card.
 */
function spawnStartPeach() {
  const pos = getModalTargetPosition('#start-screen .start-card', 0.88);
  const baseSize = Math.min(84, Math.max(54, Math.min(canvas.width, canvas.height) * 0.14));
  startPeach = {
    type: 'peach',
    x: pos.x,
    y: pos.y,
    baseY: pos.y,
    vx: 0,
    vy: 0,
    radius: baseSize * 0.5,
    size: baseSize,
    rotation: 0,
    rotSpeed: 0.02,
    gravity: 0,
    sliced: false,
    active: true,
    bobPhase: 0
  };
}

/**
 * Updates the sinusoidal floating animation of the start peach.
 */
function updateStartPeach(dt) {
  if (!startPeach) return;
  startPeach.bobPhase += dt * 2.5;
  startPeach.y = startPeach.baseY + Math.sin(startPeach.bobPhase) * 16;
  startPeach.rotation += startPeach.rotSpeed;

  if (Math.random() < 0.08) {
    spawnParticle({
      x: startPeach.x + (Math.random() - 0.5) * 60,
      y: startPeach.y + (Math.random() - 0.5) * 60,
      type: 'sparkle',
      color: COLORS.SAKURA,
      size: 4,
      life: 0.5,
      gravity: -0.01
    });
  }
}

/**
 * Detects intentional slice strokes on the start peach (disabled when over the start menu card).
 */
function checkStartSlice() {
  if (!startPeach || !inputActive) return;

  // Never slice while interacting with the Start Card menu UI
  if (isOverModalCard(currentPos.x, currentPos.y) || isOverModalCard(prevPos.x, prevPos.y)) {
    return;
  }

  // Must be an intentional fast slicing swipe
  const dx = currentPos.x - prevPos.x;
  const dy = currentPos.y - prevPos.y;
  const movingFast = dx * dx + dy * dy >= 49;
  if (!movingFast) return;

  const hitBySweep = lineCircleHit(prevPos.x, prevPos.y, currentPos.x, currentPos.y, startPeach.x, startPeach.y, startPeach.radius);

  if (hitBySweep) {
    burstSparkles(startPeach.x, startPeach.y, 20);
    burstConfetti(startPeach.x, startPeach.y, 30);

    if (audio && typeof audio.playSFX === 'function') {
      audio.playSFX('slice');
    }

    startPeach = null;
    startGame();
  }
}

/**
 * Transitions from start menu to live gameplay session.
 */
function startGame() {
  elements.startScreen.classList.add('hidden');
  elements.hud.classList.remove('hidden');

  gameState = 'playing';
  score = 0;
  combo = 0;
  maxCombo = 0;
  comboTimer = 0;
  spawnTimer = 0;
  lives = 3;
  zenTimer = isEndless ? 0 : gameDuration;
  feverMode = false;
  peaceCooldown = 0;
  targets = [];
  slicedHalves = [];
  scorePopups = [];

  updateLivesDisplay();
  updateHUD();

  // Show timer for zen/endless, show lives for classic chaos
  if (gameMode === 'zen' || isEndless) {
    elements.timerPill.classList.remove('hidden');
    elements.livesPill.classList.add('hidden');
    elements.timerVal.textContent = formatTime(zenTimer);
  } else {
    elements.timerPill.classList.add('hidden');
    elements.livesPill.classList.remove('hidden');
  }
}

/**
 * Transitions from gameplay to game over presentation.
 */
function getRankTitle(score, maxCombo) {
  if (score >= 100) return 'Legendary Fruit Empress 👑';
  if (score >= 70) return 'Certified Fruit Fairy 🧚';
  if (score >= 50) return 'Pastel Samurai 🌸';
  if (score >= 30) return 'Slice Apprentice ✨';
  if (maxCombo >= 10) return 'Combo Wizard 🪄';
  if (score >= 15) return 'Snack Slicer 🍰';
  return 'Cloud Daydreamer ☁️';
}

function triggerGameOver() {
  gameState = 'gameover';
  elements.hud.classList.add('hidden');
  elements.feverOverlay.classList.add('hidden');
  elements.gameOverScreen.classList.remove('hidden');

  if (score > highScore) {
    highScore = score;
    try {
      localStorage.setItem('pastel_slice_best', highScore.toString());
    } catch (_) {}
  }

  if (elements.finalScore) elements.finalScore.textContent = score;
  if (elements.bestScore) elements.bestScore.textContent = highScore;
  if (elements.peakCombo) elements.peakCombo.textContent = `${maxCombo}x`;
  if (elements.rankTitle) elements.rankTitle.textContent = getRankTitle(score, maxCombo);
  if (elements.bestBadgeScore) elements.bestBadgeScore.textContent = highScore;

  // Reset polaroid state
  if (elements.downloadPolaroidBtn) elements.downloadPolaroidBtn.classList.add('hidden');
  if (elements.polaroidPreview) {
    elements.polaroidPreview.classList.add('hidden');
    elements.polaroidPreview.innerHTML = '';
  }

  feverMode = false;
  targets = [];

  spawnRestartTarget();
}

/**
 * Spawns the floating restart fruit in a clear area outside the game over card.
 */
function spawnRestartTarget() {
  const pos = getModalTargetPosition('#game-over-screen .gameover-card', 0.88);
  const baseSize = Math.min(84, Math.max(54, Math.min(canvas.width, canvas.height) * 0.14));
  restartTarget = {
    type: FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)],
    x: pos.x,
    y: pos.y,
    baseY: pos.y,
    vx: 0,
    vy: 0,
    radius: baseSize * 0.5,
    size: baseSize,
    rotation: 0,
    rotSpeed: 0.02,
    gravity: 0,
    sliced: false,
    active: true,
    bobPhase: 0
  };
}

/**
 * Updates floating bob animation for the restart fruit target.
 */
function updateRestartTarget(dt) {
  if (!restartTarget) return;
  restartTarget.bobPhase += dt * 2.5;
  restartTarget.y = restartTarget.baseY + Math.sin(restartTarget.bobPhase) * 16;
  restartTarget.rotation += restartTarget.rotSpeed;

  if (Math.random() < 0.08) {
    spawnParticle({
      x: restartTarget.x + (Math.random() - 0.5) * 60,
      y: restartTarget.y + (Math.random() - 0.5) * 60,
      type: 'star',
      color: COLORS.MINT,
      size: 4,
      life: 0.5,
      gravity: -0.01
    });
  }
}

/**
 * Detects intentional slice strokes on the restart fruit (disabled when interacting with the modal card).
 */
function checkRestartSlice() {
  if (!restartTarget || !inputActive) return;

  // Never slice if pointer is interacting with the Game Over modal card
  if (isOverModalCard(currentPos.x, currentPos.y) || isOverModalCard(prevPos.x, prevPos.y)) {
    return;
  }

  // Must be an intentional fast slicing swipe
  const dx = currentPos.x - prevPos.x;
  const dy = currentPos.y - prevPos.y;
  const movingFast = dx * dx + dy * dy >= 49;
  if (!movingFast) return;

  const hitBySweep = lineCircleHit(prevPos.x, prevPos.y, currentPos.x, currentPos.y, restartTarget.x, restartTarget.y, restartTarget.radius);

  if (hitBySweep) {
    burstSparkles(restartTarget.x, restartTarget.y, 20);
    burstConfetti(restartTarget.x, restartTarget.y, 30);

    if (audio && typeof audio.playSFX === 'function') {
      audio.playSFX('slice');
    }

    restartTarget = null;
    elements.gameOverScreen.classList.add('hidden');
    startGame();
  }
}


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 8: MULTI-MODAL INPUT SYSTEM
// ═════════════════════════════════════════════════════════════════════════════

let currentPos = { x: -100, y: -100 };
let prevPos = { x: -100, y: -100 };
let inputActive = false;
let usingWebcam = false;
let handLandmarker = null;
let webcamStream = null;
let secondPos = { x: -100, y: -100 };
let secondPrevPos = { x: -100, y: -100 };
let secondActive = false;
let peaceHoldStart = 0;
let peaceTriggered = false;

/**
 * Configures the MediaPipe Hand Landmarker GPU/WASM pipeline.
 */
async function setupHandTracking() {
  if (!FilesetResolver || !HandLandmarker) {
    console.warn('MediaPipe library modules not available.');
    return;
  }

  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
        delegate: 'GPU'
      },
      numHands: 2,
      runningMode: 'VIDEO'
    });
  } catch (err) {
    console.warn('Failed to load MediaPipe hand model:', err);
    handLandmarker = null;
  }
}

let lastInputSource = 'mouse';
let lastInputTime = 0;

function isPeaceSign(landmarks) {
  // Peace = index (8) & middle (12) extended, ring (16) & pinky (20) curled
  const indexTip = landmarks[8].y;
  const indexPip = landmarks[6].y;
  const middleTip = landmarks[12].y;
  const middlePip = landmarks[10].y;
  const ringTip = landmarks[16].y;
  const ringPip = landmarks[14].y;
  const pinkyTip = landmarks[20].y;
  const pinkyPip = landmarks[18].y;
  // Extended = tip above pip (y is inverted in screen coords)
  const indexExtended = indexTip < indexPip;
  const middleExtended = middleTip < middlePip;
  const ringCurled = ringTip > ringPip;
  const pinkyCurled = pinkyTip > pinkyPip;
  return indexExtended && middleExtended && ringCurled && pinkyCurled;
}

function detectHand(timestamp) {
  if (!handLandmarker || !webcamStream) return;
  if (video.readyState < 2) return;

  try {
    const results = handLandmarker.detectForVideo(video, timestamp);

    // Primary hand (hand 0)
    if (results.landmarks && results.landmarks.length > 0) {
      const lm = results.landmarks[0][8];
      prevPos = { ...currentPos };
      currentPos.x = (1 - lm.x) * canvas.width;
      currentPos.y = lm.y * canvas.height;
      inputActive = true;
      lastInputSource = 'hand';
      lastInputTime = performance.now();

      // Peace sign check on primary hand
      if (gameState === 'playing' && peaceCooldown <= 0 && isPeaceSign(results.landmarks[0])) {
        if (!peaceTriggered) {
          if (peaceHoldStart === 0) peaceHoldStart = performance.now();
          if (performance.now() - peaceHoldStart >= 500) {
            score += 5;
            peaceCooldown = 10;
            peaceTriggered = true;
            peaceHoldStart = 0;
            addPopup(currentPos.x, currentPos.y - 30, 'PEACE & LOVE +5 ✨', COLORS.MINT);
            burstSparkles(currentPos.x, currentPos.y, 18);
            burstConfetti(currentPos.x, currentPos.y, 20);
            if (audio && typeof audio.playSFX === 'function') audio.playSFX('combo');
          }
        }
      } else {
        peaceHoldStart = 0;
        peaceTriggered = false;
      }
    } else if (lastInputSource === 'hand') {
      if (performance.now() - lastInputTime > 160) {
        inputActive = false;
      }
      peaceHoldStart = 0;
      peaceTriggered = false;
    }

    // Secondary hand (hand 1) for dual slicing
    if (results.landmarks && results.landmarks.length > 1) {
      const lm2 = results.landmarks[1][8];
      secondPrevPos = { ...secondPos };
      secondPos.x = (1 - lm2.x) * canvas.width;
      secondPos.y = lm2.y * canvas.height;
      secondActive = true;
    } else {
      secondActive = false;
    }
  } catch (err) {
    console.debug('Hand tracking detection skipped frame:', err);
  }
}

/**
 * Common pointer handler for mouse and touch inputs.
 * Works seamlessly alongside webcam tracking at all times.
 */
function handlePointerMotion(clientX, clientY) {
  prevPos = { ...currentPos };
  currentPos = { x: clientX, y: clientY };
  inputActive = true;
  lastInputSource = 'mouse';
  lastInputTime = performance.now();
}

// Track mouse press state so hovering over menus never slices
let isMouseDown = false;

// Mouse events (drag or move slicing)
window.addEventListener('mousedown', (e) => {
  isMouseDown = true;
  if (e.target && e.target.closest('#music-widget, .pixel-btn, .pixel-input, .pixel-slider, .music-tabs, .tab-btn, .pixel-card')) {
    inputActive = false;
    return;
  }
  handlePointerMotion(e.clientX, e.clientY);
});

window.addEventListener('mousemove', (e) => {
  // If pointer is over any menu UI element, never slice while not playing
  if (e.target && e.target.closest('#music-widget, .pixel-btn, .pixel-input, .pixel-slider, .music-tabs, .tab-btn, .pixel-card')) {
    if (gameState !== 'playing') {
      inputActive = false;
      return;
    }
  }

  // When in menu screens, mouse must be held down (click-drag) outside UI to slice
  if (gameState !== 'playing' && !isMouseDown) {
    return;
  }

  handlePointerMotion(e.clientX, e.clientY);
});

window.addEventListener('mouseup', () => {
  isMouseDown = false;
  if (lastInputSource === 'mouse') {
    setTimeout(() => {
      if (lastInputSource === 'mouse' && performance.now() - lastInputTime > 120) {
        inputActive = false;
      }
    }, 120);
  }
});

// Touch events for mobile/tablet (never slice when interacting with menu cards)
window.addEventListener('touchstart', (e) => {
  if (e.target && e.target.closest('#music-widget, .pixel-btn, .pixel-input, .pixel-slider, .music-tabs, .tab-btn, .pixel-card')) {
    inputActive = false;
    return;
  }
  e.preventDefault();
  const t = e.touches[0];
  if (t) handlePointerMotion(t.clientX, t.clientY);
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  if (e.target && e.target.closest('#music-widget, .pixel-btn, .pixel-input, .pixel-slider, .music-tabs, .tab-btn, .pixel-card')) {
    inputActive = false;
    return;
  }
  e.preventDefault();
  const t = e.touches[0];
  if (t) handlePointerMotion(t.clientX, t.clientY);
}, { passive: false });

window.addEventListener('touchend', () => {
  if (lastInputSource === 'mouse') {
    setTimeout(() => {
      if (lastInputSource === 'mouse' && performance.now() - lastInputTime > 120) {
        inputActive = false;
      }
    }, 120);
  }
});


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 9: CANVAS RENDER PIPELINE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Dynamically resizes canvas buffer to fill the browser viewport.
 */
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const targetSize = Math.min(84, Math.max(54, Math.min(canvas.width, canvas.height) * 0.14));

  if (startPeach) {
    const pos = getModalTargetPosition('#start-screen .start-card', 0.88);
    startPeach.x = pos.x;
    startPeach.baseY = pos.y;
    startPeach.size = targetSize;
    startPeach.radius = targetSize * 0.5;
  }
  if (restartTarget) {
    const pos = getModalTargetPosition('#game-over-screen .gameover-card', 0.88);
    restartTarget.x = pos.x;
    restartTarget.baseY = pos.y;
    restartTarget.size = targetSize;
    restartTarget.radius = targetSize * 0.5;
  }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/**
 * Main rendering pipeline invoked on every requestAnimationFrame iteration.
 */
function render(timestamp) {
  ctx.imageSmoothingEnabled = false;

  // 1. BACKGROUND LAYER
  if (usingWebcam && video.readyState >= 2) {
    // Draw mirrored live webcam frame with boosted brightness & crisp contrast
    ctx.save();
    ctx.scale(-1, 1);
    ctx.filter = 'brightness(1.12) contrast(1.05)';
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    // Camera filter overlay based on selected style (lowered opacity for bright clarity)
    const filterOverlays = {
      cotton: [['rgba(255, 209, 232, 0.18)', 'rgba(226, 209, 249, 0.18)']],
      gameboy: [['rgba(255, 180, 200, 0.22)', 'rgba(255, 140, 170, 0.16)']],
      natural: [['rgba(255, 253, 249, 0.10)', 'rgba(212, 248, 232, 0.10)']]
    };
    const filterColors = filterOverlays[selectedFilter] || filterOverlays.cotton;
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, filterColors[0][0]);
    gradient.addColorStop(1, filterColors[0][1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Soft subtle vignette
    const vg = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.height * 0.35,
      canvas.width / 2, canvas.height / 2, canvas.height * 0.85
    );
    vg.addColorStop(0, 'rgba(92, 58, 88, 0)');
    vg.addColorStop(1, 'rgba(92, 58, 88, 0.15)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    // Non-webcam fallback pastel gradient
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, COLORS.LAVENDER);
    bg.addColorStop(0.5, COLORS.SAKURA);
    bg.addColorStop(1, COLORS.MINT);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle 2000s CRT pixel dither scanlines
    ctx.save();
    ctx.fillStyle = 'rgba(255, 253, 249, 0.06)';
    for (let y = 0; y < canvas.height; y += 4) {
      ctx.fillRect(0, y, canvas.width, 1);
    }
    ctx.restore();
  }

  // 2. SCREEN SHAKE TRANSFORM
  const hasShake = shakeAmount > 0.5;
  if (hasShake) {
    ctx.save();
    ctx.translate(
      (Math.random() - 0.5) * shakeAmount,
      (Math.random() - 0.5) * shakeAmount
    );
    shakeAmount *= 0.88;
  }

  // 3. TARGETS LAYER
  if (gameState === 'playing') {
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t.sliced && t.active) {
        drawPixelSprite(ctx, t.type, t.x, t.y, t.size, t.rotation);
      }
    }
  } else if (gameState === 'start' && startPeach && !startPeach.sliced) {
    drawTargetAura(ctx, startPeach);
    drawPixelSprite(ctx, startPeach.type, startPeach.x, startPeach.y, startPeach.size, startPeach.rotation);
  } else if (gameState === 'gameover' && restartTarget && !restartTarget.sliced) {
    drawTargetAura(ctx, restartTarget);
    drawPixelSprite(ctx, restartTarget.type, restartTarget.x, restartTarget.y, restartTarget.size, restartTarget.rotation);
  }

  // 4. SLICED HALVES LAYER
  for (let i = 0; i < slicedHalves.length; i++) {
    const h = slicedHalves[i];
    ctx.globalAlpha = Math.max(0, h.life / h.maxLife);
    drawPixelSpriteHalf(ctx, h.type, h.x, h.y, h.size, h.rotation, h.isRight);
    ctx.globalAlpha = 1;
  }

  // 5. MAGIC WAND TRAIL LAYER
  renderTrail(ctx, timestamp);

  // 6. PARTICLE EXPLOSIONS LAYER
  renderParticles(ctx);

  // 7. SCORE POPUPS LAYER
  renderPopups(ctx);

  // 8. FINGER / CURSOR HALO INDICATOR
  if (inputActive) {
    ctx.save();
    ctx.shadowColor = COLORS.SAKURA;
    ctx.shadowBlur = 16;
    ctx.fillStyle = COLORS.SAKURA;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(currentPos.x, currentPos.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Inner white core
    ctx.fillStyle = COLORS.CLOUD;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(currentPos.x, currentPos.y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // Second hand indicator
  if (secondActive) {
    ctx.save();
    ctx.shadowColor = COLORS.MINT;
    ctx.shadowBlur = 16;
    ctx.fillStyle = COLORS.MINT;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(secondPos.x, secondPos.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.CLOUD;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(secondPos.x, secondPos.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // 9. FLASH OVERLAY
  if (flashAlpha > 0.01) {
    ctx.fillStyle = `rgba(255, 253, 249, ${flashAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    flashAlpha *= 0.9;
  }

  if (hasShake) {
    ctx.restore();
  }

  // 10. AUDIO VISUALIZER (Bass Border Pulse)
  if (audio && typeof audio.getAnalyserData === 'function') {
    const analyserData = audio.getAnalyserData();
    if (analyserData && analyserData.length >= 3) {
      const bass = (analyserData[0] + analyserData[1] + analyserData[2]) / (3 * 255);
      if (bass > 0.3) {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 209, 232, ${bass * 0.35})`;
        ctx.lineWidth = bass * 10;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }
  }
}


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 10: MUSIC PLAYER UI
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Initializes and wires all tab switching, local audio file loading,
 * drag-and-drop processing, external streaming embeds, and transport controls.
 */
function setupMusicPlayer() {
  // --- Navigation Tab Switching ---
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
      const targetPanel = document.getElementById(`tab-${btn.dataset.tab}`);
      if (targetPanel) {
        targetPanel.classList.remove('hidden');
      }
    });
  });

  // --- Widget Expand / Collapse Toggle ---
  elements.musicToggleBtn.addEventListener('click', () => {
    elements.musicWidget.classList.toggle('collapsed');
  });

  // --- Local Audio File Picker ---
  elements.audioFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    elements.fileName.textContent = file.name;
    elements.nowPlaying.textContent = `♪ ${file.name}`;

    if (audio && typeof audio.loadAndPlayFile === 'function') {
      await audio.loadAndPlayFile(file);
      elements.playPauseBtn.textContent = '⏸';
    }
  });

  // --- Drag & Drop Zone Handling ---
  const dropZone = elements.dropZone;
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    const file = e.dataTransfer.files[0];
    if (!file) return;

    elements.fileName.textContent = file.name;
    elements.nowPlaying.textContent = `♪ ${file.name}`;

    if (audio && typeof audio.loadAndPlayFile === 'function') {
      await audio.loadAndPlayFile(file);
      elements.playPauseBtn.textContent = '⏸';
    }
  });

  // --- Stream URL Embedder (YouTube / Spotify) ---
  elements.streamGoBtn.addEventListener('click', () => {
    const url = elements.streamUrl.value.trim();
    const container = elements.streamFrameContainer;
    container.innerHTML = '';
    let embedUrl = '';

    // Match YouTube URL formats
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (ytMatch) {
      embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
    }

    // Match Spotify URL formats
    const spMatch = url.match(/open\.spotify\.com\/(track|album|playlist)\/([\w]+)/);
    if (spMatch) {
      embedUrl = `https://open.spotify.com/embed/${spMatch[1]}/${spMatch[2]}`;
    }

    if (embedUrl) {
      const iframe = document.createElement('iframe');
      iframe.src = embedUrl;
      iframe.allow = 'autoplay; encrypted-media';
      iframe.style.width = '100%';
      iframe.style.height = '80px';
      iframe.style.border = `2px solid ${COLORS.COCOA}`;
      container.appendChild(iframe);
      elements.nowPlaying.textContent = '♪ Streaming...';
    }
  });

  // --- Built-in Procedural Tracks ---
  document.querySelectorAll('.track-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.track-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const track = btn.dataset.track;
      if (audio) {
        if (typeof audio.stopFilePlayback === 'function') audio.stopFilePlayback();
        if (typeof audio.playProceduralTrack === 'function') audio.playProceduralTrack(track);
      }

      const names = {
        synthwave: '🌙 Midnight Synthwave',
        chill: '🎵 Seoul Chill R&B',
        fairycore: '✦ Pastel Fairycore'
      };
      elements.nowPlaying.textContent = names[track] || `♪ ${track}`;
      elements.playPauseBtn.textContent = '⏸';
    });
  });

  // --- Transport Controls (Play / Pause, Loop, Volume) ---
  elements.playPauseBtn.addEventListener('click', () => {
    if (!audio) return;
    if (typeof audio.togglePlayPause === 'function') {
      audio.togglePlayPause();
      elements.playPauseBtn.textContent = audio.isPlaying ? '⏸' : '▶';
    }
  });

  elements.loopBtn.addEventListener('click', () => {
    elements.loopBtn.classList.toggle('active');
    if (audio && typeof audio.setLoop === 'function') {
      audio.setLoop(elements.loopBtn.classList.contains('active'));
    }
  });

  elements.volumeSlider.addEventListener('input', (e) => {
    if (audio && typeof audio.setVolume === 'function') {
      audio.setVolume(parseInt(e.target.value, 10) / 100);
    }
  });
}


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 11: MAIN GAME SIMULATION LOOP
// ═════════════════════════════════════════════════════════════════════════════

let lastTime = 0;

/**
 * High-precision game animation loop executing physics, input, and render stages.
 */
function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // Cap delta to prevent tunneling
  lastTime = timestamp;

  // 1. INPUT POLING
  if (usingWebcam) {
    detectHand(timestamp);
  }

  // 2. SHARED VISUAL UPDATES
  updateTrail(
    inputActive ? currentPos.x : -100,
    inputActive ? currentPos.y : -100,
    timestamp
  );
  // Second hand trail
  if (secondActive) {
    updateTrail(secondPos.x, secondPos.y, timestamp);
  }
  // Peace cooldown
  if (peaceCooldown > 0) peaceCooldown -= dt;
  updateParticles(dt);
  updateScorePopups(dt);
  updateSlicedHalves(dt);

  // 3. STATE-SPECIFIC GAME LOGIC
  if (gameState === 'playing') {
    updateSpawner(dt);
    updateTargets(dt);
    checkCollisions();
    updateCombo(dt);
    updateFever(dt);

    if (gameMode === 'zen') {
      updateZenTimer(dt);
    }
    updateHUD();
  } else if (gameState === 'start') {
    updateStartPeach(dt);
    checkStartSlice();
  } else if (gameState === 'gameover') {
    updateRestartTarget(dt);
    checkRestartSlice();
  }

  // 4. RENDERING CYCLE
  render(timestamp);

  requestAnimationFrame(gameLoop);
}


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 12: INITIALIZATION & EVENT BINDING
// ═════════════════════════════════════════════════════════════════════════════

const audio = new AudioEngine();

// --- Camera Dialog Setup Button ---
elements.cameraBtn.addEventListener('click', async () => {
  if (audio && typeof audio.init === 'function') {
    audio.init().catch(() => {});
  }

  elements.cameraLoader.textContent = '♥';

  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    });
    video.srcObject = webcamStream;
    await video.play();
    usingWebcam = true;

    // Load hand tracking model asynchronously in the background so it never freezes the UI
    setupHandTracking().then(() => {
      console.log('Hand tracking ready!');
    }).catch((err) => {
      console.warn('Hand tracking background error:', err);
    });
  } catch (e) {
    console.warn('Camera access denied or failed:', e);
    usingWebcam = false;
  }

  // Instantly advance to the start screen without waiting
  elements.cameraDialog.classList.add('hidden');
  elements.startScreen.classList.remove('hidden');
  gameState = 'start';
  spawnStartPeach();
});

// --- Skip Camera (Mouse / Touch Only) Button ---
elements.skipCameraBtn.addEventListener('click', async () => {
  if (audio && typeof audio.init === 'function') {
    audio.init().catch(() => {});
  }

  usingWebcam = false;
  elements.cameraDialog.classList.add('hidden');
  elements.startScreen.classList.remove('hidden');
  gameState = 'start';
  spawnStartPeach();
});

// --- Direct "PLAY NOW ▶" Button ---
if (elements.startGameBtn) {
  elements.startGameBtn.addEventListener('click', async () => {
    if (audio && typeof audio.init === 'function') {
      audio.init().catch(() => {});
    }
    tapSparkle(window.innerWidth / 2, window.innerHeight / 2);
    if (startPeach) {
      burstSparkles(startPeach.x, startPeach.y, 16);
      burstConfetti(startPeach.x, startPeach.y, 25);
      startPeach = null;
    }
    startGame();
  });
}

// --- Direct "PLAY AGAIN ↻" Button ---
if (elements.restartGameBtn) {
  elements.restartGameBtn.addEventListener('click', async () => {
    if (audio && typeof audio.init === 'function') {
      audio.init().catch(() => {});
    }
    tapSparkle(window.innerWidth / 2, window.innerHeight / 2);
    elements.gameOverScreen.classList.add('hidden');
    elements.startScreen.classList.remove('hidden');
    gameState = 'start';
    spawnStartPeach();
  });
}

// --- Mode Toggle Buttons ---
document.querySelectorAll('.mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    gameMode = btn.dataset.mode;
  });
});

// --- Global Interactive Tap Sparkles & Audio Feedback ---
document.addEventListener('click', (e) => {
  const interactive = e.target.closest('.pixel-btn, .tab-btn, .mode-btn, .track-btn, .ctrl-btn');
  if (interactive) {
    tapSparkle(e.clientX, e.clientY);
    if (audio && typeof audio.playSFX === 'function') {
      audio.playSFX('tap');
    }
  }
});

// --- Duration Picker Pills ---
document.querySelectorAll('[data-duration]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-duration]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const val = btn.dataset.duration;
    if (val === 'endless') {
      isEndless = true;
      gameDuration = 0;
    } else {
      isEndless = false;
      gameDuration = parseInt(val, 10);
    }
  });
});

// --- Custom Duration Input ---
if (elements.customDurationBtn) {
  elements.customDurationBtn.addEventListener('click', () => {
    const val = parseInt(elements.customDuration?.value, 10);
    if (val >= 10 && val <= 600) {
      isEndless = false;
      gameDuration = val;
      document.querySelectorAll('[data-duration]').forEach((b) => b.classList.remove('active'));
    }
  });
}

// --- Wand Trail Picker ---
document.querySelectorAll('[data-wand]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-wand]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedWand = btn.dataset.wand;
  });
});

// --- Camera Filter Picker ---
document.querySelectorAll('[data-filter]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedFilter = btn.dataset.filter;
  });
});

// --- Personal Best Badge ---
if (elements.bestBadgeScore) {
  elements.bestBadgeScore.textContent = highScore;
}

// --- Polaroid Snap ---
if (elements.snapPolaroidBtn) {
  elements.snapPolaroidBtn.addEventListener('click', () => {
    const btn = elements.snapPolaroidBtn;
    let countdown = 3;
    btn.disabled = true;
    btn.textContent = `📸 ${countdown}...`;
    const interval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        btn.textContent = `📸 ${countdown}...`;
      } else {
        clearInterval(interval);
        btn.textContent = '📸 Snap Vibe Polaroid';
        btn.disabled = false;
        capturePolaroid();
      }
    }, 1000);
  });
}

function capturePolaroid() {
  const pc = elements.polaroidCanvas;
  if (!pc) return;
  pc.width = 400;
  pc.height = 520;
  const pctx = pc.getContext('2d');

  // White polaroid frame
  pctx.fillStyle = '#FFFDF9';
  pctx.fillRect(0, 0, 400, 520);

  // Border
  pctx.strokeStyle = '#5C3A58';
  pctx.lineWidth = 4;
  pctx.strokeRect(2, 2, 396, 516);

  // Webcam snapshot (or game canvas fallback)
  const srcCanvas = (usingWebcam && video.readyState >= 2) ? video : canvas;
  pctx.save();
  if (usingWebcam) {
    pctx.translate(380, 20);
    pctx.scale(-1, 1);
    pctx.filter = 'brightness(1.12) contrast(1.05)';
    pctx.drawImage(srcCanvas, 0, 0, 360, 270);
  } else {
    pctx.drawImage(canvas, 20, 20, 360, 270);
  }
  pctx.restore();

  // Photo border
  pctx.strokeStyle = '#5C3A58';
  pctx.lineWidth = 3;
  pctx.strokeRect(20, 20, 360, 270);

  // Pastel filter overlay on photo (subtle soft glow)
  pctx.fillStyle = 'rgba(255, 209, 232, 0.12)';
  pctx.fillRect(20, 20, 360, 270);

  // Decorative pixel hearts
  pctx.font = '20px serif';
  pctx.fillStyle = '#FFB7C5';
  pctx.fillText('♥', 30, 310);
  pctx.fillText('✦', 365, 310);
  pctx.fillText('♥', 365, 505);
  pctx.fillText('✦', 30, 505);

  // Score text
  pctx.font = "bold 14px 'Press Start 2P', monospace";
  pctx.fillStyle = '#5C3A58';
  pctx.textAlign = 'center';
  pctx.fillText('HALCYON // 2000', 200, 325);

  pctx.font = "12px 'Press Start 2P', monospace";
  pctx.fillStyle = '#B5179E';
  pctx.fillText(`Score: ${score}  Combo: ${maxCombo}x`, 200, 360);

  // Rank
  pctx.font = "16px 'VT323', monospace";
  pctx.fillStyle = '#5C3A58';
  pctx.fillText(getRankTitle(score, maxCombo), 200, 400);

  // Date stamp
  pctx.font = "14px 'VT323', monospace";
  pctx.fillStyle = '#A99BC4';
  pctx.fillText(new Date().toLocaleDateString(), 200, 440);

  // Show preview
  const dataUrl = pc.toDataURL('image/png');
  if (elements.polaroidPreview) {
    elements.polaroidPreview.innerHTML = `<img src="${dataUrl}" alt="Vibe Polaroid" style="max-width:260px;">`;
    elements.polaroidPreview.classList.remove('hidden');
  }

  // Show download button
  if (elements.downloadPolaroidBtn) {
    elements.downloadPolaroidBtn.classList.remove('hidden');
    elements.downloadPolaroidBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `halcyon-2000-polaroid-${Date.now()}.png`;
      a.click();
    };
  }
}

// --- Initialize Music Player & Kick off Simulation ---
setupMusicPlayer();
requestAnimationFrame(gameLoop);
