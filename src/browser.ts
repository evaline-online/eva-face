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
  const meetInput = document.getElementById('meet-input') as HTMLInputElement | null;
  const btnMeet = document.getElementById('btn-meet');
  const btnNewMeet = document.getElementById('btn-new-meet');
  const btnRecenter = document.getElementById('btn-recenter');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const btnSfx = document.getElementById('btn-sfx');

  let subtitleTimeout: any = null;

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
  function selectVariant(variantKey: Eva4DVariant, announce: boolean = true): void {
    face.setVariant(variantKey);
    sfx.playChirp(760);

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
      showSubtitle('Центровка сброшена: голова Евы строго по центру.');
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
