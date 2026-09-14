/**
 * matrix_face.ts — Pure 3D Matrix Code Substance Face of Eva.
 *
 * Core Concept:
 * The screen is a flat 2D monospace grid of authentic Matrix code symbols
 * (Japanese Katakana, digits, math symbols, density glyphs).
 * Through real-time 3D lighting, surface normals, depth, shadows, highlights,
 * and transparency, a living, breathing 3D face of Eva emerges out of the code.
 *
 * Model:
 * Uses the high-fidelity Pinscreen Generic Head model (10.2K vertices, 20.3K triangles)
 * with baked studio normals, neck-crop, and anatomical Gaussian expression deforms.
 */

import * as THREE from 'three';
import { HEAD_POS, HEAD_NRM, HEAD_TRI, HEAD_N, HEAD_TRI_COUNT } from './headmodel.js';

// Landmark coordinates in model space (y-up, +z toward camera)
const EYE_L = { x: -0.137, y: 0.336, z: 0.36 };
const EYE_R = { x: 0.137, y: 0.336, z: 0.36 };
const BROW_L = { x: -0.12, y: 0.445, z: 0.33 };
const BROW_R = { x: 0.12, y: 0.445, z: 0.33 };
const MOUTH = { x: 0, y: 0.015, z: 0.45 };
const MOUTH_L = { x: -0.13, y: 0.015, z: 0.42 };
const MOUTH_R = { x: 0.13, y: 0.015, z: 0.42 };

function gauss(dx: number, dy: number, dz: number, sx: number, sy: number, sz: number): number {
  return Math.exp(-(dx * dx / (2 * sx * sx) + dy * dy / (2 * sy * sy) + dz * dz / (2 * sz * sz)));
}

// Authentic Matrix characters arranged into 4 tiers of 64 characters:
// Tier 0 (0..63): Deep shadow sparse punctuation (used in deep eye pits and creases)
// Tier 1 (64..127): Matrix symbols & digits (used in soft shadow contours)
// Tier 2 (128..191): Authentic Japanese Katakana (used across all illuminated face planes)
// Tier 3 (192..255): Heavy bold blocks & matrix glyphs (specular peaks & facial ridges)
const DENSITY_GLYPHS = [
  // Tier 0 (0..63): Deep shadows & sockets
  ':', '·', '・', '.', '`', '\'', '-', '^', '~', '"', ':', '·', '・', '.', ':', '·',
  ':', '·', '・', '.', '`', '\'', '-', '^', '~', '"', ':', '·', '・', '.', ':', '·',
  '·', ':', '-', '·', ':', '-', '·', ':', '-', '·', ':', '-', '·', ':', '-', '·',
  '·', ':', '-', '·', ':', '-', '·', ':', '-', '·', ':', '-', '·', ':', '-', '·',

  // Tier 1 (64..127): Matrix symbols, digits, hex
  '1', '2', '3', '4', '5', '7', '8', '9', '0', '+', '-', '*', '=', '<', '>', '/',
  '\\', '|', '¦', 'T', 'L', 'J', 'I', 'F', 'C', 'X', 'Z', 'V', '1', '7', '0', '3',
  '2', '4', '5', '8', '9', '+', '*', '=', '<', '>', '|', '¦', '1', '7', '0', '9',
  '1', '2', '3', '4', '5', '7', '8', '9', '0', '+', '-', '*', '=', '<', '>', '/',

  // Tier 2 (128..191): Japanese Katakana (The iconic Matrix alphabet)
  'ｱ', 'ｲ', 'ｳ', 'ｴ', 'ｵ', 'ｶ', 'ｷ', 'ｸ', 'ｹ', 'ｺ', 'ｻ', 'ｼ', 'ｽ', 'ｾ', 'ｿ', 'ﾀ',
  'ﾁ', 'ﾂ', 'ﾃ', 'ﾄ', 'ﾅ', 'ﾆ', 'ﾇ', 'ﾈ', 'ﾉ', 'ﾊ', 'ﾋ', 'ﾌ', 'ﾍ', 'ﾎ', 'ﾏ', 'ﾐ',
  'ﾑ', 'ﾒ', 'ﾓ', 'ﾔ', 'ﾕ', 'ﾖ', 'ﾗ', 'ﾘ', 'ﾙ', 'ﾚ', 'ﾛ', 'ﾜ', 'ﾝ', 'ｱ', 'ｶ', 'ｻ',
  'ｼ', 'ﾀ', 'ﾅ', 'ﾊ', 'ﾋ', 'ﾏ', 'ﾐ', 'ﾑ', 'ﾗ', 'ﾘ', 'ﾜ', 'ﾂ', 'ﾃ', 'ﾄ', 'ﾆ', 'ﾇ',

  // Tier 3 (192..255): Heavy dense glyphs (specular peaks & highlights)
  '日', '田', '目', 'Ш', 'Ж', '0', '8', 'B', 'M', 'W', 'Q', '@', '%', '#', '$', '&',
  '日', '田', '目', 'Ш', 'Ж', '0', '8', 'B', 'M', 'W', 'Q', '@', '%', '#', '$', '&',
  '日', '田', '0', '8', 'B', '@', '#', '%', '日', '田', '0', '8', 'B', '@', '#', '%',
  '日', '田', '0', '8', 'B', '@', '#', '%', '日', '田', '0', '8', 'B', '@', '#', '%',
];

export class EvaMatrixFace {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;

  // 3D Head Scene (Rendered to Offscreen Target)
  private headScene: THREE.Scene;
  private headCamera: THREE.PerspectiveCamera;
  private headGroup: THREE.Group;
  private headMesh: THREE.Mesh;
  private headRenderTarget: THREE.WebGLRenderTarget;

  // Vertex Arrays
  private basePositions: Float32Array;
  private currentPositions: Float32Array;
  private baseNormals: Float32Array;
  private currentNormals: Float32Array;
  private vertexCount: number;
  private geometry: THREE.BufferGeometry;
  private posAttr: THREE.BufferAttribute;
  private normAttr: THREE.BufferAttribute;

  // Post-Processing Scene (Matrix Code Screen Quad)
  private postScene: THREE.Scene;
  private postCamera: THREE.OrthographicCamera;
  private postMaterial: THREE.ShaderMaterial;
  private glyphTexture: THREE.CanvasTexture;

  // Animation & Physics State
  private mouseX = 0;
  private mouseY = 0;
  private targetRotX = 0;
  private targetRotY = 0;
  private currentRotX = 0;
  private currentRotY = 0;

  // Expressions & Visemes
  private mouthOpen = 0;
  private targetMouthOpen = 0;
  private smile = 0;
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

  // Subtitles & Voice Callbacks
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

    // 4. Build High-Fidelity Filtered Pinscreen Head Geometry
    const indexMap = new Int32Array(HEAD_N).fill(-1);
    let vCount = 0;
    for (let i = 0; i < HEAD_N; i++) {
      if (HEAD_POS[i * 3 + 1] >= -0.48) {
        indexMap[i] = vCount++;
      }
    }
    this.vertexCount = vCount;

    this.basePositions = new Float32Array(vCount * 3);
    this.currentPositions = new Float32Array(vCount * 3);
    this.baseNormals = new Float32Array(vCount * 3);
    this.currentNormals = new Float32Array(vCount * 3);

    let vIdx = 0;
    for (let i = 0; i < HEAD_N; i++) {
      const py = HEAD_POS[i * 3 + 1];
      if (py < -0.48) continue;
      // Flip 180° around Y (x→-x, z→-z) so face points toward camera (+Z)
      const px = -HEAD_POS[i * 3];
      const pz = -HEAD_POS[i * 3 + 2];
      const nx = -HEAD_NRM[i * 3];
      const ny = HEAD_NRM[i * 3 + 1];
      const nz = -HEAD_NRM[i * 3 + 2];

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

    // Custom 3D Head Shader: Studio two-light rig with cavity ambient occlusion
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

          // Key light from upper-right, soft fill from left, top skylight
          vec3 L1 = normalize(vec3(0.45, 0.55, 0.70));
          vec3 L2 = normalize(vec3(-0.55, 0.15, 0.45));
          vec3 L3 = normalize(vec3(0.0, 1.0, 0.30));

          float diff1 = max(0.0, dot(N, L1));
          float diff2 = max(0.0, dot(N, L2));
          float sky = max(0.0, dot(N, L3)) * 0.20;
          float rim = pow(1.0 - max(0.0, dot(N, V)), 2.4);

          // Specular highlights (Blinn-Phong)
          vec3 H1 = normalize(L1 + V);
          float spec = pow(max(0.0, dot(N, H1)), 28.0);

          // Sculptural 3D luminance: rich, anatomical depth
          float luma = 0.22 + 0.68 * pow(diff1, 1.35) + 0.22 * diff2 + sky + spec * 0.65 + rim * 0.35;

          // Crisp anatomical cavity darkening (eye sockets, nose sides, jawline)
          if (N.z < 0.25) {
            luma *= max(0.18, N.z / 0.25);
          }

          // Under-jaw shadow: darken below chin
          if (vLocalPosition.y < -0.36) {
            luma *= 0.40;
          }

          // Smooth neck cut fade
          float neckAlpha = smoothstep(-0.46, -0.32, vLocalPosition.y);

          // Pack into RGBA:
          // R = Luminance (0..1)
          // G = Specular highlight (0..1)
          // B = Fresnel Rim (0..1)
          // A = Mask * neckAlpha
          gl_FragColor = vec4(clamp(luma, 0.05, 1.0), clamp(spec, 0.0, 1.0), clamp(rim, 0.0, 1.0), neckAlpha);
        }
      `,
      side: THREE.DoubleSide,
    });

    this.headMesh = new THREE.Mesh(this.geometry, headShaderMat);
    this.headGroup.add(this.headMesh);

    this.updateCameraFraming();

    // 5. Generate Density-Ordered 256-Glyph Matrix Texture Atlas
    this.glyphTexture = this.generateGlyphAtlas();

    // 6. Fullscreen Post-Processing Quad
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const postQuadGeom = new THREE.PlaneGeometry(2, 2);
    this.postMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uHeadTexture: { value: this.headRenderTarget.texture },
        uGlyphTexture: { value: this.glyphTexture },
        uResolution: { value: new THREE.Vector2(w, h) },
        uTime: { value: 0.0 },
        uAudioLevel: { value: 0.0 },
        uCellSize: { value: new THREE.Vector2(11.0, 18.0) },
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
        varying vec2 vUv;

        // Fast Hash helpers
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

          // Center UV for sampling the 3D head buffer
          vec2 cellCenterUv = (cellCoord + 0.5) * uCellSize / uResolution;

          // Sample the 3D Head Render Target
          vec4 headData = texture2D(uHeadTexture, cellCenterUv);
          bool isHead = headData.a > 0.08;

          // Multi-layer Matrix Rain Streams for column cellCoord.x
          float col = cellCoord.x;
          float speed1 = 15.0 + hash(col * 5.17) * 22.0;
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

          // Secondary rain layer for depth
          float speed2 = 11.0 + hash(col * 11.3) * 14.0;
          float trail2 = 12.0 + hash(col * 41.7) * 16.0;
          float phase2 = hash(col * 29.1) * 220.0;
          float totalH2 = (uResolution.y / uCellSize.y) + trail2 * 2.0;
          float dropY2 = totalH2 - mod(uTime * speed2 + phase2, totalH2) - trail2;
          float dist2 = dropY2 - cellCoord.y;
          if (dist2 >= 0.0 && dist2 < trail2) {
            rainFactor = max(rainFactor, pow(1.0 - (dist2 / trail2), 2.0) * 0.6);
          }

          // Ambient background code twinkle
          float ambientCode = hash2(cellCoord + floor(uTime * 3.5)) * 0.08;

          // ─── Character Selection & Color Calculation ───────────────
          vec3 charColor = vec3(0.0);
          float charIndex = 0.0;
          float alpha = 1.0;

          if (isHead) {
            // 3D Head is present in this cell!
            float luma = headData.r;
            float spec = headData.g;
            float rim = headData.b;

            // Audio wave ripple through head
            luma += uAudioLevel * sin(cellCoord.y * 0.28 - uTime * 8.0) * 0.25;
            luma = clamp(luma, 0.04, 1.0);

            // Living code mutation: glyphs cycle over time
            float mutation = floor(uTime * 10.0 + hash2(cellCoord) * 16.0);

            // Perceptual Density & Alphabet Mapping:
            if (luma < 0.18) {
              // Deep shadow hollows: sparse punctuation (Tier 0)
              charIndex = mod(mutation, 64.0);
            } else if (luma < 0.42) {
              // Soft shadow contours: matrix symbols & digits (Tier 1)
              charIndex = 64.0 + mod(mutation, 64.0);
            } else if (luma < 0.72) {
              // Lit face planes: authentic Japanese Katakana (Tier 2)
              charIndex = 128.0 + mod(mutation, 64.0);
            } else {
              // High ridges & specular peaks: dense bold glyphs (Tier 3)
              charIndex = 192.0 + mod(mutation, 64.0);
            }

            // True Matrix Color Palette:
            vec3 baseGreen = vec3(0.0, 1.0, 0.45);
            vec3 darkJade = vec3(0.0, 0.28, 0.08);
            vec3 whiteHot = vec3(1.0, 1.0, 1.0);

            if (luma > 0.62 || spec > 0.32) {
              float whiteMix = clamp((luma - 0.62) / 0.38 + spec * 0.8, 0.0, 1.0);
              charColor = mix(baseGreen, whiteHot, whiteMix);
            } else if (luma > 0.20) {
              float midMix = (luma - 0.20) / 0.42;
              charColor = mix(darkJade * 1.5, baseGreen, midMix);
            } else {
              charColor = darkJade * (luma / 0.20);
            }

            // Boost face radiance
            charColor *= 1.40;

            // Contour transparency: edges fade gracefully into the matrix rain
            float edgeFade = smoothstep(0.0, 0.25, 1.0 - rim * 0.5);
            alpha = clamp(edgeFade * headData.a, 0.40, 1.0);

            // When a falling rain drop intersects the face, create an electric waterfall pulse!
            if (rainFactor > 0.15) {
              charColor += rainFactor * vec3(0.5, 1.0, 0.6) * 0.85;
              if (isRainHead) {
                charColor = vec3(1.0, 1.0, 1.0);
              }
            }
          } else {
            // Background Digital Matrix Rain
            float mutation = floor(uTime * 8.0 + hash2(cellCoord) * 12.0);
            charIndex = 64.0 + mod(hash2(cellCoord) * 128.0 + mutation, 128.0);

            if (isRainHead) {
              charColor = vec3(1.0, 1.0, 1.0);
              alpha = 1.0;
            } else if (rainFactor > 0.01) {
              charColor = vec3(0.0, 1.0, 0.38) * rainFactor;
              alpha = rainFactor * 0.85;
            } else {
              charColor = vec3(0.0, 0.55, 0.18) * ambientCode;
              alpha = ambientCode * 1.6;
            }
          }

          // Sample glyph from 16x16 atlas texture (flipY = false)
          float colIdx = mod(floor(charIndex), 16.0);
          float rowIdx = floor(charIndex / 16.0);

          // Margins inside cell to keep characters crisp
          vec2 paddedCharUv = clamp((charUv - 0.08) / 0.84, 0.0, 1.0);
          vec2 atlasUv = vec2(
            (colIdx + paddedCharUv.x) / 16.0,
            (rowIdx + paddedCharUv.y) / 16.0
          );

          float glyphIntensity = texture2D(uGlyphTexture, atlasUv).r;

          // Composite final pixel
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

    // 7. Event Listeners & Adaptive Resize
    this.setupEventListeners();

    // 8. Start Render Loop
    this.animate(0);
  }

  private updateCameraFraming(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    this.headCamera.aspect = aspect;

    // Head model bounds: y from -0.48 to +0.83.
    // Anatomical center of the face (eyes/nose) is at y ≈ 0.18.
    if (aspect < 1.0) {
      // Mobile portrait: framed in upper-center of screen
      this.headCamera.position.set(0, 0.18, (3.2 / aspect) * 0.70);
      this.headGroup.scale.set(1.05, 1.05, 1.05);
    } else if (aspect < 1.5) {
      // Tablet / square screen
      this.headCamera.position.set(0, 0.18, 2.9);
      this.headGroup.scale.set(1.15, 1.15, 1.15);
    } else {
      // Desktop widescreen: life-sized, captivating presence
      this.headCamera.position.set(0, 0.18, 2.55);
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
    // Explicitly set flipY = false so row 0 in canvas corresponds to y = 0.0 in UV space
    texture.flipY = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  // ─── Event Listeners ─────────────────────────────────────────
  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.renderer.setSize(w, h);
      this.headRenderTarget.setSize(w, h);
      this.updateCameraFraming();
      this.postMaterial.uniforms.uResolution.value.set(w, h);

      // Adaptive cell size for mobile vs desktop
      if (w < 768) {
        this.postMaterial.uniforms.uCellSize.value.set(8.5, 14.5);
      } else {
        this.postMaterial.uniforms.uCellSize.value.set(10.5, 17.5);
      }
    });

    window.addEventListener('mousemove', (e) => {
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.mouseX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        this.mouseY = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
      }
    }, { passive: true });
  }

  // ─── Facial Deformation & Animation Loop ─────────────────────
  private updateFacialPhysics(dt: number, time: number): void {
    // 1. Smooth Head Tracking with Organic Drift
    this.targetRotY = this.mouseX * 0.35 + Math.sin(time * 0.8) * 0.035;
    this.targetRotX = -this.mouseY * 0.25 + Math.cos(time * 0.6) * 0.025;

    this.currentRotY += (this.targetRotY - this.currentRotY) * 0.09;
    this.currentRotX += (this.targetRotX - this.currentRotX) * 0.09;

    this.headGroup.rotation.y = this.currentRotY;
    this.headGroup.rotation.x = this.currentRotX;
    this.headGroup.rotation.z = -this.currentRotY * 0.10;

    // Organic Breathing
    const breath = Math.sin(time * 1.8) * 0.008;
    this.headGroup.position.y = breath;

    // 2. Natural Eye Blinking Physics
    const now = performance.now();
    if (now - this.lastBlinkTime > this.nextBlinkInterval) {
      this.blinkAmount = 1.0;
      this.lastBlinkTime = now;
      this.nextBlinkInterval = 2600 + Math.random() * 3200;
    }
    if (this.blinkAmount > 0) {
      this.blinkAmount -= dt * 7.5; // Fast closure and reopening
      if (this.blinkAmount < 0) this.blinkAmount = 0;
    }

    // 3. Speech Visemes Lip-Sync
    if (this.isSpeaking) {
      this.speechTimer += dt * 14.0;
      const viseme = Math.sin(this.speechTimer) * 0.5 + Math.sin(this.speechTimer * 2.3) * 0.3 + 0.4;
      this.targetMouthOpen = Math.max(0, viseme * 0.55);
      this.smile = Math.max(0, Math.sin(this.speechTimer * 0.8) * 0.2);
    } else if (this.audioLevel > 0.02) {
      // Direct microphone amplitude modulation
      this.targetMouthOpen = Math.min(0.65, this.audioLevel * 1.6);
      this.smile = 0;
    } else {
      this.targetMouthOpen = 0;
      this.smile = 0;
    }

    this.mouthOpen += (this.targetMouthOpen - this.mouthOpen) * 0.22;

    // 4. Apply Anatomical Gaussian Deformations
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

    // Update GPU buffer
    this.posAttr.needsUpdate = true;
  }

  // ─── Main Render Loop ────────────────────────────────────────
  private lastTime = 0;

  private animate = (timestamp: number): void => {
    requestAnimationFrame(this.animate);

    const now = timestamp * 0.001;
    const dt = Math.min(now - (this.lastTime || now), 0.1);
    this.lastTime = now;

    // 1. Process Microphone FFT if active
    if (this.analyser && this.audioFreqData) {
      this.analyser.getByteFrequencyData(this.audioFreqData as any);
      let sum = 0;
      for (let i = 0; i < 32; i++) {
        sum += this.audioFreqData[i];
      }
      this.audioLevel = sum / (32 * 255);
      this.postMaterial.uniforms.uAudioLevel.value = this.audioLevel;
    }

    // 2. Animate 3D Head & Expressions
    this.updateFacialPhysics(dt, now);

    // 3. Pass 1: Render 3D Head to Offscreen Target
    this.renderer.setRenderTarget(this.headRenderTarget);
    this.renderer.clear();
    this.renderer.render(this.headScene, this.headCamera);

    // 4. Pass 2: Render Post-Processing Matrix Code Screen Quad
    this.renderer.setRenderTarget(null);
    this.postMaterial.uniforms.uTime.value = now;
    this.renderer.render(this.postScene, this.postCamera);
  };

  // ─── Voice & Audio Public Methods ────────────────────────────

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
