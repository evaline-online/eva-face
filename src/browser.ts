/**
 * browser.ts — Interactive Cyberpunk Holographic Face of Eva & Adam.
 * Entrypoint for WebGL 3D face with fallback to Matrix canvas renderer.
 */

import { EvaCyberFace, type RenderMode, type PersonaType } from './cyber_face.js';

function initCyberFace(): void {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  const face = new EvaCyberFace(container);

  // ─── UI References ──────────────────────────────────────────
  const btnHybrid = document.getElementById('btn-hybrid');
  const btnPoints = document.getElementById('btn-points');
  const btnLines = document.getElementById('btn-lines');
  const btnPolys = document.getElementById('btn-polys');
  const btnMatrix = document.getElementById('btn-matrix');

  const btnEva = document.getElementById('btn-persona-eva');
  const btnAdam = document.getElementById('btn-persona-adam');
  const btnOrbit = document.getElementById('btn-orbit');

  const speechBalloon = document.getElementById('speech-balloon');
  const chatInput = document.getElementById('chat-text') as HTMLInputElement | null;
  const btnSend = document.getElementById('btn-send');
  const btnMic = document.getElementById('btn-mic');

  const promptIntro = document.getElementById('prompt-intro');
  const promptArch = document.getElementById('prompt-arch');
  const promptPresence = document.getElementById('prompt-presence');
  const promptModes = document.getElementById('prompt-modes');

  function setActiveModeBtn(activeBtn: HTMLElement | null): void {
    [btnHybrid, btnPoints, btnLines, btnPolys, btnMatrix].forEach((btn) => {
      btn?.classList.remove('active');
    });
    activeBtn?.classList.add('active');
  }

  function setActivePersonaBtn(activeBtn: HTMLElement | null): void {
    [btnEva, btnAdam].forEach((btn) => {
      btn?.classList.remove('active');
    });
    activeBtn?.classList.add('active');
  }

  function showSubtitle(text: string): void {
    if (speechBalloon) {
      speechBalloon.style.display = 'block';
      speechBalloon.innerText = text;
    }
  }

  function hideSubtitle(): void {
    if (speechBalloon) {
      speechBalloon.style.display = 'none';
    }
  }

  function speakWithSubtitle(text: string): void {
    showSubtitle(text);
    face.speak(text, () => {
      setTimeout(hideSubtitle, 1500);
    });
  }

  // ─── Mode Switching ─────────────────────────────────────────
  btnHybrid?.addEventListener('click', () => {
    face.setMode('hybrid');
    setActiveModeBtn(btnHybrid);
  });

  btnPoints?.addEventListener('click', () => {
    face.setMode('points');
    setActiveModeBtn(btnPoints);
  });

  btnLines?.addEventListener('click', () => {
    face.setMode('lines');
    setActiveModeBtn(btnLines);
  });

  btnPolys?.addEventListener('click', () => {
    face.setMode('polys');
    setActiveModeBtn(btnPolys);
  });

  btnMatrix?.addEventListener('click', () => {
    window.location.search = '?mode=matrix';
  });

  // ─── Persona Switching ──────────────────────────────────────
  btnEva?.addEventListener('click', () => {
    face.setPersona('eva');
    setActivePersonaBtn(btnEva);
    speakWithSubtitle('На связи Ева. Переключаю визуальное ядро на фронтенд-архитектуру и бренд.');
  });

  btnAdam?.addEventListener('click', () => {
    face.setPersona('adam');
    setActivePersonaBtn(btnAdam);
    speakWithSubtitle('На связи Адам. Переключаю ядро на бэкенд, безопасность и инфраструктуру кластера.');
  });

  // ─── Auto Orbit Toggle ──────────────────────────────────────
  btnOrbit?.addEventListener('click', () => {
    const active = face.toggleAutoOrbit();
    btnOrbit.style.color = active ? '#00f0ff' : '#94a3b8';
    btnOrbit.style.borderColor = active ? '#00f0ff' : 'transparent';
  });

  // ─── Quick Prompts ──────────────────────────────────────────
  promptIntro?.addEventListener('click', () => {
    speakWithSubtitle(
      'Здравствуйте! Я Ева — цифровой архитектор и амбассадор компании EvaLine. Мой интерактивный облик создан из точек, линий и полигонов. Рада приветствовать вас!'
    );
  });

  promptArch?.addEventListener('click', () => {
    speakWithSubtitle(
      'Архитектура нашего кластера включает мощный вычислительный узел во Франкфурте на базе C3 Standard 8 и высокоскоростной шлюз в Айове с Caddy и Tailscale.'
    );
  });

  promptPresence?.addEventListener('click', () => {
    speakWithSubtitle(
      'С новым модулем Eva Presence я могу подключаться к конференциям Google Meet и звонкам Telegram как реальный человек, общаясь голосом и отвечая в чате.'
    );
  });

  promptModes?.addEventListener('click', () => {
    speakWithSubtitle(
      'Обратите внимание: сейчас активен гибридный режим — полупрозрачные полигоны, светящиеся нейронные линии и квантовые точки.'
    );
  });

  // ─── Chat Input ─────────────────────────────────────────────
  function handleSend(): void {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;
    speakWithSubtitle(text);
    chatInput.value = '';
  }

  btnSend?.addEventListener('click', handleSend);
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  // ─── Microphone Live Input ──────────────────────────────────
  btnMic?.addEventListener('click', async () => {
    const ok = await face.enableMicrophone();
    if (ok) {
      btnMic.classList.add('active');
      showSubtitle('🎤 Слушаю ваш голос через микрофон... Лицо реагирует на частоты звука.');
      setTimeout(hideSubtitle, 4000);
    } else {
      alert('Не удалось получить доступ к микрофону.');
    }
  });

  // Greet user on startup after slight delay
  setTimeout(() => {
    speakWithSubtitle('Приветствую! Я готова к работе.');
  }, 1000);
}

// Check for matrix mode override
if (window.location.search.includes('mode=matrix')) {
  // Classic matrix fallback if explicitly requested
  import('./capability.js').then(() => {
    console.log('[Eva Face] Running in matrix fallback mode');
  });
} else {
  // Standard modern 3D WebGL cyber face
  window.addEventListener('DOMContentLoaded', initCyberFace);
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initCyberFace();
  }
}
