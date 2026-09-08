import { HEAD_POS } from '../src/headmodel.js';
const P=[];for(let i=0;i<HEAD_POS.length;i+=3)P.push([HEAD_POS[i],HEAD_POS[i+1],HEAD_POS[i+2]]);
function minZIn(xmin,xmax,ymin,ymax,label){
  let best=[99,99,99],c=0;
  for(const p of P){if(p[0]>=xmin&&p[0]<=xmax&&p[1]>=ymin&&p[1]<=ymax){c++;if(p[2]<best[2])best=p;}}
  console.log(label,'verts:',c,'deepest:',best.map(v=>v.toFixed(3)).join(', '));
}
function maxZIn(xmin,xmax,ymin,ymax,label){
  let best=[-99,-99,-99],c=0;
  for(const p of P){if(p[0]>=xmin&&p[0]<=xmax&&p[1]>=ymin&&p[1]<=ymax){c++;if(p[2]>best[2])best=p;}}
  console.log(label,'verts:',c,'peak:',best.map(v=>v.toFixed(3)).join(', '));
}
minZIn(-0.35,-0.10,0.28,0.46,'left eye pit  ');
minZIn(0.10,0.35,0.28,0.46,'right eye pit ');
minZIn(-0.30,0.30,-0.10,0.12,'mouth crease  ');
maxZIn(-0.16,0.16,-0.12,0.12,'mouth center  ');
maxZIn(-0.12,0.12,0.30,0.62,'nose bridge   ');
