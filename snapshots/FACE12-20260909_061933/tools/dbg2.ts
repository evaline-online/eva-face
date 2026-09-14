import { createFaceMesh, projectAndShade } from '../src/face3d.js';
const mesh = createFaceMesh();
const res = projectAndShade(mesh, 0, 0, 0, 80, 40, 0.5);
const v = mesh.verts;
// find vertex closest to anatomical point and report its screen row/col
function rowOf(x:number,y:number,z:number){
  let best:any=null, bd=9;
  for(const vec of v){
    const d=Math.hypot(vec.local.x-x, vec.local.y-y, vec.local.z-z);
    if(d<bd){bd=d;best=vec;}
  }
  return [Math.round(best.screen.x), Math.round(best.screen.y), best.screen.z.toFixed(2), bd.toFixed(3)];
}
console.log('left eye     (±0.115,0.335):', rowOf(-0.115,0.335,0.5));
console.log('left brow    (±0.10,0.47)  :', rowOf(-0.10,0.47,0.6));
console.log('nose tip     (0,0.31)      :', rowOf(0,0.31,0.8));
console.log('mouth center (0,0.075)     :', rowOf(0,0.075,0.7));
console.log('chin         (0,-0.925)    :', rowOf(0,-0.925,-0.1));
console.log('crown        (0,0.834)     :', rowOf(0,0.834,-0.2));
console.log('mid-forehead (0,0.60)      :', rowOf(0,0.60,0.6));
