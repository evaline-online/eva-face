import { HEAD_POS, HEAD_NRM } from '../src/headmodel.js';
const P=[];const N=[];
for(let i=0;i<HEAD_POS.length;i+=3)P.push([HEAD_POS[i],HEAD_POS[i+1],HEAD_POS[i+2]]);
for(let i=0;i<HEAD_NRM.length;i+=3)N.push([HEAD_NRM[i],HEAD_NRM[i+1],HEAD_NRM[i+2]]);
// Eyes: local creases on front (z>0.2), symmetric x. Find vertices where normal faces upward & z large (brow undersides = sockets)
// Better: find strong cavity (normal not aligned with +Z) on the front, in upper area.
let brow=[],sockets=[];
for(let i=0;i<P.length;i++){
  const p=P[i]; if(p[2]<0.05||Math.abs(p[1])>0.6) continue;
  const nx=N[i][0],nz=N[i][2];
  if(Math.abs(nz)<0.45 && p[2]>0.35){ // frontal creases (eye sockets/under-brow) where normal points sideways/up, z still high
    sockets.push([p[0],p[1],p[2],nx,nz]);
  }
}
// cluster sockets by |x| to find left/right eye
let left=[99],right=[99];const mean=[];let cnt=0;
for(const s of sockets){ if(s[0]<-0.2){ if(s[1]<left[1])left=s; } else if(s[0]>0.2){ if(s[1]<right[1])right=s; } }
console.log('LEFT eye socket vertex:', left.slice(0,3).map(v=>v.toFixed(3)).join(', '));
console.log('RIGHT eye socket vertex:', right.slice(0,3).map(v=>v.toFixed(3)).join(', '));
// Mouth: cavity near chin area y in [-0.45,-0.05] with normal not frontal (lip crease)
let mouth=[99,99,99]; let best=0;
for(let i=0;i<P.length;i++){
  const p=P[i]; if(p[1]<-0.05||p[1]>0.1||Math.abs(p[0])>0.3) continue;
  if(Math.abs(N[i][2])<0.6 && p[2]>mouth[2]){ mouth=p; best=i; }
}
console.log('mouth crease vertex:', mouth.map(v=>v.toFixed(3)).join(', '));
// nose tip
let tip=[-99,-99,-99];for(let i=0;i<P.length;i++){const p=P[i];if(p[2]>tip[2])tip=p;}
console.log('nose tip:', tip.map(v=>v.toFixed(3)).join(', '));
// nose bridge: max z near x=0, y in [0.3,0.7]
let bridge=[-99,-99,-99];for(let i=0;i<P.length;i++){const p=P[i];if(Math.abs(p[0])<0.1&&p[1]>0.3&&p[1]<0.7&&p[2]>bridge[2])bridge=p;}
console.log('nose bridge peak:', bridge.map(v=>v.toFixed(3)).join(', '));
// brow lobe: max z at y~+0.5..0.62 near |x|0.3
let browL=[-99,-99,-99],browR=[-99,-99,-99];
for(let i=0;i<P.length;i++){const p=P[i];if(p[1]>0.42&&p[1]<0.62&&p[2]>0.05){ if(p[0]<0&&p[2]>browL[2])browL=p; if(p[0]>0&&p[2]>browR[2])browR=p; }}
console.log('brow L vertex:', browL.slice(0,3).map(v=>v.toFixed(3)).join(', '));
console.log('brow R vertex:', browR.slice(0,3).map(v=>v.toFixed(3)).join(', '));
