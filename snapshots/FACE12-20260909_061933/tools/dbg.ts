import { createFaceMesh, projectAndShade, rotateXYZ, v3dot } from '../src/face3d.js';
const mesh = createFaceMesh();
console.log('verts:', mesh.verts.length, 'faces:', mesh.faces.length);
const res = projectAndShade(mesh, 0, 0, 0, 80, 40, 0.5);
let set=0, inRange=0, aboveZ=0, facing=0, maxI=0;
for (const v of mesh.verts) {
  if (v.screen.z<=0.05) continue; aboveZ++;
  const f=v.norm.z; if (f<0.06) continue; facing++;
  const cx=Math.round(v.screen.x), cy=Math.round(v.screen.y);
  if(cx<0||cx>=80||cy<0||cy>=40) continue; inRange++;
}
for (let j=0;j<40;j++)for(let i=0;i<80;i++){const c=res.cells[j][i]; if(c.ch!==' ')set++;}
console.log('nbuf cells set:', set);
console.log('verts passing z:', aboveZ, 'facing:', facing, 'inRange:', inRange);
// sample some screen coords of front-most verts
let maxz=-9,best:any=null;
for (const v of mesh.verts){ if(v.screen.z>maxz){maxz=v.screen.z;best=v;} }
console.log('max screen z vertex:', best.screen.x.toFixed(1), best.screen.y.toFixed(1), 'z', maxz.toFixed(3), 'norm.z', best.norm.z.toFixed(2));
let minx=9,maxx=-9,miny=9,maxy=-9;
for (const v of mesh.verts){minx=Math.min(minx,v.screen.x);maxx=Math.max(maxx,v.screen.x);miny=Math.min(miny,v.screen.y);maxy=Math.max(maxy,v.screen.y);}
console.log('screen bounds x',minx.toFixed(1),maxx.toFixed(1),'y',miny.toFixed(1),maxy.toFixed(1));
