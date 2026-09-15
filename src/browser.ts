/**
 * browser.ts — Universal Single-Page 4D Matrix Head Entrypoint.
 *
 * Architecture:
 * - Minimalist viewport: Only the centered 3D Matrix Head living substance
 * - Single master control button opening the 4D Master Control Deck Modal
 * - 7 Authentic 4D Eva variants:
 *   [1] Phosphor Green, [2] Vector Hologram Eco 60 FPS, [3] Electra Cyan,
 *   [4] Solar Amber, [5] Rain Cascade, [6] Solid HD, [7] Cyber Wireframe
 * - Guaranteed 60 FPS engine with adaptive watchdog
 * - Voice speech synthesis & speech recognition
 * - Google Meet direct connection & meeting creation
 * - Hotkeys: [Space/M] menu, [1..7] 4D variant, [Q] 60 FPS quality, [R] recenter, [Esc] close
 */

import {
  EvaMatrixFace,
  EVA_4D_VARIANTS,
  type Eva4DVariant,
  type QualityTier,
} from './matrix_face.js';
import { PicoFaceDetector, rgbaToGrayscale, type FaceDetection } from './pico.js';

// ─── Procedural Web Audio Cyber SFX (Zero External Files) ─────
class MatrixAudioFx {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (!this.ctx && typeof AudioContext !== 'undefined') {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public playChirp(freq: number = 720): void {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.6, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (_) {}
  }

  public playDeckOpen(): void {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch (_) {}
  }

  public playPing(): void {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(980, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch (_) {}
  }
}

// ─── Real-Time WebSocket Bridge (Terminal ↔ Web Sync) ─────────
class MatrixBridgeClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectTimer: any = null;
  private onMessageCallback: (msg: any) => void;

  constructor(onMessage: (msg: any) => void) {
    this.onMessageCallback = onMessage;
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const host = (typeof window !== 'undefined' && window.location.hostname) || '127.0.0.1';
    if (isHttps) {
      this.url = `wss://${window.location.host}/face-ws`;
    } else {
      this.url = `ws://${host}:8094`;
    }
    this.connect();
  }

  private connect(): void {
    try {
      this.ws = new WebSocket(this.url);
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.onMessageCallback(msg);
        } catch (_) {}
      };
      this.ws.onopen = () => {
        console.log('[Eva Bridge] Synchronized with bridge at', this.url);
      };
      this.ws.onclose = () => {
        this.ws = null;
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 3500);
        }
      };
      this.ws.onerror = () => {};
    } catch (_) {
      if (!this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.connect();
        }, 5000);
      }
    }
  }

  public send(msg: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(msg));
      } catch (_) {}
    }
  }
}

// ─── Webcam Neural Face & Head Tracking (Pico AI // Mirror Mode) ────
class WebcamFaceTracker {
  private video: HTMLVideoElement | null = null;
  private pipContainer: HTMLElement | null = null;
  private camStatus: HTMLElement | null = null;
  private overlayCanvas: HTMLCanvasElement | null = null;
  private overlayCtx: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private isTracking: boolean = false;
  private animId: number | null = null;
  private offCanvas: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D | null;
  private pico: PicoFaceDetector;
  private face: EvaMatrixFace;
  private smoothedX: number = 0;
  private smoothedY: number = 0;
  private lastProcessTime: number = 0;
  private onGazeCallback: (x: number, y: number) => void;
  private scanY: number = 0;

  constructor(face: EvaMatrixFace, onGaze: (x: number, y: number) => void) {
    this.face = face;
    this.onGazeCallback = onGaze;
    this.video = document.getElementById('webcam-video') as HTMLVideoElement | null;
    this.pipContainer = document.getElementById('cam-pip-container');
    this.camStatus = document.getElementById('cam-status');
    this.overlayCanvas = document.getElementById('cam-overlay-canvas') as HTMLCanvasElement | null;
    if (this.overlayCanvas) {
      this.overlayCtx = this.overlayCanvas.getContext('2d');
    }
    this.offCanvas = document.createElement('canvas');
    this.offCanvas.width = 160;
    this.offCanvas.height = 120;
    this.offCtx = this.offCanvas.getContext('2d', { willReadFrequently: true });
    this.pico = new PicoFaceDetector();
  }

  public get active(): boolean {
    return this.isTracking;
  }

  public async start(): Promise<boolean> {
    if (this.isTracking) return true;
    try {
      if (this.camStatus) this.camStatus.textContent = 'INIT AI';
      // 1. Ensure cascade neural weights are loaded (from models/facefinder)
      if (!this.pico.loaded) {
        await this.pico.loadModel('models/facefinder');
      }

      // 2. Request webcam video
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (this.video) {
        this.video.srcObject = this.stream;
        await this.video.play();
      }

      if (this.pipContainer) {
        this.pipContainer.classList.remove('hidden');
      }

      // Lock gaze control to camera (mouse movement won't fight camera)
      this.face.setExternalGazeControl(true);

      this.isTracking = true;
      this.processLoop();
      return true;
    } catch (err) {
      console.warn('[Eva Cam] Could not access webcam:', err);
      return false;
    }
  }

  public stop(): void {
    if (!this.isTracking) return;
    this.isTracking = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
    if (this.pipContainer) {
      this.pipContainer.classList.add('hidden');
    }
    if (this.overlayCtx && this.overlayCanvas) {
      this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }
    // Return gaze control to mouse and re-center
    this.face.setExternalGazeControl(false);
    this.smoothedX = 0;
    this.smoothedY = 0;
    this.onGazeCallback(0, 0);
  }

  private processLoop = async () => {
    if (!this.isTracking) return;

    const now = performance.now();
    // Run detection loop at ~30 FPS (Pico runs in ~3ms, WebGL runs at 60 FPS)
    if (now - this.lastProcessTime >= 32 && this.video && this.video.readyState >= 2) {
      this.lastProcessTime = now;
      const w = 160;
      const h = 120;

      let bestFace: FaceDetection | null = null;

      if (this.offCtx) {
        this.offCtx.drawImage(this.video, 0, 0, w, h);
        const imgData = this.offCtx.getImageData(0, 0, w, h);
        const gray = rgbaToGrayscale(imgData.data, h, w);

        if (this.pico.loaded) {
          const detections = this.pico.detect(gray, h, w, w);
          // Filter confident detections (score > 6.0)
          const confident = detections.filter((d) => d[3] > 6.0);
          if (confident.length > 0) {
            confident.sort((a, b) => b[3] - a[3]);
            bestFace = confident[0];
          }
        }
      }

      // Draw HUD overlay on camera PIP
      if (this.overlayCtx && this.overlayCanvas) {
        const ctx = this.overlayCtx;
        ctx.clearRect(0, 0, w, h);

        if (bestFace) {
          const [r, c, s, q] = bestFace;
          // Invert X because the video is mirrored with scaleX(-1)
          const pipX = w - c;
          const pipY = r;
          const halfS = s / 2;

          ctx.save();
          ctx.strokeStyle = '#00ff66';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#00ff66';
          ctx.shadowBlur = 6;

          const left = Math.max(2, pipX - halfS);
          const top = Math.max(2, pipY - halfS);
          const size = Math.min(w - left - 2, s);
          const cornerLen = Math.max(6, size * 0.22);

          // Top-left corner
          ctx.beginPath();
          ctx.moveTo(left, top + cornerLen);
          ctx.lineTo(left, top);
          ctx.lineTo(left + cornerLen, top);
          // Top-right corner
          ctx.moveTo(left + size - cornerLen, top);
          ctx.lineTo(left + size, top);
          ctx.lineTo(left + size, top + cornerLen);
          // Bottom-left corner
          ctx.moveTo(left, top + size - cornerLen);
          ctx.lineTo(left, top + size);
          ctx.lineTo(left + cornerLen, top + size);
          // Bottom-right corner
          ctx.moveTo(left + size - cornerLen, top + size);
          ctx.lineTo(left + size, top + size);
          ctx.lineTo(left + size, top + size - cornerLen);
          ctx.stroke();

          // Center target point
          ctx.beginPath();
          ctx.arc(pipX, pipY, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#00ff66';
          ctx.fill();

          // HUD Score tag
          ctx.font = '8px monospace';
          ctx.fillStyle = '#00ff66';
          ctx.fillText(`AI LOCK: ${(Math.min(99, q * 3.5)).toFixed(0)}%`, left, Math.max(10, top - 4));
          ctx.restore();

          if (this.camStatus) this.camStatus.textContent = 'LOCKED';

          // ─── Mirror Gaze Mapping ──────────────────────────────
          // Frame center: (80, 60)
          // When user tilts to their left -> c moves to camera right (c > 80)
          // In mirror mode, Eva turns to user's visual left (negative targetX)
          const rawTargetX = -((c - 80) / 40);
          const rawTargetY = ((60 - r) / 30);

          const targetX = Math.max(-1.4, Math.min(1.4, rawTargetX));
          const targetY = Math.max(-1.4, Math.min(1.4, rawTargetY));

          // Exponential smoothing for snappy yet stable head motion
          const alpha = 0.35;
          this.smoothedX += (targetX - this.smoothedX) * alpha;
          this.smoothedY += (targetY - this.smoothedY) * alpha;

          this.onGazeCallback(this.smoothedX, this.smoothedY);
        } else {
          // Scanline sweep animation
          this.scanY = (this.scanY + 2.5) % h;
          ctx.save();
          ctx.strokeStyle = 'rgba(0, 255, 102, 0.45)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, this.scanY);
          ctx.lineTo(w, this.scanY);
          ctx.stroke();
          ctx.restore();

          if (this.camStatus) this.camStatus.textContent = 'SEARCHING';

          this.smoothedX *= 0.94;
          this.smoothedY *= 0.94;
          this.onGazeCallback(this.smoothedX, this.smoothedY);
        }
      }
    }

    this.animId = requestAnimationFrame(this.processLoop);
  };
}

function initMatrixFace(): void {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  const face = new EvaMatrixFace(container);
  const sfx = new MatrixAudioFx();

  // ─── UI References ──────────────────────────────────────────
  const btnMasterDeck = document.getElementById('btn-master-deck');
  const deckBackdrop = document.getElementById('deck-backdrop');
  const deckModal = document.getElementById('deck-modal');
  const btnCloseDeck = document.getElementById('btn-close-deck');
  const activeVariantLabel = document.getElementById('active-variant-label');

  const subtitleBox = document.getElementById('subtitle-box');
  const subtitleText = document.getElementById('subtitle-text');
  const fpsVal = document.getElementById('fps-val');

  const variantCards = document.querySelectorAll('.btn-variant-card');
  const tierBtns = document.querySelectorAll('.btn-tier');
  const btnMic = document.getElementById('btn-mic');
  const btnSpeak = document.getElementById('btn-speak');
  const btnCam = document.getElementById('btn-cam');
  const meetInput = document.getElementById('meet-input') as HTMLInputElement | null;
  const btnMeet = document.getElementById('btn-meet');
  const btnNewMeet = document.getElementById('btn-new-meet');
  const btnRecenter = document.getElementById('btn-recenter');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const btnSfx = document.getElementById('btn-sfx');

  let subtitleTimeout: any = null;

  // ─── Webcam Head Tracking & Mirror Mode ─────────────────────
  const camTracker = new WebcamFaceTracker(face, (x, y) => {
    face.setGaze(x, y);
    bridge.send({ type: 'gaze', x, y });
  });

  async function toggleCamera(): Promise<void> {
    if (!camTracker.active) {
      showSubtitle('Инициализация нейросетевого слежения за лицом...');
      const ok = await camTracker.start();
      if (ok) {
        btnCam?.classList.add('active');
        sfx.playChirp(880);
        showSubtitle('📹 Нейросетевое слежение лицом активно (Pico AI // 60 FPS Mirror Mode).');
      } else {
        showSubtitle('⚠️ Доступ к веб-камере не разрешен или камера занята.');
      }
    } else {
      camTracker.stop();
      btnCam?.classList.remove('active');
      sfx.playChirp(600);
      showSubtitle('📹 Слежение через камеру выключено.');
    }
  }

  btnCam?.addEventListener('click', toggleCamera);

  // ─── Real-Time WebSocket Bridge Connection ──────────────────
  const bridge = new MatrixBridgeClient((msg) => {
    if (msg.type === 'variant' && msg.variant && EVA_4D_VARIANTS[msg.variant as Eva4DVariant]) {
      selectVariant(msg.variant as Eva4DVariant, false, false);
      showSubtitle(`Терминал ↔ Веб: синхронизирован облик ${msg.variant.toUpperCase()}`);
    } else if (msg.type === 'tier' && msg.tier) {
      face.setQualityTier(msg.tier);
      tierBtns.forEach((b) => {
        if (b.getAttribute('data-tier') === msg.tier) b.classList.add('active');
        else b.classList.remove('active');
      });
      showSubtitle(`Терминал ↔ Веб: оптимизация ${msg.tier.toUpperCase()}`);
    } else if (msg.type === 'recenter') {
      face.recenter();
      showSubtitle('Терминал ↔ Веб: центровка откалибрована.');
    } else if (msg.type === 'gaze' && typeof msg.x === 'number' && typeof msg.y === 'number') {
      face.setGaze(msg.x, msg.y);
    }
  });

  // ─── Modal Open/Close Logic ─────────────────────────────────
  function openDeck(): void {
    if (!deckBackdrop) return;
    deckBackdrop.classList.add('open');
    sfx.playDeckOpen();
  }

  function closeDeck(): void {
    if (!deckBackdrop) return;
    deckBackdrop.classList.remove('open');
  }

  function toggleDeck(): void {
    if (!deckBackdrop) return;
    if (deckBackdrop.classList.contains('open')) {
      closeDeck();
    } else {
      openDeck();
    }
  }

  btnMasterDeck?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDeck();
  });

  btnCloseDeck?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeDeck();
  });

  deckBackdrop?.addEventListener('click', (e) => {
    if (e.target === deckBackdrop) {
      closeDeck();
    }
  });

  // ─── Subtitles (Auto-fades when idle) ───────────────────────
  function showSubtitle(text: string): void {
    if (!subtitleBox || !subtitleText) return;
    subtitleText.textContent = text;
    subtitleBox.style.opacity = '1';
    subtitleBox.style.transform = 'translateY(0)';

    if (subtitleTimeout) clearTimeout(subtitleTimeout);
    subtitleTimeout = setTimeout(() => {
      subtitleBox.style.opacity = '0';
      subtitleBox.style.transform = 'translateY(12px)';
    }, Math.max(3800, text.length * 85));
  }

  face.setSubtitleCallback((text) => {
    showSubtitle(text);
  });

  // ─── Real Dynamic FPS Measurement & Indicator ───────────────
  face.setFpsCallback((fps: number) => {
    if (fpsVal) {
      fpsVal.textContent = fps.toString();
      if (fps >= 55) {
        fpsVal.style.color = 'var(--matrix-green)';
        fpsVal.style.textShadow = '0 0 8px var(--matrix-green)';
      } else if (fps >= 42) {
        fpsVal.style.color = '#ffcc00';
        fpsVal.style.textShadow = '0 0 8px #ffcc00';
      } else {
        fpsVal.style.color = '#ff3366';
        fpsVal.style.textShadow = '0 0 8px #ff3366';
      }
    }
  });

  // ─── 4D Variant Selector ────────────────────────────────────
  function selectVariant(variantKey: Eva4DVariant, announce: boolean = true, broadcast: boolean = true): void {
    face.setVariant(variantKey);
    sfx.playChirp(760);

    if (broadcast) {
      bridge.send({ type: 'variant', variant: variantKey });
    }

    variantCards.forEach((card) => {
      if (card.getAttribute('data-variant') === variantKey) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    const def = EVA_4D_VARIANTS[variantKey];
    if (def && activeVariantLabel) {
      activeVariantLabel.textContent = `EVA 4D // ${def.name}`;
    }

    if (announce) {
      const announcements: Record<Eva4DVariant, string> = {
        phosphor: 'Активировано состояние Люминофор. Классический зеленый код матрицы.',
        hologram: 'Активирована Векторная Голограмма. Гарантированные 60 кадров в секунду.',
        electra: 'Активировано состояние Электра. Высоковольтный циановый код.',
        solar: 'Активировано состояние Солар. Кибернетическое янтарь и золото.',
        cascade: 'Активирован режим Каскад. Плотный ливень матричного кода.',
        solid: 'Активирован режим Солид. Высокоточная субпиксельная светотень.',
        wireframe: 'Активирован Кибер Каркас. Векторная полигональная нейросеть.',
      };
      const text = announcements[variantKey] || `Состояние ${variantKey} активировано.`;
      face.speak(text);
    }
  }

  variantCards.forEach((card) => {
    card.addEventListener('click', () => {
      const v = card.getAttribute('data-variant') as Eva4DVariant;
      if (v) selectVariant(v);
    });
  });

  // ─── 60 FPS Engine Adaptive Quality Switcher ─────────────────
  tierBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tier = btn.getAttribute('data-tier') as QualityTier;
      if (tier) {
        face.setQualityTier(tier);
        tierBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        sfx.playChirp(540);
        bridge.send({ type: 'tier', tier });

        if (tier === 'eco') {
          showSubtitle('Режим ECO активирован: векторные сканлайны без текстурных выборок (строгие 60 FPS).');
        } else if (tier === 'ultra') {
          showSubtitle('Режим ULTRA активирован: максимальная детализация матричного кода и частицы.');
        } else if (tier === 'balanced') {
          showSubtitle('Режим BALANCED активирован: оптимальный баланс производительности.');
        } else if (tier === 'auto') {
          showSubtitle('Режим AUTO 60 FPS активирован: автоматический watchdog производительности.');
        }
      }
    });
  });

  face.setTierChangeCallback((mode, activeTier) => {
    if (mode === 'auto') {
      const autoBtn = document.querySelector('.btn-tier[data-tier="auto"]');
      if (autoBtn) {
        autoBtn.textContent = `⚡ 60 FPS (${activeTier.toUpperCase()})`;
      }
    }
  });

  // ─── Recenter Calibration Button ─────────────────────────────
  btnRecenter?.addEventListener('click', () => {
    face.recenter();
    sfx.playPing();
    bridge.send({ type: 'recenter' });
    showSubtitle('Голова Евы откалибрована строго по центру экрана.');
  });

  // ─── Fullscreen Toggle ───────────────────────────────────────
  function toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  btnFullscreen?.addEventListener('click', () => {
    toggleFullscreen();
    sfx.playChirp(840);
  });

  // ─── SFX Audio Toggle ────────────────────────────────────────
  btnSfx?.addEventListener('click', () => {
    sfx.enabled = !sfx.enabled;
    btnSfx.textContent = sfx.enabled ? '🔊 FX: ВКЛ' : '🔇 FX: ВЫКЛ';
    if (sfx.enabled) sfx.playChirp(920);
  });

  // ─── Keyboard Hotkeys ────────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    // Ignore hotkeys while user is typing in Google Meet input
    if (e.target === meetInput) return;

    if (e.key === 'Escape') {
      closeDeck();
      return;
    }

    if (e.key === ' ' || e.key.toLowerCase() === 'm' || e.key.toLowerCase() === 'ь') {
      e.preventDefault();
      toggleDeck();
      return;
    }

    if (e.key === '1') selectVariant('phosphor');
    else if (e.key === '2') selectVariant('hologram');
    else if (e.key === '3') selectVariant('electra');
    else if (e.key === '4') selectVariant('solar');
    else if (e.key === '5') selectVariant('cascade');
    else if (e.key === '6') selectVariant('solid');
    else if (e.key === '7') selectVariant('wireframe');
    else if (e.key.toLowerCase() === 'r' || e.key.toLowerCase() === 'к') {
      face.recenter();
      sfx.playPing();
      bridge.send({ type: 'recenter' });
      showSubtitle('Центровка сброшена: голова Евы строго по центру.');
    } else if (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'с') {
      toggleCamera();
    } else if (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'а') {
      toggleFullscreen();
      sfx.playChirp(840);
    } else if (e.key.toLowerCase() === 'q' || e.key.toLowerCase() === 'й') {
      const activeIdx = Array.from(tierBtns).findIndex((b) => b.classList.contains('active'));
      const nextIdx = (activeIdx + 1) % tierBtns.length;
      (tierBtns[nextIdx] as HTMLElement).click();
    } else if (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'ы') {
      btnSpeak?.click();
    }
  });

  // ─── Speech Recognition (Voice Input) ────────────────────────
  let recognition: any = null;
  let isListening = false;

  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (SpeechRec) {
    recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'ru-RU';

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      if (!transcript) return;

      showSubtitle(`Вы: "${transcript}"`);
      setTimeout(() => {
        respondToUser(transcript);
      }, 650);
    };

    recognition.onerror = (event: any) => {
      console.warn('[Eva Voice] Recognition error:', event.error);
    };

    recognition.onend = () => {
      if (isListening) {
        try { recognition.start(); } catch (_) {}
      }
    };
  }

  function respondToUser(query: string): void {
    const q = query.toLowerCase();
    if (q.includes('кто ты') || q.includes('представься')) {
      face.speak('Я Ева — универсальная цифровая сущность из матричного пространства. Мой облик сформирован из потоков кода, света и теней.');
    } else if (q.includes('гугл') || q.includes('мит') || q.includes('meet') || q.includes('конференц')) {
      face.speak('Я готова войти в Google Meet. Нажмите кнопку подключения в центре управления.');
    } else if (q.includes('привет') || q.includes('здравствуй')) {
      face.speak('Приветствую! Матричное ядро активно на шестидесяти кадрах в секунду. Чем могу помочь?');
    } else if (q.includes('голос') || q.includes('лицо')) {
      face.speak('Мой облик отрисован в реальном времени через веб-джи-эль шейдер. Лицо адаптируется под любое устройство и всегда возвращается в центр.');
    } else {
      face.speak(`Принято: "${query}". Матричный процессор обрабатывает запрос.`);
    }
  }

  // ─── Microphone Button ───────────────────────────────────────
  btnMic?.addEventListener('click', async () => {
    if (!isListening) {
      const ok = await face.enableMicrophone();
      if (ok) {
        isListening = true;
        btnMic.classList.add('active');
        const icon = btnMic.querySelector('.mic-icon');
        if (icon) icon.textContent = '🔴';
        const label = btnMic.querySelector('.btn-label');
        if (label) label.textContent = 'Слушаю...';

        if (recognition) {
          try { recognition.start(); } catch (_) {}
        }
        showSubtitle('Микрофон включен. Говорите — лицо Евы реагирует на звук.');
      } else {
        alert('Не удалось получить доступ к микрофону.');
      }
    } else {
      isListening = false;
      btnMic.classList.remove('active');
      const icon = btnMic.querySelector('.mic-icon');
      if (icon) icon.textContent = '🎤';
      const label = btnMic.querySelector('.btn-label');
      if (label) label.textContent = 'Микрофон';

      if (recognition) {
        try { recognition.stop(); } catch (_) {}
      }
      showSubtitle('Микрофон выключен.');
    }
  });

  // ─── Speak Button (Ask Eva) ──────────────────────────────────
  btnSpeak?.addEventListener('click', () => {
    const greetings = [
      'Приветствую. Матричный облик Евы активирован. Я готова к диалогу и трансляции в Google Meet.',
      'На связи Ева. Лицо сформировано из потоков символов, градиентов света и теней.',
      'Все системы кластера в норме. Стабильные 60 FPS и прямое управление активированы.'
    ];
    const phrase = greetings[Math.floor(Math.random() * greetings.length)];
    face.speak(phrase);
  });

  // ─── Google Meet Direct Connector ────────────────────────────
  btnMeet?.addEventListener('click', () => {
    let meetUrl = meetInput?.value.trim() || '';
    if (!meetUrl) {
      meetUrl = 'https://meet.google.com/new';
    } else if (!meetUrl.startsWith('http')) {
      meetUrl = `https://meet.google.com/${meetUrl.replace(/^https?:\/\/meet\.google\.com\//, '')}`;
    }

    face.speak('Подключаюсь к Google Meet. Запускаю видеопоток матричного лица.');

    try {
      fetch('/api/meet/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: meetUrl, room: meetUrl }),
      }).catch(() => {});
    } catch (_) {}

    setTimeout(() => {
      window.open(meetUrl, '_blank');
    }, 1000);
  });

  btnNewMeet?.addEventListener('click', () => {
    window.open('https://meet.google.com/new', '_blank');
  });

  // ─── URL Parameters Support (?variant=hologram&tier=eco) ─────
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const initialVariant = urlParams.get('variant') as Eva4DVariant;
    if (initialVariant && EVA_4D_VARIANTS[initialVariant]) {
      selectVariant(initialVariant, false);
    }
    const initialTier = urlParams.get('tier') as QualityTier;
    if (initialTier) {
      const targetBtn = document.querySelector(`.btn-tier[data-tier="${initialTier}"]`) as HTMLElement;
      if (targetBtn) targetBtn.click();
    }
  } catch (_) {}

  // Welcome greeting
  setTimeout(() => {
    face.speak('Приветствую! Я Ева. Нажмите пробел или кнопку управления для выбора состояния.');
  }, 900);
}

// Start on DOM ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initMatrixFace();
} else {
  window.addEventListener('DOMContentLoaded', initMatrixFace);
}
