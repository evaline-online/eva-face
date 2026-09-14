/**
 * rain_code.ts — Station Module 4: Pure Matrix Rain Entity
 *
 * Characteristics:
 * - Pure vibrant cascading green code rain (#32ff78)
 * - Face structure emerges directly from the downpour density variations
 * - High-speed cascading rain streams (1.6x)
 * - 3D gaze tracking with spring-return center physics
 */

import { EvaMatrixFace } from '../matrix_face.js';

export class RainCodeHead {
  public readonly meta = {
    id: 'rain',
    name: 'Pure Matrix Rain',
    codename: 'RAIN-04-CASCADE',
    primaryColor: '#32ff78',
    fpsTarget: 60,
  };

  private face: EvaMatrixFace;

  constructor(container: HTMLElement) {
    this.face = new EvaMatrixFace(container);
    this.face.setPersona('rain');
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
