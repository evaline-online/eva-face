import { HEAD_POS } from '../src/headmodel.js';
const P=[];for(let i=0;i<HEAD_POS.length;i+=3)P.push([HEAD_POS[i],HEAD_POS[i+1],HEAD_POS[i+2]]);
let maxZ=[-99,-99,-99],minZ=[99,99,99];
for(const p of P){if(p[2]>maxZ[2])maxZ=p;if(p[2]<minZ[2])minZ=p;}
console.log('max Z vertex (closest +Z):', maxZ.map(v=>v.toFixed(3)).join(', '));
console.log('min Z vertex (most -Z):   ', minZ.map(v=>v.toFixed(3)).join(', '));
let noseMax=[-99,-99,-99],noseMin=[99,99,99];
for(const p of P){if(Math.abs(p[0])<0.28&&p[1]>0.15&&p[1]<0.75){if(p[2]>noseMax[2])noseMax=p;if(p[2]<noseMin[2])noseMin=p;}}
console.log('nose-zone +Z peak:', noseMax.map(v=>v.toFixed(3)).join(', '));
console.log('nose-zone -Z peak:', noseMin.map(v=>v.toFixed(3)).join(', '));
let top=[-99,-99,-99];for(const p of P)if(p[1]>top[1])top=p;
console.log('crown vertex:', top.map(v=>v.toFixed(3)).join(', '));
let chin=[99,99,99];for(const p of P)if(Math.abs(p[0])<0.3&&p[1]<chin[1])chin=p;
console.log('chin vertex:', chin.map(v=>v.toFixed(3)).join(', '));
