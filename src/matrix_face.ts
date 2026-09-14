/**
 * matrix_face.ts — Unified 3D Matrix Code Entity with Spring-Back Centering,
 * Real-time FPS, Persona Switching, and Touch/Cursor Tracking.
 *
 * Core Concept:
 * - 100% dead-centered in all viewports (Mobile, Tablet, Desktop).
 * - Interactive 3D rotation via mouse/touch drag with elastic spring-return to center.
 * - Real-time continuous gaze/cursor/touch tracking.
 * - Live real measured FPS calculation and callback.
 * - 4 Selectable Matrix Personas: Eva, Adam, Neo, and Rain Code.
 * - High-fidelity Pinscreen 3D mesh (10.2K verts, 20.3K tris) with studio normals.
 */

import * as THREE from 'three';
import { HEAD_POS, HEAD_NRM, HEAD_TRI, HEAD_N, HEAD_TRI_COUNT } from './headmodel.js';

// Landmark coordinates in model space (y-up, +z toward camera)
const EYE_L = { x: -0.137, y: 0.336, z: 0.36 };
const EYE_R = { x: 0.137, y: 0.336, z: 0.36 };
const MOUTH = { x: 0, y: 0.015, z: 0.45 };

function gauss(dx: number, dy: number, dz: number, sx: number, sy: number, sz: number): number {
  return Math.exp(-(dx * dx / (2 * sx * sx) + dy * dy / (2 * sy * sy) + dz * dz / (2 * sz * sz)));
}

export type MatrixPersona = 'eva' | 'adam' | 'neo' | 'rain';

export interface PersonaTheme {
  name: MatrixPersona;
  title: string;
  primary: THREE.Vector3;
  highlight: THREE.Vector3;
  dark: THREE.Vector3;
  rainSpeed: number;
  jawScale: number;
  chinTaper: number;
  browLift: number;
}

export const PERSONA_THEMES: Record<MatrixPersona, PersonaTheme> = {
  eva: {
    name: 'eva',
    title: 'EVA MATRIX',
    primary: new THREE.Vector3(0.0, 1.0, 0.45),      // Pure Matrix Phosphor Green
    highlight: new THREE.Vector3(1.0, 1.0, 1.0),    // White-hot phosphor
    dark: new THREE.Vector3(0.0, 0.28, 0.08),       // Deep dark emerald jade
    rainSpeed: 1.0,
    jawScale: 0.96,
    chinTaper: 0.94,
    browLift: 0.0,
  },
  adam: {
    name: 'adam',
    title: 'ADAM CYBER',
    primary: new THREE.Vector3(1.0, 0.72, 0.0),     // Cybernetic Amber Gold
    highlight: new THREE.Vector3(1.0, 0.96, 0.8),   // Solar White
    dark: new THREE.Vector3(0.30, 0.15, 0.02),      // Dark Cyber Bronze
    rainSpeed: 0.85,
    jawScale: 1.10,
    chinTaper: 1.04,
    browLift: 0.02,
  },
  neo: {
    name: 'neo',
    title: 'NEO ELECTRA',
    primary: new THREE.Vector3(0.0, 0.95, 1.0),     // Electric Cyan Matrix
    highlight: new THREE.Vector3(1.0, 1.0, 1.0),    // Supernova White
    dark: new THREE.Vector3(0.0, 0.14, 0.32),       // Deep Obsidian Cyan
    rainSpeed: 1.25,
    jawScale: 1.03,
    chinTaper: 0.98,
    browLift: 0.01,
  },
  rain: {
    name: 'rain',
    title: 'PURE MATRIX RAIN',
    primary: new THREE.Vector3(0.1, 1.0, 0.3),      // Vibrant Emerald Code
    highlight: new THREE.Vector3(0.9, 1.0, 0.9),
    dark: new THREE.Vector3(0.0, 0.18, 0.05),
    rainSpeed: 1.6,
    jawScale: 1.0,
    chinTaper: 1.0,
    browLift: 0.0,
  },
};

// Authentic Matrix characters arranged in 4 perceptual density tiers
const DENSITY_GLYPHS = [
  // Tier 0 (0..63): Deep shadows & eye sockets
  ':', '·', '・', '.', '`', '\'', '-', '^', '~', '"', ':', '·', '・', '.', ':', '·',
  ':', '·', '・', '.', '`', '\'', '-', '^', '~', '"', ':', '·', '・', '.', ':', '·',
  '·', ':', '-', '·', ':', '-', '·', ':', '-', '·', ':', '-', '·', ':', '-', '·',
  '·', ':', '-', '·', ':', '-', '·', ':', '-', '·', ':', '-', '·', ':', '-', '·',

  // Tier 1 (64..127): Matrix symbols & numbers
  '1', '2', '3', '4', '5', '7', '8', '9', '0', '+', '-', '*', '=', '<', '>', '/',
  '\\', '|', '¦', 'T', 'L', 'J', 'I', 'F', 'C', 'X', 'Z', 'V', '1', '7', '0', '3',
  '2', '4', '5', '8', '9', '+', '*', '=', '<', '>', '|', '¦', '1', '7', '0', '9',
  '1', '2', '3', '4', '5', '7', '8', '9', '0', '+', '-', '*', '=', '<', '>', '/',

  // Tier 2 (128..191): Authentic Japanese Katakana
  'ｱ', 'ｲ', 'ｳ', 'ｴ', 'ｵ', 'ｶ', 'ｷ', 'ｸ', 'ｹ', 'ｺ', 'ｻ', 'ｼ', 'ｽ', 'ｾ', 'ｿ', 'ﾀ',
  'ﾁ', 'ﾂ', 'ﾃ', 'ﾄ', 'ﾅ', 'ﾆ', 'ﾇ', 'ﾈ', 'ﾉ', 'ﾊ', 'ﾋ', 'ﾌ', 'ﾍ', 'ﾎ', 'ﾏ', 'ﾐ',
  'ﾑ', 'ﾒ', 'ﾓ', 'ﾔ', 'ﾕ', 'ﾖ', 'ﾗ', 'ﾘ', 'ﾙ', 'ﾚ', 'ﾛ', 'ﾜ', 'ﾝ', 'ｱ', 'ｶ', 'ｻ',
  'ｼ', 'ﾀ', 'ﾅ', 'ﾊ', 'ﾋ', 'ﾏ', 'ﾐ', 'ﾑ', 'ﾗ', 'ﾘ', 'ﾜ', 'ﾂ', 'ﾃ', 'ﾄ', 'ﾆ', 'ﾇ',

  // Tier 3 (192..255): Heavy bold blocks & dense matrix glyphs
  '日', '田', '目', 'Ш', 'Ж', '0', '8', 'B', 'M', 'W', 'Q', '@', '%', '#', '$', '&',
  '日', '田', '目', 'Ш', 'Ж', '0', '8', 'B', 'M', 'W', 'Q', '@', '%', '#', '$', '&',
  '日', '田', '0', '8', 'B', '@', '#', '%', '日', '田', '0', '8', 'B', '@', '#', '%',
  '日', '田', '0', '8', 'B', '@', '#', '%', '日', '田', '0', '8', 'B', '@', '#', '%',
];

export class EvaMatrixFace {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;

  // 3D Head Scene
  private headScene: THREE.Scene;
  private headCamera: THREE.PerspectiveCamera;
  private headGroup: THREE.Group;
  private headMesh: THREE.Mesh;
  private headRenderTarget: THREE.WebGLRenderTarget;

  // Vertex Buffers
  private rawModelPositions: Float32Array;
  private basePositions: Float32Array;
  private currentPositions: Float32Array;
  private baseNormals: Float32Array;
  private currentNormals: Float32Array;
  private vertexCount: number;
  private geometry: THREE.BufferGeometry;
  private posAttr: THREE.BufferAttribute;
  private normAttr: THREE.BufferAttribute;

  // Post-Processing Screen Quad
  private postScene: THREE.Scene;
  private postCamera: THREE.OrthographicCamera;
  private postMaterial: THREE.ShaderMaterial;
  private glyphTexture: THREE.CanvasTexture;

  // Persona State
  private currentPersona: MatrixPersona = 'eva';

  // Rotation, Dragging & Elastic Spring-Return Physics
  private isDragging = false;
  private lastDragX = 0;
  private lastDragY = 0;
  private dragRotX = 0;
  private dragRotY = 0;
  private hoverRotX = 0;
  private hoverRotY = 0;
  private currentRotX = 0;
  private currentRotY = 0;
  private mouseX = 0;
  private mouseY = 0;

  // Expressions & Speech
  private mouthOpen = 0;
  private targetMouthOpen = 0;
  private blinkAmount = 0;
  private lastBlinkTime = 0;
  private nextBlinkInterval = 3200;
  private isSpeaking = false;
  private speechTimer = 0;

  // Audio Reactivity
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioFreqData: Uint8Array | null = null;
  private audioLevel = 0;

  // Real FPS Tracking
  private frameCount = 0;
  private lastFpsTime = 0;
  private currentFps = 60;
  private onFpsCallback: ((fps: number) => void) | null = null;
  private onSubtitleCallback: ((text: string) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x010402, 1);
    this.container.appendChild(this.renderer.domElement);

    const w = window.innerWidth;
    const h = window.innerHeight;

    // 2. Offscreen Render Target for 3D Head Buffer
    this.headRenderTarget = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });

    // 3. Head Scene & Camera
    this.headScene = new THREE.Scene();
    this.headCamera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    this.headGroup = new THREE.Group();
    this.headScene.add(this.headGroup);

    // 4. Build Filtered High-Fidelity Pinscreen Geometry
    const indexMap = new Int32Array(HEAD_N).fill(-1);
    let vCount = 0;
    for (let i = 0; i < HEAD_N; i++) {
      if (HEAD_POS[i * 3 + 1] >= -0.48) {
        indexMap[i] = vCount++;
      }
    }
    this.vertexCount = vCount;

    this.rawModelPositions = new Float32Array(vCount * 3);
    this.basePositions = new Float32Array(vCount * 3);
    this.currentPositions = new Float32Array(vCount * 3);
    this.baseNormals = new Float32Array(vCount * 3);
    this.currentNormals = new Float32Array(vCount * 3);

    let vIdx = 0;
    for (let i = 0; i < HEAD_N; i++) {
      const py = HEAD_POS[i * 3 + 1];
      if (py < -0.48) continue;
      // Pre-orient: Flip 180° around Y (x→-x, z→-z) so face points directly at camera (+Z)
      const px = -HEAD_POS[i * 3];
      const pz = -HEAD_POS[i * 3 + 2];
      const nx = -HEAD_NRM[i * 3];
      const ny = HEAD_NRM[i * 3 + 1];
      const nz = -HEAD_NRM[i * 3 + 2];

      this.rawModelPositions[vIdx * 3] = px;
      this.rawModelPositions[vIdx * 3 + 1] = py;
      this.rawModelPositions[vIdx * 3 + 2] = pz;

      this.basePositions[vIdx * 3] = px;
      this.basePositions[vIdx * 3 + 1] = py;
      this.basePositions[vIdx * 3 + 2] = pz;

      this.currentPositions[vIdx * 3] = px;
      this.currentPositions[vIdx * 3 + 1] = py;
      this.currentPositions[vIdx * 3 + 2] = pz;

      this.baseNormals[vIdx * 3] = nx;
      this.baseNormals[vIdx * 3 + 1] = ny;
      this.baseNormals[vIdx * 3 + 2] = nz;

      this.currentNormals[vIdx * 3] = nx;
      this.currentNormals[vIdx * 3 + 1] = ny;
      this.currentNormals[vIdx * 3 + 2] = nz;

      vIdx++;
    }

    const indices: number[] = [];
    for (let t = 0; t < HEAD_TRI_COUNT; t++) {
      const i0 = indexMap[HEAD_TRI[t * 3]];
      const i1 = indexMap[HEAD_TRI[t * 3 + 1]];
      const i2 = indexMap[HEAD_TRI[t * 3 + 2]];
      if (i0 >= 0 && i1 >= 0 && i2 >= 0) {
        indices.push(i0, i1, i2);
      }
    }

    this.geometry = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.currentPositions, 3);
    this.normAttr = new THREE.BufferAttribute(this.currentNormals, 3);
    this.geometry.setAttribute('position', this.posAttr);
    this.geometry.setAttribute('normal', this.normAttr);
    this.geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));

    // Custom 3D Head Shader
    const headShaderMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vLocalPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vLocalPosition = position;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vLocalPosition;

        void main() {
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vViewPosition);

          // 3-point Studio Rig: Key (upper-right), Fill (left), Sky (top)
          vec3 L1 = normalize(vec3(0.45, 0.55, 0.70));
          vec3 L2 = normalize(vec3(-0.55, 0.15, 0.45));
          vec3 L3 = normalize(vec3(0.0, 1.0, 0.30));

          float diff1 = max(0.0, dot(N, L1));
          float diff2 = max(0.0, dot(N, L2));
          float sky = max(0.0, dot(N, L3)) * 0.20;
          float rim = pow(1.0 - max(0.0, dot(N, V)), 2.4);

          vec3 H1 = normalize(L1 + V);
          float spec = pow(max(0.0, dot(N, H1)), 28.0);

          float luma = 0.22 + 0.68 * pow(diff1, 1.35) + 0.22 * diff2 + sky + spec * 0.65 + rim * 0.35;

          // Anatomical cavity darkening for deep sockets and nose hollows
          if (N.z < 0.25) {
            luma *= max(0.18, N.z / 0.25);
          }

          // Under-jaw shading
          if (vLocalPosition.y < -0.36) {
            luma *= 0.40;
          }

          // Smooth neck cut fade
          float neckAlpha = smoothstep(-0.46, -0.32, vLocalPosition.y);

          gl_FragColor = vec4(clamp(luma, 0.05, 1.0), clamp(spec, 0.0, 1.0), clamp(rim, 0.0, 1.0), neckAlpha);
        }
      `,
      side: THREE.DoubleSide,
    });

    this.headMesh = new THREE.Mesh(this.geometry, headShaderMat);
    this.headGroup.add(this.headMesh);

    this.applyPersonaGeometry('eva');
    this.updateCameraFraming();

    // 5. Generate Density-Ordered 256-Glyph Matrix Texture Atlas
    this.glyphTexture = this.generateGlyphAtlas();

    // 6. Fullscreen Post-Processing Screen Quad
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const theme = PERSONA_THEMES[this.currentPersona];
    const postQuadGeom = new THREE.PlaneGeometry(2, 2);
    this.postMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uHeadTexture: { value: this.headRenderTarget.texture },
        uGlyphTexture: { value: this.glyphTexture },
        uResolution: { value: new THREE.Vector2(w, h) },
        uTime: { value: 0.0 },
        uAudioLevel: { value: 0.0 },
        uCellSize: { value: new THREE.Vector2(11.0, 18.0) },
        uPrimaryColor: { value: theme.primary },
        uHighlightColor: { value: theme.highlight },
        uDarkColor: { value: theme.dark },
        uRainSpeedMult: { value: theme.rainSpeed },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uHeadTexture;
        uniform sampler2D uGlyphTexture;
        uniform vec2 uResolution;
        uniform float uTime;
        uniform float uAudioLevel;
        uniform vec2 uCellSize;
        uniform vec3 uPrimaryColor;
        uniform vec3 uHighlightColor;
        uniform vec3 uDarkColor;
        uniform float uRainSpeedMult;
        varying vec2 vUv;

        float hash(float n) {
          return fract(sin(n) * 43758.5453123);
        }

        float hash2(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec2 pixelCoord = gl_FragCoord.xy;
          vec2 cellCoord = floor(pixelCoord / uCellSize);
          vec2 charUv = fract(pixelCoord / uCellSize);

          vec2 cellCenterUv = (cellCoord + 0.5) * uCellSize / uResolution;

          vec4 headData = texture2D(uHeadTexture, cellCenterUv);
          bool isHead = headData.a > 0.08;

          // Multi-layer Matrix Rain Streams
          float col = cellCoord.x;
          float speed1 = (15.0 + hash(col * 5.17) * 22.0) * uRainSpeedMult;
          float trail1 = 15.0 + hash(col * 23.3) * 24.0;
          float phase1 = hash(col * 17.5) * 160.0;
          float totalH1 = (uResolution.y / uCellSize.y) + trail1 * 2.0;

          float dropY1 = totalH1 - mod(uTime * speed1 + phase1, totalH1) - trail1;
          float dist1 = dropY1 - cellCoord.y;

          float rainFactor = 0.0;
          bool isRainHead = false;

          if (dist1 >= 0.0 && dist1 < trail1) {
            if (dist1 < 1.0) {
              isRainHead = true;
              rainFactor = 1.0;
            } else {
              rainFactor = pow(1.0 - (dist1 / trail1), 1.7);
            }
          }

          float speed2 = (11.0 + hash(col * 11.3) * 14.0) * uRainSpeedMult;
          float trail2 = 12.0 + hash(col * 41.7) * 16.0;
          float phase2 = hash(col * 29.1) * 220.0;
          float totalH2 = (uResolution.y / uCellSize.y) + trail2 * 2.0;
          float dropY2 = totalH2 - mod(uTime * speed2 + phase2, totalH2) - trail2;
          float dist2 = dropY2 - cellCoord.y;
          if (dist2 >= 0.0 && dist2 < trail2) {
            rainFactor = max(rainFactor, pow(1.0 - (dist2 / trail2), 2.0) * 0.6);
          }

          float ambientCode = hash2(cellCoord + floor(uTime * 3.5)) * 0.08;

          vec3 charColor = vec3(0.0);
          float charIndex = 0.0;
          float alpha = 1.0;

          if (isHead) {
            float luma = headData.r;
            float spec = headData.g;
            float rim = headData.b;

            // Audio frequency ripple
            luma += uAudioLevel * sin(cellCoord.y * 0.28 - uTime * 8.0) * 0.25;
            luma = clamp(luma, 0.04, 1.0);

            float mutation = floor(uTime * 10.0 + hash2(cellCoord) * 16.0);

            if (luma < 0.18) {
              charIndex = mod(mutation, 64.0);
            } else if (luma < 0.42) {
              charIndex = 64.0 + mod(mutation, 64.0);
            } else if (luma < 0.72) {
              charIndex = 128.0 + mod(mutation, 64.0);
            } else {
              charIndex = 192.0 + mod(mutation, 64.0);
            }

            if (luma > 0.62 || spec > 0.32) {
              float whiteMix = clamp((luma - 0.62) / 0.38 + spec * 0.8, 0.0, 1.0);
              charColor = mix(uPrimaryColor, uHighlightColor, whiteMix);
            } else if (luma > 0.20) {
              float midMix = (luma - 0.20) / 0.42;
              charColor = mix(uDarkColor * 1.5, uPrimaryColor, midMix);
            } else {
              charColor = uDarkColor * (luma / 0.20);
            }

            charColor *= 1.40;

            float edgeFade = smoothstep(0.0, 0.25, 1.0 - rim * 0.5);
            alpha = clamp(edgeFade * headData.a, 0.40, 1.0);

            if (rainFactor > 0.15) {
              charColor += rainFactor * uPrimaryColor * 0.85;
              if (isRainHead) {
                charColor = uHighlightColor;
              }
            }
          } else {
            float mutation = floor(uTime * 8.0 + hash2(cellCoord) * 12.0);
            charIndex = 64.0 + mod(hash2(cellCoord) * 128.0 + mutation, 128.0);

            if (isRainHead) {
              charColor = uHighlightColor;
              alpha = 1.0;
            } else if (rainFactor > 0.01) {
              charColor = uPrimaryColor * rainFactor;
              alpha = rainFactor * 0.85;
            } else {
              charColor = uPrimaryColor * 0.5 * ambientCode;
              alpha = ambientCode * 1.6;
            }
          }

          float colIdx = mod(floor(charIndex), 16.0);
          float rowIdx = floor(charIndex / 16.0);

          vec2 paddedCharUv = clamp((charUv - 0.08) / 0.84, 0.0, 1.0);
          vec2 atlasUv = vec2(
            (colIdx + paddedCharUv.x) / 16.0,
            (rowIdx + paddedCharUv.y) / 16.0
          );

          float glyphIntensity = texture2D(uGlyphTexture, atlasUv).r;
          vec3 finalColor = charColor * glyphIntensity * alpha;

          // Subtle CRT Phosphor Scanlines
          float scanline = 0.94 + 0.06 * sin(pixelCoord.y * 1.8);
          finalColor *= scanline;

          // Subtle Vignette
          vec2 vPos = gl_FragCoord.xy / uResolution;
          float vig = smoothstep(1.35, 0.38, length((vPos - 0.5) * 1.45));
          finalColor *= vig;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });

    const postQuad = new THREE.Mesh(postQuadGeom, this.postMaterial);
    this.postScene.add(postQuad);

    // 7. Event Listeners & Elastic Spring Controls
    this.setupEventListeners();

    // 8. Start Render Loop
    this.animate(0);
  }

  // ─── Persona Geometry Morphing ───────────────────────────────
  private applyPersonaGeometry(persona: MatrixPersona): void {
    const theme = PERSONA_THEMES[persona];
    const count = this.vertexCount;
    const raw = this.rawModelPositions;
    const base = this.basePositions;

    for (let i = 0; i < count; i++) {
      let px = raw[i * 3];
      let py = raw[i * 3 + 1];
      let pz = raw[i * 3 + 2];

      // Morph jaw and chin
      if (py < 0.1) {
        px *= theme.jawScale;
      }
      if (py < -0.15) {
        px *= theme.chinTaper;
      }
      // Morph brow
      if (py > 0.38 && py < 0.50 && pz > 0.26) {
        pz += theme.browLift;
      }

      base[i * 3] = px;
      base[i * 3 + 1] = py;
      base[i * 3 + 2] = pz;
    }
  }

  public setPersona(persona: MatrixPersona): void {
    this.currentPersona = persona;
    const theme = PERSONA_THEMES[persona];

    this.applyPersonaGeometry(persona);

    if (this.postMaterial) {
      this.postMaterial.uniforms.uPrimaryColor.value = theme.primary;
      this.postMaterial.uniforms.uHighlightColor.value = theme.highlight;
      this.postMaterial.uniforms.uDarkColor.value = theme.dark;
      this.postMaterial.uniforms.uRainSpeedMult.value = theme.rainSpeed;
    }
  }

  // ─── Mathematical Centering Across All Devices ───────────────
  private updateCameraFraming(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    this.headCamera.aspect = aspect;

    // Anatomical center of the face (eyes & nose bridge) is at y = 0.18.
    // Placing camera at (0, 0.18, dist) and pointing at (0, 0.18, 0)
    // guarantees absolute mathematical dead-center symmetry!
    if (aspect < 1.0) {
      // Mobile portrait
      const dist = (3.15 / aspect) * 0.70;
      this.headCamera.position.set(0, 0.18, dist);
      this.headGroup.scale.set(1.05, 1.05, 1.05);
    } else if (aspect < 1.5) {
      // Tablet
      this.headCamera.position.set(0, 0.18, 2.85);
      this.headGroup.scale.set(1.15, 1.15, 1.15);
    } else {
      // Desktop widescreen
      this.headCamera.position.set(0, 0.18, 2.50);
      this.headGroup.scale.set(1.28, 1.28, 1.28);
    }

    this.headCamera.lookAt(0, 0.18, 0);
    this.headCamera.updateProjectionMatrix();
  }

  // ─── Matrix Glyph Texture Atlas ──────────────────────────────
  private generateGlyphAtlas(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 22px monospace, "MS Gothic", "Hiragino Sans", "Courier New"';

    const glyphs = DENSITY_GLYPHS;
    for (let i = 0; i < 256; i++) {
      const col = i % 16;
      const row = Math.floor(i / 16);
      const cx = col * 32 + 16;
      const cy = row * 32 + 16;

      const char = glyphs[i] || ' ';
      ctx.fillText(char, cx, cy);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.flipY = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  // ─── Event Listeners & Elastic Spring Physics ────────────────
  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.renderer.setSize(w, h);
      this.headRenderTarget.setSize(w, h);
      this.updateCameraFraming();
      this.postMaterial.uniforms.uResolution.value.set(w, h);

      if (w < 768) {
        this.postMaterial.uniforms.uCellSize.value.set(8.5, 14.5);
      } else {
        this.postMaterial.uniforms.uCellSize.value.set(10.5, 17.5);
      }
    });

    // Mouse Tracking & Drag
    window.addEventListener('mousedown', (e) => {
      // Don't drag if clicking interactive HUD buttons
      if ((e.target as HTMLElement).closest('.interactive')) return;
      this.isDragging = true;
      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;

      if (this.isDragging) {
        const dx = (e.clientX - this.lastDragX) * 0.008;
        const dy = (e.clientY - this.lastDragY) * 0.008;
        this.dragRotY += dx;
        this.dragRotX += dy;
        this.lastDragX = e.clientX;
        this.lastDragY = e.clientY;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Touch Tracking & Drag (Mobile)
    window.addEventListener('touchstart', (e) => {
      if ((e.target as HTMLElement).closest('.interactive')) return;
      if (e.touches.length > 0) {
        this.isDragging = true;
        this.lastDragX = e.touches[0].clientX;
        this.lastDragY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        this.mouseX = (touch.clientX / window.innerWidth) * 2 - 1;
        this.mouseY = -(touch.clientY / window.innerHeight) * 2 + 1;

        if (this.isDragging) {
          const dx = (touch.clientX - this.lastDragX) * 0.008;
          const dy = (touch.clientY - this.lastDragY) * 0.008;
          this.dragRotY += dx;
          this.dragRotX += dy;
          this.lastDragX = touch.clientX;
          this.lastDragY = touch.clientY;
        }
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  // ─── Facial Deformation & Animation Loop ─────────────────────
  private updateFacialPhysics(dt: number, time: number): void {
    // 1. Continuous Gaze & Head Tracking
    this.hoverRotY = this.mouseX * 0.35 + Math.sin(time * 0.8) * 0.035;
    this.hoverRotX = -this.mouseY * 0.25 + Math.cos(time * 0.6) * 0.025;

    // 2. Elastic Spring Return to Center when user releases drag
    if (!this.isDragging) {
      this.dragRotX *= 0.88; // Damped elastic spring
      this.dragRotY *= 0.88;
      if (Math.abs(this.dragRotX) < 0.0001) this.dragRotX = 0;
      if (Math.abs(this.dragRotY) < 0.0001) this.dragRotY = 0;
    }

    const targetRotX = this.hoverRotX + this.dragRotX;
    const targetRotY = this.hoverRotY + this.dragRotY;

    this.currentRotX += (targetRotX - this.currentRotX) * 0.10;
    this.currentRotY += (targetRotY - this.currentRotY) * 0.10;

    this.headGroup.rotation.x = this.currentRotX;
    this.headGroup.rotation.y = this.currentRotY;
    this.headGroup.rotation.z = -this.currentRotY * 0.10;

    // Organic Breathing
    const breath = Math.sin(time * 1.8) * 0.008;
    this.headGroup.position.y = breath;

    // 3. Natural Eye Blinking Physics
    const now = performance.now();
    if (now - this.lastBlinkTime > this.nextBlinkInterval) {
      this.blinkAmount = 1.0;
      this.lastBlinkTime = now;
      this.nextBlinkInterval = 2600 + Math.random() * 3200;
    }
    if (this.blinkAmount > 0) {
      this.blinkAmount -= dt * 7.5;
      if (this.blinkAmount < 0) this.blinkAmount = 0;
    }

    // 4. Speech Visemes Lip-Sync
    if (this.isSpeaking) {
      this.speechTimer += dt * 14.0;
      const viseme = Math.sin(this.speechTimer) * 0.5 + Math.sin(this.speechTimer * 2.3) * 0.3 + 0.4;
      this.targetMouthOpen = Math.max(0, viseme * 0.55);
    } else if (this.audioLevel > 0.02) {
      this.targetMouthOpen = Math.min(0.65, this.audioLevel * 1.6);
    } else {
      this.targetMouthOpen = 0;
    }

    this.mouthOpen += (this.targetMouthOpen - this.mouthOpen) * 0.22;

    // 5. Apply Anatomical Gaussian Deformations
    const pos = this.currentPositions;
    const base = this.basePositions;
    const count = this.vertexCount;
    const lidClose = this.blinkAmount;
    const mOpen = this.mouthOpen;

    for (let i = 0; i < count; i++) {
      const px = base[i * 3];
      const py = base[i * 3 + 1];
      const pz = base[i * 3 + 2];

      let dy = 0;
      let dz = 0;

      // Eyelid blink
      if (lidClose > 0.01) {
        for (const eye of [EYE_L, EYE_R]) {
          const w = gauss(px - eye.x, py - eye.y, pz - eye.z, 0.065, 0.05, 0.5);
          if (w > 0.01) {
            dy += (eye.y - py) * w * lidClose * 0.35;
            dz -= 0.020 * w * lidClose;
          }
        }
      }

      // Mouth opening (Jaw Drop)
      if (mOpen > 0.01) {
        const wMouth = gauss(px - MOUTH.x, py - MOUTH.y, pz - MOUTH.z, 0.07, 0.06, 0.5);
        if (wMouth > 0.01) {
          dz -= mOpen * 0.045 * wMouth;
          dy -= mOpen * 0.025 * wMouth;
        }
      }

      pos[i * 3] = px;
      pos[i * 3 + 1] = py + dy;
      pos[i * 3 + 2] = pz + dz;
    }

    this.posAttr.needsUpdate = true;
  }

  // ─── Main Render Loop with Real FPS ──────────────────────────
  private lastTime = 0;

  private animate = (timestamp: number): void => {
    requestAnimationFrame(this.animate);

    const now = timestamp * 0.001;
    const dt = Math.min(now - (this.lastTime || now), 0.1);
    this.lastTime = now;

    // Measure Real Live FPS
    this.frameCount++;
    if (now - this.lastFpsTime >= 0.5) {
      this.currentFps = Math.round(this.frameCount / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
      if (this.onFpsCallback) {
        this.onFpsCallback(this.currentFps);
      }
    }

    // Process Microphone FFT if active
    if (this.analyser && this.audioFreqData) {
      this.analyser.getByteFrequencyData(this.audioFreqData as any);
      let sum = 0;
      for (let i = 0; i < 32; i++) {
        sum += this.audioFreqData[i];
      }
      this.audioLevel = sum / (32 * 255);
      this.postMaterial.uniforms.uAudioLevel.value = this.audioLevel;
    }

    // Animate 3D Head & Expressions
    this.updateFacialPhysics(dt, now);

    // Pass 1: Render 3D Head to Offscreen Target
    this.renderer.setRenderTarget(this.headRenderTarget);
    this.renderer.clear();
    this.renderer.render(this.headScene, this.headCamera);

    // Pass 2: Render Post-Processing Matrix Code Screen Quad
    this.renderer.setRenderTarget(null);
    this.postMaterial.uniforms.uTime.value = now;
    this.renderer.render(this.postScene, this.postCamera);
  };

  // ─── Public API ──────────────────────────────────────────────

  public setFpsCallback(cb: (fps: number) => void): void {
    this.onFpsCallback = cb;
  }

  public setSubtitleCallback(cb: (text: string) => void): void {
    this.onSubtitleCallback = cb;
  }

  public async enableMicrophone(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioCtx.createMediaStreamSource(stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      this.audioFreqData = new Uint8Array(this.analyser.frequencyBinCount);
      source.connect(this.analyser);
      return true;
    } catch (err) {
      console.warn('[Eva Face] Microphone access denied or error:', err);
      return false;
    }
  }

  public speak(text: string, onComplete?: () => void): void {
    if (this.onSubtitleCallback) {
      this.onSubtitleCallback(text);
    }

    if (!('speechSynthesis' in window)) {
      console.warn('[Eva Face] SpeechSynthesis not supported in browser');
      if (onComplete) onComplete();
      return;
    }

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.02;
    utter.pitch = 1.08;

    const voices = window.speechSynthesis.getVoices();
    const ruVoice = voices.find((v) => v.lang.includes('ru') || v.name.includes('Russian'));
    if (ruVoice) utter.voice = ruVoice;

    this.isSpeaking = true;

    utter.onend = () => {
      this.isSpeaking = false;
      if (onComplete) onComplete();
    };

    utter.onerror = () => {
      this.isSpeaking = false;
      if (onComplete) onComplete();
    };

    window.speechSynthesis.speak(utter);
  }
}
