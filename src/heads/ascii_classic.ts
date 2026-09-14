/**
 * ascii_classic.ts — Station Module 8: Classic Retro ASCII Stencil
 *
 * Characteristics:
 * - Authentic 2D/3D depth projection with stencil landmark anchors
 * - Character density ramp (` .':-=+*#%@`)
 * - Multi-head models (Default M0, Female M1, Male M2, Child M3)
 * - True retro terminal green phosphor look
 */

export class AsciiClassicHead {
  public readonly meta = {
    id: 'ascii',
    name: 'Classic Retro ASCII',
    codename: 'ASCII-08-RETRO',
    primaryColor: '#00ff66',
    fpsTarget: 60,
  };

  public launchCommand = './eva-face.sh ascii';
}
