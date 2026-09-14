import { createFaceMesh, projectAndShade } from "../src/face3d.js";
function char(int: number) { return int > 0.75 ? "1" : int > 0.4 ? "0" : "."; }
const mesh = createFaceMesh();
function dump(rx: number, ry: number, label: string) {
  const res = projectAndShade(mesh, rx, ry, 0, 100, 32, 9 / 16);
  console.log("=== " + label + " (rx=" + rx + ", ry=" + ry + ") ===");
  let out = "";
  for (let j = 0; j < 32; j++) {
    let line = "";
    for (let i = 0; i < 100; i++) {
      const c = res.cells[j]?.[i];
      const d = c && c.ch !== " " && c.ch !== "\0";
      line += d ? char(Math.max(c!.r, c!.g, c!.b) / 255) : " ";
    }
    out += "|" + line + "|\n";
  }
  console.log(out);
}
dump(0, 0, "FRONT");
dump(0, Math.PI, "BACK");
dump(0, -1.2, "PROFILE");
dump(0, 0.7, "PROFILE-RIGHT");
