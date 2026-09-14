/**
 * cyber_browser.ts — Browser entrypoint for Cyberpunk PBR 3D Station.
 */

import { EvaCyberFace } from '../cyber_face.js';

function initCyberStation(): void {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  const face = new EvaCyberFace(container);

  const btnMic = document.getElementById('btn-mic');
  const btnSpeak = document.getElementById('btn-speak');
  const btnMeet = document.getElementById('btn-meet');
  const meetInput = document.getElementById('meet-input') as HTMLInputElement | null;
  const meetStatus = document.getElementById('meet-status');

  // Mode buttons (hybrid, points, lines, polys)
  const modeBtns = document.querySelectorAll('.btn-mode');
  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode') as any;
      if (mode) {
        face.setMode(mode);
        modeBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      }
    });
  });

  // Persona buttons (eva / adam)
  const personaBtns = document.querySelectorAll('.btn-persona');
  personaBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = btn.getAttribute('data-persona') as any;
      if (p) {
        face.setPersona(p);
        personaBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      }
    });
  });

  btnSpeak?.addEventListener('click', () => {
    face.speak('Кибернетическая станция PBR 3D активна. Физические материалы, зрачки и слежение за взглядом.');
  });

  btnMic?.addEventListener('click', async () => {
    const ok = await face.enableMicrophone();
    if (ok) {
      btnMic.classList.add('active');
    }
  });

  btnMeet?.addEventListener('click', () => {
    const url = meetInput?.value.trim() || 'https://meet.google.com/new';
    if (meetStatus) {
      meetStatus.style.display = 'inline-block';
      meetStatus.textContent = '● ПОДКЛЮЧЕНИЕ...';
    }
    setTimeout(() => {
      window.open(url, '_blank');
    }, 1000);
  });
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initCyberStation();
} else {
  window.addEventListener('DOMContentLoaded', initCyberStation);
}
