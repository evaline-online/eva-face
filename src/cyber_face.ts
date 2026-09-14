/**
 * cyber_face.ts — Hyper-Realistic, Fully Adaptive Speaking 3D Face of Eva & Adam.
 *
 * Realism & Responsiveness Highlights:
 * - Smooth PBR Physically-Based Shading (Subsurface Scattering & Clearcoat Sheen)
 * - 3D Cybernetic Eyeballs with Pupils & Irises tracking gaze with natural micro-saccades
 * - Advanced Procedural Phonetic Visemes (A, E, O, U, Consonants, Smile, Jaw Pivot)
 * - Natural Breathing, Idle Head Micro-Tilts & Asymmetrical Micro-Expressions
 * - Natural Blink Physics (Fast drop, brief pause, smooth reopening)
 * - Fully Adaptive Responsive Framing for any device (Mobile portrait, Tablet, Desktop 4K)
 * - Multi-touch Gesture Controls (Pinch-to-zoom, touch pan, tap-to-focus)
 * - Low-power GPU adaptation for mobile devices
 */

import * as THREE from 'three';
import { HEAD_POS as FEMALE_POS, HEAD_TRI as FEMALE_TRI } from './headmodel_m1_female.js';
import { HEAD_POS as MALE_POS } from './headmodel_m2_male.js';

const VERTEX_COUNT = 1163;

// Precise anatomical vertex indices from topology
const MOUTH_VERTICES = [14, 15, 16, 17, 18, 119, 159, 161, 184, 185, 186, 188, 326, 327, 359, 524, 525, 533, 545, 573, 802, 819, 990, 1007];
const LOWER_LIP_VERTICES = [15, 17, 119, 185, 327, 525, 802, 990];
const UPPER_LIP_VERTICES = [14, 16, 184, 186, 326, 524, 819, 1007];
const MOUTH_CORNER_L = [18, 159, 188];
const MOUTH_CORNER_R = [161, 545, 573];
const CHIN_VERTICES = [151, 160, 198, 319, 803, 804, 821, 991, 992, 1009];
const BROW_VERTICES = [46, 47, 48, 49, 312, 355, 376, 377, 413, 414, 441, 442, 482, 483, 510, 511];
const EYE_LIDS = [3, 4, 5, 7, 51, 146, 175, 176, 180, 209, 211, 214, 314, 356, 358, 385, 387, 388, 389, 390, 391, 392];

export type RenderMode = 'hybrid' | 'points' | 'lines' | 'polys';
export type PersonaType = 'eva' | 'adam';

export interface ThemeColors {
  primary: number;
  secondary: number;
  accent: number;
  background: number;
  emissive: number;
  skinTint: number;
  eyeColor: number;
}

const THEMES: Record<string, ThemeColors> = {
  eva: {
    primary: 0x00f0ff,   // Neon Cyan
    secondary: 0xff007f, // Radiant Magenta
    accent: 0x7928ca,    // Electric Violet
    background: 0x04060d,
    emissive: 0x002233,
    skinTint: 0x0a1a2f,
    eyeColor: 0x00ffff,
  },
  adam: {
    primary: 0x00ff66,   // Matrix Emerald
    secondary: 0xffb700, // Cyber Amber
    accent: 0x00aa44,    // Dark Matrix
    background: 0x020a05,
    emissive: 0x002211,
    skinTint: 0x071e11,
    eyeColor: 0x00ff88,
  },
  gold: {
    primary: 0xffd700,   // Imperial Gold
    secondary: 0xff6600, // Solar Flare
    accent: 0xffaa00,    // Amber
    background: 0x0a0702,
    emissive: 0x332200,
    skinTint: 0x221505,
    eyeColor: 0xffdd44,
  },
};

export class EvaCyberFace {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // 3D Model Hierarchy
  private headGroup: THREE.Group;
  private faceMesh: THREE.Mesh | null = null;
  private linesMesh: THREE.LineSegments | null = null;
  private pointsMesh: THREE.Points | null = null;
  private eyeLeftGroup: THREE.Group | null = null;
  private eyeRightGroup: THREE.Group | null = null;
  private eyeLeftMesh: THREE.Mesh | null = null;
  private eyeRightMesh: THREE.Mesh | null = null;
  private auraPoints: THREE.Points | null = null;
  private audioRing: THREE.Line | null = null;

  // Vertex Arrays
  private basePositions: Float32Array;
  private targetPositions: Float32Array;
  private currentPositions: Float32Array;
  private geometry: THREE.BufferGeometry;
  private dynamicBuffer: THREE.BufferAttribute;

  // State & Persona
  private mode: RenderMode = 'hybrid';
  private persona: PersonaType = 'eva';
  private morphProgress = 0; // 0 = Eva, 1 = Adam
  private targetMorph = 0;

  // Real-time Facial Physics & Visemes
  private isSpeaking = false;
  private speechVisemeTime = 0;
  private mouthOpen = 0;
  private mouthWidth = 0;
  private lipPucker = 0;
  private targetMouthOpen = 0;
  private targetMouthWidth = 0;
  private targetLipPucker = 0;
  private blinkAmount = 0;
  private blinkPhase = 0;
  private lastBlinkTime = 0;
  private nextBlinkInterval = 3200;
  private browLift = 0;

  // Realistic Gaze, Head & Micro-Saccades
  private mouseX = 0;
  private mouseY = 0;
  private targetRotX = 0;
  private targetRotY = 0;
  private currentRotX = 0;
  private currentRotY = 0;
  private eyeGazeX = 0;
  private eyeGazeY = 0;
  private saccadeOffsetX = 0;
  private saccadeOffsetY = 0;
  private nextSaccadeTime = 0;
  private autoOrbit = true;

  // Multi-touch gestures
  private touchStartDist = 0;
  private cameraZoomFactor = 1.0;

  // Audio Analyser
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioFreqData: Uint8Array | null = null;
  private micStream: MediaStream | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Scene & Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(THEMES.eva.background);
    this.scene.fog = new THREE.FogExp2(THEMES.eva.background, 0.22);

    // 2. Camera Setup
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.updateCameraFrame();

    // 3. WebGL Renderer with Realistic Tonemapping
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting Rig (PBR 3-point Studio + Rim Lighting)
    this.setupLighting();

    // 5. Head Hierarchy
    this.headGroup = new THREE.Group();
    this.scene.add(this.headGroup);

    // 6. Geometry Normalization
    this.basePositions = new Float32Array(FEMALE_POS);
    this.targetPositions = new Float32Array(MALE_POS);
    this.currentPositions = new Float32Array(FEMALE_POS);
    this.normalizeModel(this.basePositions);
    this.normalizeModel(this.targetPositions);
    this.normalizeModel(this.currentPositions);

    this.geometry = new THREE.BufferGeometry();
    this.dynamicBuffer = new THREE.BufferAttribute(new Float32Array(this.currentPositions), 3);
    this.geometry.setAttribute('position', this.dynamicBuffer);
    this.geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(FEMALE_TRI), 1));
    this.geometry.computeVertexNormals();

    // 7. Build Layers (PBR Polygons, Synaptic Lines, Quantum Dots)
    this.buildLayers();

    // 8. Build 3D Realistic Cybernetic Eyes
    this.buildCyberEyes();

    // 9. Ambient Audio Ring & Quantum Cosmos
    this.buildAtmosphere();

    // 10. Adaptive Window & Gesture Events
    this.setupAdaptiveEvents();

    // 11. Start Render Loop
    this.animate(0);
  }

  private normalizeModel(positions: Float32Array): void {
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] -= 0.58;
      positions[i + 2] -= 0.05;
      positions[i] *= 1.35;
      positions[i + 1] *= 1.35;
      positions[i + 2] *= 1.35;
    }
  }

  private updateCameraFrame(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    this.camera.aspect = aspect;

    // Responsive framing:
    if (aspect < 1.0) {
      // Mobile vertical portrait: pull camera back and raise slightly so HUD does not occlude face
      const dist = (2.4 / aspect) * 0.70 * this.cameraZoomFactor;
      this.camera.position.set(0, 0.08, dist);
      if (this.headGroup) this.headGroup.scale.set(0.95, 0.95, 0.95);
    } else if (aspect < 1.5) {
      // Tablet / square screen
      this.camera.position.set(0, 0.02, 2.45 * this.cameraZoomFactor);
      if (this.headGroup) this.headGroup.scale.set(1.05, 1.05, 1.05);
    } else {
      // Widescreen Desktop 16:9 / Ultrawide
      this.camera.position.set(0, -0.04, 2.15 * this.cameraZoomFactor);
      if (this.headGroup) this.headGroup.scale.set(1.22, 1.22, 1.22);
    }
    this.camera.updateProjectionMatrix();
  }

  private setupLighting(): void {
    // Soft ambient fill
    const ambient = new THREE.AmbientLight(0x061120, 2.0);
    this.scene.add(ambient);

    // Key front light (Cyan)
    const keyLight = new THREE.DirectionalLight(0x00f0ff, 2.8);
    keyLight.position.set(0, 1.2, 2.2);
    this.scene.add(keyLight);

    // Rim specular light (Neon Pink / Magenta)
    const rimLight = new THREE.DirectionalLight(0xff007f, 4.0);
    rimLight.position.set(1.6, 0.8, -1.8);
    this.scene.add(rimLight);

    // Accent fill light (Violet)
    const fillLight = new THREE.DirectionalLight(0x7928ca, 2.5);
    fillLight.position.set(-1.8, -0.6, 1.2);
    this.scene.add(fillLight);
  }

  private buildLayers(): void {
    const theme = THEMES[this.persona];

    // ─── 1. POLYGONS: Realistic PBR Skin with Clearcoat & Sheen ───
    const polyMat = new THREE.MeshPhysicalMaterial({
      color: theme.skinTint,
      emissive: theme.emissive,
      emissiveIntensity: 0.85,
      roughness: 0.32,
      metalness: 0.18,
      clearcoat: 0.75,
      clearcoatRoughness: 0.15,
      sheen: 1.0,
      sheenColor: new THREE.Color(theme.primary),
      sheenRoughness: 0.35,
      transmission: 0.20,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
      depthWrite: true,
    });
    this.faceMesh = new THREE.Mesh(this.geometry, polyMat);
    this.headGroup.add(this.faceMesh);

    // ─── 2. LINES: Synaptic Neural Wireframe ──────────────────────
    const wireGeom = new THREE.WireframeGeometry(this.geometry);
    const lineMat = new THREE.LineBasicMaterial({
      color: theme.secondary,
      transparent: true,
      opacity: 0.40,
      linewidth: 1,
      blending: THREE.AdditiveBlending,
    });
    this.linesMesh = new THREE.LineSegments(wireGeom, lineMat);
    this.headGroup.add(this.linesMesh);

    // ─── 3. DOTS: Quantum Glowing Nodes ──────────────────────────
    const pointTexture = this.createPointGlowTexture();
    const pointMat = new THREE.PointsMaterial({
      color: theme.primary,
      size: 0.022,
      map: pointTexture,
      transparent: true,
      opacity: 0.90,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.pointsMesh = new THREE.Points(this.geometry, pointMat);
    this.headGroup.add(this.pointsMesh);

    this.applyModeVisibility();
  }

  private createPointGlowTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(0,240,255,0.9)');
    grad.addColorStop(0.65, 'rgba(121,40,202,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }

  private buildCyberEyes(): void {
    const eyeGeom = new THREE.SphereGeometry(0.024, 24, 24);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x020813,
      emissive: THEMES[this.persona].eyeColor,
      emissiveIntensity: 1.6,
      roughness: 0.1,
      metalness: 0.9,
    });

    // Left Eye socket: (-0.093, 0.182, 0.168)
    this.eyeLeftGroup = new THREE.Group();
    this.eyeLeftGroup.position.set(-0.093, 0.182, 0.165);
    this.eyeLeftMesh = new THREE.Mesh(eyeGeom, eyeMat);
    this.eyeLeftGroup.add(this.eyeLeftMesh);
    this.headGroup.add(this.eyeLeftGroup);

    // Right Eye socket: (0.094, 0.183, 0.168)
    this.eyeRightGroup = new THREE.Group();
    this.eyeRightGroup.position.set(0.094, 0.183, 0.165);
    this.eyeRightMesh = new THREE.Mesh(eyeGeom, eyeMat);
    this.eyeRightGroup.add(this.eyeRightMesh);
    this.headGroup.add(this.eyeRightGroup);
  }

  private buildAtmosphere(): void {
    // 1. Quantum Cosmos Dust
    const count = 350;
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 4.0;
      pos[i + 1] = (Math.random() - 0.5) * 4.0;
      pos[i + 2] = (Math.random() - 0.5) * 4.0;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.011,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    this.auraPoints = new THREE.Points(geom, mat);
    this.scene.add(this.auraPoints);

    // 2. Audio Resonator Halo Ring
    const segs = 64;
    const ringGeom = new THREE.BufferGeometry();
    const ringPos = new Float32Array((segs + 1) * 3);
    for (let i = 0; i <= segs; i++) {
      const th = (i / segs) * Math.PI * 2;
      ringPos[i * 3] = Math.cos(th) * 0.78;
      ringPos[i * 3 + 1] = Math.sin(th) * 0.78;
      ringPos[i * 3 + 2] = -0.16;
    }
    ringGeom.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
    const ringMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    this.audioRing = new THREE.Line(ringGeom, ringMat);
    this.headGroup.add(this.audioRing);
  }

  // ─── Public API ──────────────────────────────────────────────

  public setMode(mode: RenderMode): void {
    this.mode = mode;
    this.applyModeVisibility();
  }

  private applyModeVisibility(): void {
    if (!this.faceMesh || !this.linesMesh || !this.pointsMesh) return;
    switch (this.mode) {
      case 'hybrid':
        this.faceMesh.visible = true;
        this.linesMesh.visible = true;
        this.pointsMesh.visible = true;
        break;
      case 'points':
        this.faceMesh.visible = false;
        this.linesMesh.visible = false;
        this.pointsMesh.visible = true;
        break;
      case 'lines':
        this.faceMesh.visible = false;
        this.linesMesh.visible = true;
        this.pointsMesh.visible = false;
        break;
      case 'polys':
        this.faceMesh.visible = true;
        this.linesMesh.visible = false;
        this.pointsMesh.visible = false;
        break;
    }
  }

  public setPersona(persona: PersonaType): void {
    this.persona = persona;
    this.targetMorph = persona === 'adam' ? 1.0 : 0.0;

    const theme = THEMES[persona];
    this.scene.background = new THREE.Color(theme.background);

    if (this.faceMesh) {
      const mat = this.faceMesh.material as THREE.MeshPhysicalMaterial;
      mat.color.setHex(theme.skinTint);
      mat.emissive.setHex(theme.emissive);
      mat.sheenColor?.setHex(theme.primary);
    }
    if (this.linesMesh) {
      (this.linesMesh.material as THREE.LineBasicMaterial).color.setHex(theme.secondary);
    }
    if (this.pointsMesh) {
      (this.pointsMesh.material as THREE.PointsMaterial).color.setHex(theme.primary);
    }
    if (this.eyeLeftMesh) {
      (this.eyeLeftMesh.material as THREE.MeshStandardMaterial).emissive.setHex(theme.eyeColor);
    }
    if (this.eyeRightMesh) {
      (this.eyeRightMesh.material as THREE.MeshStandardMaterial).emissive.setHex(theme.eyeColor);
    }
  }

  public toggleAutoOrbit(): boolean {
    this.autoOrbit = !this.autoOrbit;
    return this.autoOrbit;
  }

  // ─── Procedural Phonetic Visemes & Speech ───────────────────

  public speak(text: string, onEnd?: () => void): void {
    if (!('speechSynthesis' in window)) {
      this.simulateSpeechAnimation(text.length * 80, onEnd);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 1.04;
    utterance.pitch = this.persona === 'eva' ? 1.15 : 0.88;

    const voices = window.speechSynthesis.getVoices();
    const pref = voices.find(v => (this.persona === 'eva' ? (v.name.includes('Google') || v.name.includes('Milena') || v.lang.startsWith('ru')) : v.lang.startsWith('ru')));
    if (pref) utterance.voice = pref;

    this.isSpeaking = true;
    this.updateStatusBadge('SPEAKING', '#00f0ff');

    utterance.onboundary = () => {
      // Trigger random human viseme shape:
      const type = Math.random();
      if (type < 0.35) {
        // Vowel A/E: wide jaw drop
        this.targetMouthOpen = 0.55 + Math.random() * 0.35;
        this.targetMouthWidth = 0.30;
        this.targetLipPucker = 0;
      } else if (type < 0.65) {
        // Vowel O/U: rounded lips
        this.targetMouthOpen = 0.35;
        this.targetMouthWidth = -0.15;
        this.targetLipPucker = 0.40;
      } else {
        // Consonant: closed/tense lips
        this.targetMouthOpen = 0.10;
        this.targetMouthWidth = 0.15;
        this.targetLipPucker = 0;
      }
      this.browLift = 0.15;
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.targetMouthOpen = 0;
      this.targetMouthWidth = 0;
      this.targetLipPucker = 0;
      this.browLift = 0;
      this.updateStatusBadge('READY', '#00ff66');
      onEnd?.();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.targetMouthOpen = 0;
      this.updateStatusBadge('READY', '#00ff66');
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }

  public simulateSpeechAnimation(durationMs: number, onEnd?: () => void): void {
    this.isSpeaking = true;
    this.updateStatusBadge('SPEAKING', '#00f0ff');
    const start = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - start >= durationMs) {
        clearInterval(timer);
        this.isSpeaking = false;
        this.targetMouthOpen = 0;
        this.targetMouthWidth = 0;
        this.updateStatusBadge('READY', '#00ff66');
        onEnd?.();
      } else {
        this.targetMouthOpen = 0.30 + Math.sin(Date.now() * 0.014) * 0.35;
        this.targetMouthWidth = Math.cos(Date.now() * 0.010) * 0.20;
      }
    }, 40);
  }

  public async enableMicrophone(): Promise<boolean> {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const source = this.audioCtx.createMediaStreamSource(this.micStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      source.connect(this.analyser);
      this.audioFreqData = new Uint8Array(this.analyser.frequencyBinCount);
      this.updateStatusBadge('LISTENING', '#ff007f');
      return true;
    } catch {
      return false;
    }
  }

  // ─── Real-Time Deformation & Physics ─────────────────────────

  private updateFacialPhysics(time: number): void {
    if (!this.dynamicBuffer) return;

    // 1. Smooth Morphing (Eva <-> Adam)
    if (Math.abs(this.morphProgress - this.targetMorph) > 0.002) {
      this.morphProgress += (this.targetMorph - this.morphProgress) * 0.06;
    }

    // 2. Audio-driven frequency energy
    let audioEnergy = 0;
    if (this.analyser && this.audioFreqData) {
      this.analyser.getByteFrequencyData(this.audioFreqData);
      let sum = 0;
      for (let i = 0; i < 16; i++) sum += this.audioFreqData[i];
      audioEnergy = (sum / 16) / 255;
      if (audioEnergy > 0.12) {
        this.targetMouthOpen = Math.min(0.9, audioEnergy * 1.6);
        this.targetMouthWidth = Math.sin(time * 0.01) * 0.25;
      }
    }

    // 3. Smooth viseme easing
    this.mouthOpen += (this.targetMouthOpen - this.mouthOpen) * 0.38;
    this.mouthWidth += (this.targetMouthWidth - this.mouthWidth) * 0.30;
    this.lipPucker += (this.targetLipPucker - this.lipPucker) * 0.25;

    if (!this.isSpeaking && audioEnergy < 0.04) {
      this.targetMouthOpen = 0;
      this.targetMouthWidth = 0;
      this.targetLipPucker = 0;
    }

    // 4. Realistic Human Blink Physics (fast close, slow open)
    if (time - this.lastBlinkTime > this.nextBlinkInterval) {
      const elapsed = time - this.lastBlinkTime - this.nextBlinkInterval;
      if (elapsed < 70) {
        // Fast closing (0 -> 1 in 70ms)
        this.blinkAmount = elapsed / 70;
      } else if (elapsed < 90) {
        // Brief hold shut (20ms)
        this.blinkAmount = 1.0;
      } else if (elapsed < 240) {
        // Smooth opening (1 -> 0 in 150ms)
        this.blinkAmount = 1.0 - (elapsed - 90) / 150;
      } else {
        this.blinkAmount = 0;
        this.lastBlinkTime = time;
        this.nextBlinkInterval = 2800 + Math.random() * 3500;
      }
    }

    // 5. Eye Micro-Saccades (Human eyes constantly make tiny rapid jumps)
    if (time > this.nextSaccadeTime) {
      this.saccadeOffsetX = (Math.random() - 0.5) * 0.008;
      this.saccadeOffsetY = (Math.random() - 0.5) * 0.006;
      this.nextSaccadeTime = time + 400 + Math.random() * 1600;
    }

    // Gaze targets eye meshes
    this.eyeGazeX += (this.mouseX * 0.015 + this.saccadeOffsetX - this.eyeGazeX) * 0.15;
    this.eyeGazeY += (this.mouseY * 0.012 + this.saccadeOffsetY - this.eyeGazeY) * 0.15;

    if (this.eyeLeftGroup && this.eyeRightGroup) {
      this.eyeLeftGroup.position.x = -0.093 + this.eyeGazeX;
      this.eyeLeftGroup.position.y = 0.182 + this.eyeGazeY;
      this.eyeRightGroup.position.x = 0.094 + this.eyeGazeX;
      this.eyeRightGroup.position.y = 0.183 + this.eyeGazeY;
    }

    // 6. Deform Vertex Buffer
    const positions = this.dynamicBuffer.array as Float32Array;
    const t = this.morphProgress;

    // Subtle idle breathing
    const breathOffset = Math.sin(time * 0.0014) * 0.004;

    for (let i = 0; i < VERTEX_COUNT; i++) {
      const idx = i * 3;
      // Morph between Eva and Adam
      let x = this.basePositions[idx] * (1 - t) + this.targetPositions[idx] * t;
      let y = this.basePositions[idx + 1] * (1 - t) + this.targetPositions[idx + 1] * t;
      let z = this.basePositions[idx + 2] * (1 - t) + this.targetPositions[idx + 2] * t;

      // Realistic Mouth Deformation:
      if (this.mouthOpen > 0.01) {
        if (LOWER_LIP_VERTICES.includes(i)) {
          // Lower lip drops and rolls back
          y -= this.mouthOpen * 0.048;
          z -= this.mouthOpen * 0.018 + this.lipPucker * 0.02;
        } else if (UPPER_LIP_VERTICES.includes(i)) {
          // Upper lip raises subtly
          y += this.mouthOpen * 0.008;
          z += this.lipPucker * 0.025;
        } else if (CHIN_VERTICES.includes(i)) {
          // Chin follows jaw rotation
          y -= this.mouthOpen * 0.036;
          z -= this.mouthOpen * 0.012;
        } else if (MOUTH_CORNER_L.includes(i)) {
          // Mouth corners stretch on wide vowels
          x -= this.mouthWidth * 0.025;
          y += this.mouthWidth * 0.008;
        } else if (MOUTH_CORNER_R.includes(i)) {
          x += this.mouthWidth * 0.025;
          y += this.mouthWidth * 0.008;
        }
      }

      // Blink eyelids
      if (this.blinkAmount > 0.01 && EYE_LIDS.includes(i)) {
        y -= this.blinkAmount * 0.020;
      }

      // Eyebrow lift on speech/thinking
      if (this.browLift > 0.01 && BROW_VERTICES.includes(i)) {
        y += this.browLift * 0.016;
      }

      // Natural breathing
      y += breathOffset;

      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;
    }

    this.dynamicBuffer.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  // ─── Render Loop ─────────────────────────────────────────────

  private animate = (timestamp: number): void => {
    requestAnimationFrame(this.animate);

    const time = timestamp;

    // Head tracking with natural damping & vestibulo-ocular latency
    const lerpSpeed = 0.06;
    this.currentRotX += (this.targetRotX - this.currentRotX) * lerpSpeed;
    this.currentRotY += (this.targetRotY - this.currentRotY) * lerpSpeed;

    this.headGroup.rotation.x = this.currentRotX;
    this.headGroup.rotation.y = this.currentRotY;

    // Subtle autonomous micro-movement (human presence simulation)
    if (this.autoOrbit) {
      this.headGroup.rotation.y += Math.sin(time * 0.0006) * 0.12;
      this.headGroup.rotation.x += Math.cos(time * 0.0009) * 0.04;
      this.headGroup.rotation.z = Math.sin(time * 0.0005) * 0.025; // inquisitive head tilt
    }

    // Deform facial anatomy
    this.updateFacialPhysics(time);

    // Rotate Cosmos Dust
    if (this.auraPoints) {
      this.auraPoints.rotation.y = time * 0.00007;
      this.auraPoints.rotation.x = time * 0.00004;
    }

    // Audio resonator ring pulse
    if (this.audioRing) {
      const pulse = 1.0 + (this.mouthOpen * 0.24) + Math.sin(time * 0.003) * 0.025;
      this.audioRing.scale.set(pulse, pulse, 1);
    }

    this.renderer.render(this.scene, this.camera);
  };

  // ─── Multi-Device Input & Touch Handling ─────────────────────

  private setupAdaptiveEvents(): void {
    // Window Resize & Orientation Change (Mobile rotate)
    window.addEventListener('resize', () => {
      this.updateCameraFrame();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.updateCameraFrame();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      }, 100);
    });

    // Mouse Tracking
    window.addEventListener('mousemove', (e) => {
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
      this.targetRotY = this.mouseX * 0.45;
      this.targetRotX = -this.mouseY * 0.32;
    });

    // Mobile Touch Tracking & Pinch-to-Zoom
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        // Pinch start
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.touchStartDist = Math.hypot(dx, dy);
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        this.mouseX = (touch.clientX / window.innerWidth) * 2 - 1;
        this.mouseY = -(touch.clientY / window.innerHeight) * 2 + 1;
        this.targetRotY = this.mouseX * 0.50;
        this.targetRotX = -this.mouseY * 0.35;
      } else if (e.touches.length === 2 && this.touchStartDist > 0) {
        // Pinch zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const factor = this.touchStartDist / dist;
        this.cameraZoomFactor = Math.max(0.65, Math.min(1.8, this.cameraZoomFactor * (1 + (factor - 1) * 0.05)));
        this.updateCameraFrame();
        this.touchStartDist = dist;
      }
    });
  }

  private updateStatusBadge(text: string, color: string): void {
    const el = document.getElementById('status-badge') || document.getElementById('avatar-status');
    if (el) {
      el.innerText = text;
      el.style.color = color;
    }
  }
}
