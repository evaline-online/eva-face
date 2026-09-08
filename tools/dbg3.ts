import { createFaceMesh, projectAndShade } from '../src/face3d.js';
const mesh = createFaceMesh();
const res = projectAndShade(mesh, 0, 0, 0, 80, 40, 0.5);
// intensity of the cell hosting each landmark
function at(x,y,z){
  let best:any=null, bd=9;
  for(const vec of mesh.verts){
    const d=Math.hypot(vec.local.x-x, vec.local.y-y, vec.local.z-z);
    if(d<bd){bd=d;best=vec;}
  }
  const c=res.cells[Math.round(best.screen.y)]?.[Math.round(best.screen.x)];
  return `${Math.round(best.screen.x)},${Math.round(best.screen.y)} z=${best.screen.z.toFixed(2)} int=${((c?.r||0)+(c?.g||0)+(c?.b||0))/(255*3).toFixed(3)}`;
}
console.log('forehead (0,.6)   ', at(0,0.60,0.6));
console.log('brow L   (-.1,.47)', at(-0.10,0.47,0.6));
console.log('eye L    (-.115,.335)', at(-0.115,0.335,0.55));
console.log('nose tip (0,.31)  ', at(0,0.31,0.82));
console.log('cheek L  (-.27,.16)', at(-0.27,0.16,0.6));
console.log('mouth fr (0,.075) ', at(0,0.075,0.72));
console.log('chin     (0,-.55) ', at(0,-0.55,0.55));
