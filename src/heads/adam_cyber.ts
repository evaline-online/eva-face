/**
 * adam_cyber.ts — Station Module 2: Adam Cyber Gold
 *
 * Characteristics:
 * - Cybernetic Amber Gold (#ffb400) with dark bronze shadows and solar white highlights
 * - Broadened jaw (1.10), lifted brow (+0.02) and masculine cyber taper
 * - Slower, heavy digital code rain (0.85x) with amber phosphor trails
 * - 3D gaze tracking with spring-return center physics
 */

import { EvaMatrixFace } from '../matrix_face.js';

export class AdamCyberHead {
  public readonly meta = {
    id: 'adam',
    name: 'Adam Cyber Gold',
    codename: 'ADAM-02-AMBER',
    primaryColor: '#ffb400',
    fpsTarget: 60,
  };

  private face: EvaMatrixFace;

  constructor(container: HTMLElement) {
    this.face = new EvaMatrixFace(container);
    this.face.setPersona('adam');
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
