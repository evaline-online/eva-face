/**
 * cyber_pbr.ts — Station Module 6: Cyberpunk PBR 3D (Points, Lines, Polygons & Eyeballs)
 *
 * Characteristics:
 * - Realism with physical PBR materials, clearcoat sheen, and subsurface scattering
 * - 3D Cybernetic Eyeballs with pupils and irises tracking gaze with natural micro-saccades
 * - Phonetic visemes (A, E, O, U, consonants, jaw pivot)
 * - Neon Cyan & Radiant Magenta cyberpunk aesthetic
 */

import { EvaCyberFace, type RenderMode } from '../cyber_face.js';

export class CyberPbrHead {
  public readonly meta = {
    id: 'cyber',
    name: 'Cyberpunk PBR 3D',
    codename: 'CYBER-06-PBR',
    primaryColor: '#00f0ff',
    fpsTarget: 60,
  };

  private face: EvaCyberFace;

  constructor(container: HTMLElement) {
    this.face = new EvaCyberFace(container);
  }

  public getFace(): EvaCyberFace {
    return this.face;
  }

  public speak(text: string, onDone?: () => void): void {
    this.face.speak(text, onDone);
  }

  public setMode(mode: RenderMode): void {
    this.face.setMode(mode);
  }
}
