/**
 * eva_matrix.ts — Station Module 1: Eva Matrix Core
 *
 * Characteristics:
 * - Pure Matrix Phosphor Green (#00ff66) with emerald jade shadows
 * - Pinscreen Generic Head mesh with slender jaw (0.96) and tapered chin (0.94)
 * - 256-Glyph density Katakana texture atlas
 * - Multi-layer cascading code streams falling top-to-bottom with upward phosphor trails
 * - 3D gaze tracking with spring-return center physics
 */

import * as THREE from 'three';
import { EvaMatrixFace } from '../matrix_face.js';

export class EvaMatrixHead {
  public readonly meta = {
    id: 'eva',
    name: 'Eva Matrix Core',
    codename: 'EVA-01-PHOSPHOR',
    primaryColor: '#00ff66',
    fpsTarget: 60,
  };

  private face: EvaMatrixFace;

  constructor(container: HTMLElement) {
    this.face = new EvaMatrixFace(container);
    this.face.setPersona('eva');
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
