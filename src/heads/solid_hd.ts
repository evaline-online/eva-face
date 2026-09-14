/**
 * solid_hd.ts — Station Module 7: Ultra-HD TrueColor Solid Blocks
 *
 * Characteristics:
 * - Subpixel Half-Block (▀) Dual-Buffer Rasterization
 * - 24-bit TrueColor Gradient Studio Lighting (Key, Fill, Specular, Rim)
 * - Continuous cursor gaze tracking & spring-return center physics
 * - Native 60+ FPS execution speed on CPU
 */

export class SolidHdHead {
  public readonly meta = {
    id: 'solid',
    name: 'Ultra-HD TrueColor Solid',
    codename: 'SOLID-07-TRUECOLOR',
    primaryColor: '#00ff66',
    fpsTarget: 60,
  };

  // Metadata and launcher bridge for the Solid HD engine
  public launchCommand = './eva-face.sh solid';
}
