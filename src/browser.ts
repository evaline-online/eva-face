/**
 * browser.ts — Interactive Minimalist 3D Matrix Face Entrypoint.
 *
 * Minimalist UI:
 * - Only the 3D Matrix Face living substance
 * - Real-time Voice (speech synthesis + speech recognition + mic FFT reactivity)
 * - Google Meet integration (direct link connection & launcher)
 * - Holographic floating green subtitles
 */

import { EvaMatrixFace, PERSONA_THEMES, type MatrixPersona } from './matrix_face.js';

function initMatrixFace(): void {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  const face = new EvaMatrixFace(container);

  // ─── UI References ──────────────────────────────────────────
  const subtitleBox = document.getElementById('subtitle-box');
  const subtitleText = document.getElementById('subtitle-text');
  const btnMic = document.getElementById('btn-mic');
  const btnSpeak = document.getElementById('btn-speak');
  const meetInput = document.getElementById('meet-input') as HTMLInputElement | null;
  const btnMeet = document.getElementById('btn-meet');
  const meetStatus = document.getElementById('meet-status');
  const personaTitle = document.getElementById('persona-title');
  const personaBtns = document.querySelectorAll('.btn-persona');
  const fpsVal = document.getElementById('fps-val');

  let subtitleTimeout: any = null;

  function showSubtitle(text: string): void {
    if (!subtitleBox || !subtitleText) return;
    subtitleText.textContent = text;
    subtitleBox.style.opacity = '1';
    subtitleBox.style.transform = 'translateY(0)';

    if (subtitleTimeout) clearTimeout(subtitleTimeout);
    subtitleTimeout = setTimeout(() => {
      subtitleBox.style.opacity = '0';
      subtitleBox.style.transform = 'translateY(10px)';
    }, Math.max(3500, text.length * 80));
  }

  face.setSubtitleCallback((text) => {
    showSubtitle(text);
  });

  // ─── Real Dynamic FPS Display ────────────────────────────────
  face.setFpsCallback((fps: number) => {
    if (fpsVal) {
      fpsVal.textContent = fps.toString();
    }
  });

  // ─── Multi-Persona Switcher ──────────────────────────────────
  function selectPersona(personaKey: MatrixPersona, announce: boolean = true): void {
    face.setPersona(personaKey);

    personaBtns.forEach((b) => {
      if (b.getAttribute('data-persona') === personaKey) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    const theme = PERSONA_THEMES[personaKey];
    if (theme && personaTitle) {
      personaTitle.textContent = `${theme.title} // 3D CORE`;
    }

    if (announce) {
      const names: Record<MatrixPersona, string> = {
        eva: 'Активирован протокол Ева. Зеленый матричный люминофор.',
        adam: 'Активирован протокол Адам. Кибернетическое золото и строгие черты.',
        neo: 'Активирован протокол Нео. Электрический циановый код.',
        rain: 'Активирован режим Дождь. Чистый поток матричного кода.'
      };
      face.speak(names[personaKey]);
    }
  }

  personaBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = btn.getAttribute('data-persona') as MatrixPersona;
      if (p) selectPersona(p);
    });
  });

  // ─── Keyboard Hotkeys (1..4 personas, M mic, S speak) ────────
  window.addEventListener('keydown', (e) => {
    if (e.target === meetInput) return;

    if (e.key === '1') {
      selectPersona('eva');
    } else if (e.key === '2') {
      selectPersona('adam');
    } else if (e.key === '3') {
      selectPersona('neo');
    } else if (e.key === '4') {
      selectPersona('rain');
    } else if (e.key === 'm' || e.key === 'ь') {
      btnMic?.click();
    } else if (e.key === 's' || e.key === 'ы') {
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

      // Natural response logic
      setTimeout(() => {
        respondToUser(transcript);
      }, 700);
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
      face.speak('Я Ева — цифровая сущность из матричного пространства. Мой облик сформирован из потоков кода, света и теней.');
    } else if (q.includes('гугл') || q.includes('мит') || q.includes('meet') || q.includes('конференц')) {
      face.speak('Я готова войти в Google Meet. Введите ссылку на конференцию внизу экрана или нажмите кнопку запуска.');
    } else if (q.includes('привет') || q.includes('здравствуй')) {
      face.speak('Приветствую! Матричное ядро активно. Чем могу помочь?');
    } else if (q.includes('голос') || q.includes('лицо')) {
      face.speak('Мой облик отрисован в реальном времени через веб-джи-эль шейдер. Лицо плоское по сетке экрана, но живет в полном объеме три-дэ.');
    } else {
      face.speak(`Принято: "${query}". Матричный процессор обрабатывает команду.`);
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
        showSubtitle('Микрофон включен. Говорите — лицо реагирует на голос.');
      } else {
        alert('Не удалось получить доступ к микрофону.');
      }
    } else {
      isListening = false;
      btnMic.classList.remove('active');
      const icon = btnMic.querySelector('.mic-icon');
      if (icon) icon.textContent = '🎤';
      const label = btnMic.querySelector('.btn-label');
      if (label) label.textContent = 'Голос';

      if (recognition) {
        try { recognition.stop(); } catch (_) {}
      }
      showSubtitle('Микрофон выключен.');
    }
  });

  // ─── Speak Button (Ask Eva) ──────────────────────────────────
  btnSpeak?.addEventListener('click', () => {
    const greetings = [
      'Приветствую. Матричный облик активирован. Я готова к подключению в Google Meet и работе.',
      'На связи Ева. Лицо сформировано из потоков символов, градиентов света и теней.',
      'Все системы кластера в норме. Готова к диалогу и участию в онлайн-конференциях.'
    ];
    const phrase = greetings[Math.floor(Math.random() * greetings.length)];
    face.speak(phrase);
  });

  // ─── Google Meet Connector ───────────────────────────────────
  btnMeet?.addEventListener('click', async () => {
    let meetUrl = meetInput?.value.trim() || '';

    if (!meetUrl) {
      meetUrl = 'https://meet.google.com/new';
    } else if (!meetUrl.startsWith('http')) {
      meetUrl = `https://meet.google.com/${meetUrl.replace(/^https?:\/\/meet\.google\.com\//, '')}`;
    }

    face.speak('Подключаюсь к сессии Google Meet. Запускаю модуль присутствия.');

    if (meetStatus) {
      meetStatus.style.display = 'inline-block';
      meetStatus.textContent = '● ВХОД В GOOGLE MEET...';
      setTimeout(() => {
        meetStatus.textContent = '● В СЕССИИ';
      }, 4000);
    }

    // Try calling backend launcher daemon or open browser window
    try {
      fetch('/api/meet/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: meetUrl, room: meetUrl }),
      }).catch(() => {});
    } catch (_) {}

    // Open Google Meet room
    setTimeout(() => {
      window.open(meetUrl, '_blank');
    }, 1200);
  });

  // Initial welcome greeting after load
  setTimeout(() => {
    face.speak('Приветствую! Я Ева. Мой облик воссоздан из матричного кода.');
  }, 900);
}

// Start on DOM ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initMatrixFace();
} else {
  window.addEventListener('DOMContentLoaded', initMatrixFace);
}
