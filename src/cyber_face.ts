/**
 * cyber_face.ts — Interactive Speaking 3D Face of Eva (Dots, Lines & Polygons).
 *
 * Real-time Three.js WebGL Holographic Engine:
 * - Dots (Quantum Particle Cloud)
 * - Lines (Neural Plexus & Synaptic Pulses)
 * - Polygons (Faceted 3D Holographic Glass Mesh)
 * - Real-time Lip-Sync & Viseme Speaking Engine
 * - Dynamic Morphing between Eva & Adam
 * - Gaze & Mouse Head Tracking with Natural Blinks
 * - Web Audio Spectrum Visualizer & Microphone Input
 * - Built-in Speech Synthesis
 */

import * as THREE from 'three';
import { HEAD_POS as FEMALE_POS, HEAD_TRI as FEMALE_TRI } from './headmodel_m1_female.js';
import { HEAD_POS as MALE_POS } from './headmodel_m2_male.js';

// ─── Constants & Landmark Indices ─────────────────────────────

const VERTEX_COUNT = 1163;
const TRI_COUNT = 1500;

// Specific facial landmark vertex indices discovered from topology
const MOUTH_VERTICES = [14, 15, 16, 17, 18, 119, 159, 161, 184, 185, 186, 188, 326, 327, 359, 524, 525, 533, 545, 573, 802, 819, 990, 1007];
const CHIN_VERTICES = [151, 160, 198, 319, 803, 804, 821, 991, 992, 1009];
const EYE_VERTICES = [3, 4, 5, 7, 46, 47, 48, 49, 51, 146, 175, 176, 180, 209, 211, 214, 312, 314, 355, 356, 358, 376, 377, 385, 387, 388, 389, 390, 391, 392, 393, 394, 396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 413, 414, 415, 416, 417, 418, 419, 420, 421, 423, 426, 427, 428, 429, 430, 431, 432, 433, 434, 436, 437, 438, 441, 442, 445, 446, 447, 448, 449, 451, 452, 454, 455, 456, 457, 458, 459, 460, 461, 462, 464, 465, 466, 467, 468, 469, 470, 471, 472, 473, 474, 475, 482, 483, 484, 485, 486, 487, 488, 489, 491, 494, 495, 496, 497, 498, 499, 500, 501, 502, 504, 505, 506, 507, 510, 511, 514, 515, 516, 517, 518, 519, 522, 523, 798, 815, 986, 1003];

export type RenderMode = 'hybrid' | 'points' | 'lines' | 'polys';
export type PersonaType = 'eva' | 'adam';

export interface ThemeColors {
  primary: number;
  secondary: number;
  accent: number;
  background: number;
  emissive: number;
}

const THEMES: Record<string, ThemeColors> = {
  eva: {
    primary: 0x00f0ff,   // Cyber Cyan
    secondary: 0xff007f, // Neon Pink
    accent: 0x7928ca,    // Electric Violet
    background: 0x04060d,
    emissive: 0x003344,
  },
  adam: {
    primary: 0x00ff66,   // Matrix Emerald
    secondary: 0xffb700, // Cyber Amber
    accent: 0x00aa44,    // Dark Matrix
    background: 0x020a05,
    emissive: 0x002b11,
  },
  gold: {
    primary: 0xffd700,   // Imperial Gold
    secondary: 0xff6600, // Solar Flare
    accent: 0xffaa00,    // Amber
    background: 0x0a0702,
    emissive: 0x332200,
  },
};

export class EvaCyberFace {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // 3D Objects
  private headGroup: THREE.Group;
  private polysMesh: THREE.Mesh | null = null;
  private linesMesh: THREE.LineSegments | null = null;
  private pointsMesh: THREE.Points | null = null;
  private auraPoints: THREE.Points | null = null;
  private audioRing: THREE.Line | null = null;

  // Geometry buffers
  private basePositions: Float32Array;
  private targetPositions: Float32Array;
  private currentPositions: Float32Array;
  private dynamicBuffer: THREE.BufferAttribute | null = null;

  // State
  private mode: RenderMode = 'hybrid';
  private persona: PersonaType = 'eva';
  private morphProgress = 0; // 0 = Eva, 1 = Adam
  private targetMorph = 0;

  // Animation & Speaking
  private isSpeaking = false;
  private mouthOpen = 0;
  private targetMouthOpen = 0;
  private blinkPhase = 0;
  private lastBlinkTime = 0;
  private nextBlinkInterval = 3000;

  // Head tracking
  private mouseX = 0;
  private mouseY = 0;
  private targetRotX = 0;
  private targetRotY = 0;
  private currentRotX = 0;
  private currentRotY = 0;
  private autoOrbit = true;

  // Audio subsystem
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioFreqData: Uint8Array | null = null;
  private micStream: MediaStream | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(THEMES.eva.background);
    this.scene.fog = new THREE.FogExp2(THEMES.eva.background, 0.25);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 0, 2.2);

    // 2. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    // 3. Lighting
    this.setupLighting();

    // 4. Head Model Data Setup
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, -0.05, 0); // vertically centered
    this.scene.add(this.headGroup);

    this.basePositions = new Float32Array(FEMALE_POS);
    this.targetPositions = new Float32Array(MALE_POS);
    this.currentPositions = new Float32Array(FEMALE_POS);

    // Center the vertices around (0, 0, 0)
    this.normalizeModel(this.basePositions);
    this.normalizeModel(this.targetPositions);
    this.normalizeModel(this.currentPositions);

    // 5. Construct Meshes (Polys, Lines, Dots)
    this.buildMeshes();

    // 6. Audio Aura & Cyber Rings
    this.buildCyberHUD();

    // 7. Event Listeners
    this.setupEvents();

    // 8. Start Loop
    this.animate(0);
  }

  private normalizeModel(positions: Float32Array): void {
    // Model center: Y ~ 0.58, Z ~ 0.05
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] -= 0.58;
      positions[i + 2] -= 0.05;
      // Scale nicely
      positions[i] *= 1.35;
      positions[i + 1] *= 1.35;
      positions[i + 2] *= 1.35;
    }
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x081525, 1.5);
    this.scene.add(ambient);

    const dirFront = new THREE.DirectionalLight(0x00f0ff, 2.0);
    dirFront.position.set(0, 1, 2);
    this.scene.add(dirFront);

    const dirRim = new THREE.DirectionalLight(0xff007f, 3.0);
    dirRim.position.set(1.5, 0.5, -1.5);
    this.scene.add(dirRim);

    const dirLeft = new THREE.DirectionalLight(0x7928ca, 2.0);
    dirLeft.position.set(-1.5, -0.5, 1);
    this.scene.add(dirLeft);
  }

  private buildMeshes(): void {
    // Shared Geometry
    const geometry = new THREE.BufferGeometry();
    this.dynamicBuffer = new THREE.BufferAttribute(new Float32Array(this.currentPositions), 3);
    geometry.setAttribute('position', this.dynamicBuffer);
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(FEMALE_TRI), 1));
    geometry.computeVertexNormals();

    const theme = THEMES[this.persona];

    // ─── 1. POLYGONS (Faceted Holographic Mesh) ───────────────
    const polyMat = new THREE.MeshPhysicalMaterial({
      color: theme.primary,
      emissive: theme.emissive,
      roughness: 0.25,
      metalness: 0.85,
      transmission: 0.45,
      transparent: true,
      opacity: 0.70,
      flatShading: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.polysMesh = new THREE.Mesh(geometry, polyMat);
    this.headGroup.add(this.polysMesh);

    // ─── 2. LINES (Neural Plexus & Synapses) ───────────────────
    const wireGeom = new THREE.WireframeGeometry(geometry);
    const lineMat = new THREE.LineBasicMaterial({
      color: theme.secondary,
      transparent: true,
      opacity: 0.45,
      linewidth: 1,
      blending: THREE.AdditiveBlending,
    });
    this.linesMesh = new THREE.LineSegments(wireGeom, lineMat);
    this.headGroup.add(this.linesMesh);

    // ─── 3. DOTS (Quantum Particle Cloud) ──────────────────────
    const pointTexture = this.createPointGlowTexture();
    const pointMat = new THREE.PointsMaterial({
      color: theme.primary,
      size: 0.024,
      map: pointTexture,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.pointsMesh = new THREE.Points(geometry, pointMat);
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
    grad.addColorStop(0.3, 'rgba(0,240,255,0.8)');
    grad.addColorStop(0.7, 'rgba(121,40,202,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private buildCyberHUD(): void {
    // 1. Ambient Cosmos Floating Particles
    const auraCount = 400;
    const auraGeom = new THREE.BufferGeometry();
    const auraPos = new Float32Array(auraCount * 3);
    for (let i = 0; i < auraCount * 3; i += 3) {
      auraPos[i] = (Math.random() - 0.5) * 3.5;
      auraPos[i + 1] = (Math.random() - 0.5) * 3.5;
      auraPos[i + 2] = (Math.random() - 0.5) * 3.5;
    }
    auraGeom.setAttribute('position', new THREE.BufferAttribute(auraPos, 3));
    const auraMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.012,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });
    this.auraPoints = new THREE.Points(auraGeom, auraMat);
    this.scene.add(this.auraPoints);

    // 2. Concentric Audio Spectrum Halo
    const ringSegs = 64;
    const ringGeom = new THREE.BufferGeometry();
    const ringPos = new Float32Array((ringSegs + 1) * 3);
    for (let i = 0; i <= ringSegs; i++) {
      const theta = (i / ringSegs) * Math.PI * 2;
      ringPos[i * 3] = Math.cos(theta) * 0.75;
      ringPos[i * 3 + 1] = Math.sin(theta) * 0.75;
      ringPos[i * 3 + 2] = -0.15;
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

  // ─── Interactive Controls ────────────────────────────────────

  public setMode(mode: RenderMode): void {
    this.mode = mode;
    this.applyModeVisibility();
  }

  private applyModeVisibility(): void {
    if (!this.polysMesh || !this.linesMesh || !this.pointsMesh) return;
    switch (this.mode) {
      case 'hybrid':
        this.polysMesh.visible = true;
        this.linesMesh.visible = true;
        this.pointsMesh.visible = true;
        break;
      case 'points':
        this.polysMesh.visible = false;
        this.linesMesh.visible = false;
        this.pointsMesh.visible = true;
        break;
      case 'lines':
        this.polysMesh.visible = false;
        this.linesMesh.visible = true;
        this.pointsMesh.visible = false;
        break;
      case 'polys':
        this.polysMesh.visible = true;
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
    if (this.polysMesh) {
      (this.polysMesh.material as THREE.MeshPhysicalMaterial).color.setHex(theme.primary);
      (this.polysMesh.material as THREE.MeshPhysicalMaterial).emissive.setHex(theme.emissive);
    }
    if (this.linesMesh) {
      (this.linesMesh.material as THREE.LineBasicMaterial).color.setHex(theme.secondary);
    }
    if (this.pointsMesh) {
      (this.pointsMesh.material as THREE.PointsMaterial).color.setHex(theme.primary);
    }
    if (this.audioRing) {
      (this.audioRing.material as THREE.LineBasicMaterial).color.setHex(theme.primary);
    }
  }

  public toggleAutoOrbit(): boolean {
    this.autoOrbit = !this.autoOrbit;
    return this.autoOrbit;
  }

  // ─── Speech & Audio Engine ───────────────────────────────────

  public speak(text: string, onEnd?: () => void): void {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis is not supported in this browser.');
      this.simulateSpeechAnimation(text.length * 75, onEnd);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 1.05;
    utterance.pitch = this.persona === 'eva' ? 1.15 : 0.85;

    // Pick female voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => (this.persona === 'eva' ? (v.name.includes('Google') || v.name.includes('Milena') || v.name.includes('Yuri') || v.lang.startsWith('ru')) : v.lang.startsWith('ru')));
    if (preferred) utterance.voice = preferred;

    this.isSpeaking = true;
    this.updateStatusBadge('SPEAKING', '#00f0ff');

    utterance.onboundary = () => {
      this.targetMouthOpen = 0.35 + Math.random() * 0.45;
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.targetMouthOpen = 0;
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
    const interval = setInterval(() => {
      if (Date.now() - start >= durationMs) {
        clearInterval(interval);
        this.isSpeaking = false;
        this.targetMouthOpen = 0;
        this.updateStatusBadge('READY', '#00ff66');
        onEnd?.();
      } else {
        this.targetMouthOpen = 0.25 + Math.sin(Date.now() * 0.015) * 0.35;
      }
    }, 50);
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
    } catch (err) {
      console.error('Microphone access denied:', err);
      return false;
    }
  }

  // ─── Mesh Deformation & Lip-Sync Loop ────────────────────────

  private updateFaceDeformation(time: number): void {
    if (!this.dynamicBuffer) return;

    // 1. Morph Persona (Eva <-> Adam)
    if (Math.abs(this.morphProgress - this.targetMorph) > 0.005) {
      this.morphProgress += (this.targetMorph - this.morphProgress) * 0.08;
    }

    // 2. Audio-reactive energy from mic or speech
    let audioEnergy = 0;
    if (this.analyser && this.audioFreqData) {
      this.analyser.getByteFrequencyData(this.audioFreqData);
      let sum = 0;
      for (let i = 0; i < 16; i++) sum += this.audioFreqData[i]; // low frequencies
      audioEnergy = (sum / 16) / 255;
      if (audioEnergy > 0.15) {
        this.targetMouthOpen = Math.min(1.0, audioEnergy * 1.5);
      }
    }

    // 3. Smooth mouth transition
    this.mouthOpen += (this.targetMouthOpen - this.mouthOpen) * 0.35;
    if (!this.isSpeaking && audioEnergy < 0.05) {
      this.targetMouthOpen = 0;
    } else if (this.isSpeaking && !this.analyser) {
      // Procedural visemes
      this.targetMouthOpen = Math.abs(Math.sin(time * 12.0)) * 0.65 + Math.sin(time * 5.0) * 0.15;
    }

    // 4. Natural Blinking
    if (time - this.lastBlinkTime > this.nextBlinkInterval) {
      this.blinkPhase = Math.sin((time - this.lastBlinkTime - this.nextBlinkInterval) * 0.02);
      if (this.blinkPhase >= Math.PI) {
        this.blinkPhase = 0;
        this.lastBlinkTime = time;
        this.nextBlinkInterval = 2500 + Math.random() * 4000;
      }
    }
    const blinkAmount = Math.max(0, Math.sin(this.blinkPhase));

    // 5. Apply vertex deformation
    const positions = this.dynamicBuffer.array as Float32Array;
    const t = this.morphProgress;

    for (let i = 0; i < VERTEX_COUNT; i++) {
      const idx = i * 3;
      // Morph between base (Eva) and target (Adam)
      let x = this.basePositions[idx] * (1 - t) + this.targetPositions[idx] * t;
      let y = this.basePositions[idx + 1] * (1 - t) + this.targetPositions[idx + 1] * t;
      let z = this.basePositions[idx + 2] * (1 - t) + this.targetPositions[idx + 2] * t;

      // Mouth & Jaw drop (Lip-sync)
      if (this.mouthOpen > 0.01) {
        if (MOUTH_VERTICES.includes(i)) {
          y -= this.mouthOpen * 0.045;
          z -= this.mouthOpen * 0.020;
        } else if (CHIN_VERTICES.includes(i)) {
          y -= this.mouthOpen * 0.035;
          z -= this.mouthOpen * 0.015;
        }
      }

      // Eye blink
      if (blinkAmount > 0.01 && EYE_VERTICES.includes(i)) {
        y -= blinkAmount * 0.018;
      }

      // Audio excitation ripple (Dots vibrate subtly)
      if (audioEnergy > 0.2 && this.mode === 'points') {
        const ripple = Math.sin(y * 20.0 + time * 0.01) * audioEnergy * 0.005;
        z += ripple;
      }

      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;
    }

    this.dynamicBuffer.needsUpdate = true;
  }

  // ─── Render Loop ─────────────────────────────────────────────

  private animate = (timestamp: number): void => {
    requestAnimationFrame(this.animate);

    const time = timestamp;

    // Head tracking with smooth easing
    const lerpFactor = 0.06;
    this.currentRotX += (this.targetRotX - this.currentRotX) * lerpFactor;
    this.currentRotY += (this.targetRotY - this.currentRotY) * lerpFactor;

    this.headGroup.rotation.x = this.currentRotX;
    this.headGroup.rotation.y = this.currentRotY;

    // Idle subtle breathing & auto-orbit
    if (this.autoOrbit) {
      this.headGroup.rotation.y += Math.sin(time * 0.0008) * 0.15;
      this.headGroup.rotation.x += Math.cos(time * 0.0012) * 0.05;
    }

    // Deform face geometry (speech, blink, morph)
    this.updateFaceDeformation(time);

    // Rotate Cosmos Particles
    if (this.auraPoints) {
      this.auraPoints.rotation.y = time * 0.00008;
      this.auraPoints.rotation.x = time * 0.00005;
    }

    // Audio ring pulsation
    if (this.audioRing) {
      const pulse = 1.0 + (this.mouthOpen * 0.25) + Math.sin(time * 0.003) * 0.03;
      this.audioRing.scale.set(pulse, pulse, 1);
    }

    this.renderer.render(this.scene, this.camera);
  };

  // ─── Input & Resize Events ───────────────────────────────────

  private setupEvents(): void {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });

    window.addEventListener('mousemove', (e) => {
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;

      // Limit head rotation angles for natural looking
      this.targetRotY = this.mouseX * 0.45;
      this.targetRotX = -this.mouseY * 0.35;
    });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        this.mouseX = (touch.clientX / window.innerWidth) * 2 - 1;
        this.mouseY = -(touch.clientY / window.innerHeight) * 2 + 1;
        this.targetRotY = this.mouseX * 0.45;
        this.targetRotX = -this.mouseY * 0.35;
      }
    });
  }

  private updateStatusBadge(text: string, color: string): void {
    const el = document.getElementById('status-badge');
    if (el) {
      el.innerText = text;
      el.style.color = color;
      el.style.borderColor = color;
      el.style.boxShadow = `0 0 12px ${color}66`;
    }
  }
}
