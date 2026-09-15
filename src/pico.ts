/**
 * pico.ts — Embedded Neural Face Detector for Eva Matrix
 * Based on the Pico cascade algorithm (Nenad Markuš, MIT License).
 * Extremely lightweight (<150 LOC, zero dependencies), runs at 200+ FPS in pure JS.
 */

export type FaceDetection = [number, number, number, number]; // [row, col, size, score]

export class PicoFaceDetector {
  private classifyRegion: ((r: number, c: number, s: number, pixels: Uint8Array, ldim: number) => number) | null = null;
  private updateMemory: ((dets: FaceDetection[]) => FaceDetection[]) | null = null;
  private isLoaded: boolean = false;

  constructor() {
    this.updateMemory = this.instantiateDetectionMemory(5);
  }

  public get loaded(): boolean {
    return this.isLoaded;
  }

  public async loadModel(url: string = 'models/facefinder'): Promise<boolean> {
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn('[Pico] Failed to fetch model from', url, resp.statusText);
        return false;
      }
      const buffer = await resp.arrayBuffer();
      const bytes = new Int8Array(buffer);
      this.classifyRegion = this.unpackCascade(bytes);
      this.isLoaded = true;
      console.log('[Pico] Face detector cascade loaded successfully.');
      return true;
    } catch (err) {
      console.warn('[Pico] Failed to load cascade:', err);
      return false;
    }
  }

  private unpackCascade(bytes: Int8Array): (r: number, c: number, s: number, pixels: Uint8Array, ldim: number) => number {
    const dview = new DataView(new ArrayBuffer(4));
    let p = 8;
    dview.setUint8(0, bytes[p + 0]); dview.setUint8(1, bytes[p + 1]); dview.setUint8(2, bytes[p + 2]); dview.setUint8(3, bytes[p + 3]);
    const tdepth = dview.getInt32(0, true);
    p += 4;
    dview.setUint8(0, bytes[p + 0]); dview.setUint8(1, bytes[p + 1]); dview.setUint8(2, bytes[p + 2]); dview.setUint8(3, bytes[p + 3]);
    const ntrees = dview.getInt32(0, true);
    p += 4;

    const tcodesLs: number[] = [];
    const tpredsLs: number[] = [];
    const threshLs: number[] = [];

    const powDepth = Math.pow(2, tdepth);
    for (let t = 0; t < ntrees; ++t) {
      tcodesLs.push(0, 0, 0, 0);
      for (let k = p; k < p + 4 * powDepth - 4; k++) {
        tcodesLs.push(bytes[k]);
      }
      p += 4 * powDepth - 4;

      for (let i = 0; i < powDepth; ++i) {
        dview.setUint8(0, bytes[p + 0]); dview.setUint8(1, bytes[p + 1]); dview.setUint8(2, bytes[p + 2]); dview.setUint8(3, bytes[p + 3]);
        tpredsLs.push(dview.getFloat32(0, true));
        p += 4;
      }
      dview.setUint8(0, bytes[p + 0]); dview.setUint8(1, bytes[p + 1]); dview.setUint8(2, bytes[p + 2]); dview.setUint8(3, bytes[p + 3]);
      threshLs.push(dview.getFloat32(0, true));
      p += 4;
    }

    const tcodes = new Int8Array(tcodesLs);
    const tpreds = new Float32Array(tpredsLs);
    const thresh = new Float32Array(threshLs);

    return function classifyRegion(r: number, c: number, s: number, pixels: Uint8Array, ldim: number): number {
      const r256 = (256 * r) | 0;
      const c256 = (256 * c) | 0;
      let root = 0;
      let o = 0.0;
      const pow2tdepth = (1 << tdepth);

      for (let i = 0; i < ntrees; ++i) {
        let idx = 1;
        for (let j = 0; j < tdepth; ++j) {
          const p1 = pixels[(((r256 + tcodes[root + 4 * idx + 0] * s) >> 8) * ldim) + ((c256 + tcodes[root + 4 * idx + 1] * s) >> 8)];
          const p2 = pixels[(((r256 + tcodes[root + 4 * idx + 2] * s) >> 8) * ldim) + ((c256 + tcodes[root + 4 * idx + 3] * s) >> 8)];
          idx = (idx << 1) + (p1 <= p2 ? 1 : 0);
        }
        o += tpreds[pow2tdepth * i + idx - pow2tdepth];
        if (o <= thresh[i]) return -1;
        root += 4 * pow2tdepth;
      }
      return o - thresh[ntrees - 1];
    };
  }

  public detect(pixels: Uint8Array, nrows: number, ncols: number, ldim: number): FaceDetection[] {
    if (!this.classifyRegion) return [];

    const minsize = Math.max(30, Math.floor(Math.min(nrows, ncols) * 0.18));
    const maxsize = Math.floor(Math.min(nrows, ncols) * 0.85);
    const scalefactor = 1.15;
    const shiftfactor = 0.08;

    let scale = minsize;
    const detections: FaceDetection[] = [];

    while (scale <= maxsize) {
      const step = Math.max((shiftfactor * scale) | 0, 2);
      const offset = (scale / 2 + 1) | 0;

      for (let r = offset; r <= nrows - offset; r += step) {
        for (let c = offset; c <= ncols - offset; c += step) {
          const q = this.classifyRegion(r, c, scale, pixels, ldim);
          if (q > 0.0) {
            detections.push([r, c, scale, q]);
          }
        }
      }
      scale = scale * scalefactor;
    }

    const merged = this.updateMemory ? this.updateMemory(detections) : detections;
    return this.clusterDetections(merged, 0.2);
  }

  private clusterDetections(dets: FaceDetection[], iouthreshold: number): FaceDetection[] {
    dets.sort((a, b) => b[3] - a[3]);

    function iou(det1: FaceDetection, det2: FaceDetection): number {
      const [r1, c1, s1] = det1;
      const [r2, c2, s2] = det2;
      const overr = Math.max(0, Math.min(r1 + s1 / 2, r2 + s2 / 2) - Math.max(r1 - s1 / 2, r2 - s2 / 2));
      const overc = Math.max(0, Math.min(c1 + s1 / 2, c2 + s2 / 2) - Math.max(c1 - s1 / 2, c2 - s2 / 2));
      return (overr * overc) / (s1 * s1 + s2 * s2 - overr * overc);
    }

    const assignments = new Uint8Array(dets.length);
    const clusters: FaceDetection[] = [];

    for (let i = 0; i < dets.length; ++i) {
      if (assignments[i] === 0) {
        let r = 0, c = 0, s = 0, q = 0, n = 0;
        for (let j = i; j < dets.length; ++j) {
          if (iou(dets[i], dets[j]) > iouthreshold) {
            assignments[j] = 1;
            r += dets[j][0];
            c += dets[j][1];
            s += dets[j][2];
            q += dets[j][3];
            n++;
          }
        }
        clusters.push([r / n, c / n, s / n, q]);
      }
    }
    return clusters;
  }

  private instantiateDetectionMemory(size: number): (dets: FaceDetection[]) => FaceDetection[] {
    let n = 0;
    const memory: FaceDetection[][] = [];
    for (let i = 0; i < size; ++i) memory.push([]);

    return function updateMemory(dets: FaceDetection[]): FaceDetection[] {
      memory[n] = dets;
      n = (n + 1) % memory.length;
      let all: FaceDetection[] = [];
      for (let i = 0; i < memory.length; ++i) {
        all = all.concat(memory[i]);
      }
      return all;
    };
  }
}

export function rgbaToGrayscale(rgba: Uint8ClampedArray, nrows: number, ncols: number): Uint8Array {
  const gray = new Uint8Array(nrows * ncols);
  for (let i = 0; i < nrows * ncols; ++i) {
    const idx = i * 4;
    gray[i] = ((rgba[idx] * 2 + rgba[idx + 1] * 7 + rgba[idx + 2]) / 10) | 0;
  }
  return gray;
}
