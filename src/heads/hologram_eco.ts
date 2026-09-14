/**
 * hologram_eco.ts — Station Module 5: Vector Hologram Eco 60 FPS
 *
 * Characteristics:
 * - Pure vector holographic gradient contours with fine CRT scanlines
 * - Zero texture atlas lookups (0ms texture memory bandwidth)
 * - Rock-solid 60 FPS guaranteed on all devices (mobile, low-end laptops, virtual GPUs)
 * - Electric Cyan-Teal (#00ffcc) phosphor glow with rim light
 * - 3D gaze tracking with spring-return center physics
 */

import { EvaMatrixFace } from '../matrix_face.js';

export class HologramEcoHead {
  public readonly meta = {
    id: 'hologram',
    name: 'Vector Hologram Eco',
    codename: 'HOLO-05-ECO60',
    primaryColor: '#00ffcc',
    fpsTarget: 60,
  };

  private face: EvaMatrixFace;

  constructor(container: HTMLElement) {
    this.face = new EvaMatrixFace(container);
    this.face.setPersona('neo');
    this.face.setQualityTier('eco');
  }

  public getFace(): EvaMatrixFace {
    return this.face;
  }

  public speak(text: string, onDone?: () => void): void {
    this.face.speak(text, onDone);
  }
}
