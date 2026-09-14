/**
 * neo_electra.ts — Station Module 3: Neo Electra Cyan
 *
 * Characteristics:
 * - Electric Cyan Matrix (#00f0ff) with deep obsidian cyan shadows and supernova white core
 * - High-speed digital rain streams (1.25x)
 * - Sharp high-contrast facial contours with cybernetic rim lighting
 * - 3D gaze tracking with spring-return center physics
 */

import { EvaMatrixFace } from '../matrix_face.js';

export class NeoElectraHead {
  public readonly meta = {
    id: 'neo',
    name: 'Neo Electra Cyan',
    codename: 'NEO-03-CYAN',
    primaryColor: '#00f0ff',
    fpsTarget: 60,
  };

  private face: EvaMatrixFace;

  constructor(container: HTMLElement) {
    this.face = new EvaMatrixFace(container);
    this.face.setPersona('neo');
  }

  public getFace(): EvaMatrixFace {
    return this.face;
  }

  public speak(text: string, onDone?: () => void): void {
    this.face.speak(text, onDone);
  }

  public setQualityTier(tier: 'auto' | 'ultra' | 'balanced' | 'eco'): void {
    this.face.setQualityTier(tier);
  }
}
