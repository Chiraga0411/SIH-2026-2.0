import {useEffect,useRef} from 'react';
const rng=s=>()=>(s=(s*16807)%2147483647)/2147483647;
function draw(c,seed,mode,B,W,H){c.width=W;c.height=H;const x=c.getContext('2d'),r=rng(seed*977+13),T=mode==='Terrain';
 x.fillStyle=T?'#C9C9A0':'#4C5F3A';x.fillRect(0,0,W,H);
 const pal=T?['#B9C28E','#A9B67E','#D3CCA2','#98A672','#C2B98F']:['#5B7040','#3F5433','#8A7A4E','#6E6A45','#4A6338','#7E8A54','#37492E'];
 for(let i=0;i<70;i++){x.save();x.translate(r()*W,r()*H);x.rotate((r()-.5)*.5);x.fillStyle=pal[r()*pal.length|0];x.fillRect(0,0,50+r()*160,40+r()*120);x.restore()}
 x.strokeStyle=T?'#E9E2C0':'#B8B3A0';x.lineWidth=T?2:4;
 for(let i=0;i<4;i++){x.beginPath();x.moveTo(0,r()*H);x.bezierCurveTo(W*.3,r()*H,W*.6,r()*H,W,r()*H);x.stroke()}
 x.lineWidth=2;for(let i=0;i<5;i++){x.beginPath();x.moveTo(r()*W,0);x.lineTo(r()*W,H);x.stroke()}
 if(!T){for(let i=0;i<260;i++){x.fillStyle=['#D8D2C4','#C4BBAA','#EDE6D6','#A8543C'][r()*4|0];x.fillRect(r()*W,r()*H,5+r()*10,4+r()*8)}
  for(let i=0;i<900;i++){x.fillStyle=r()>.5?'#2C4222':'#3A5A2C';x.beginPath();x.arc(r()*W,r()*H,1.5+r()*2.5,0,7);x.fill()}}
 if(B){const k=+B,bw=40+k*26,bh=34+k*20,bx=W/2-bw/2,by=H/2-bh/2;x.fillStyle='rgba(0,0,0,.35)';x.fillRect(bx+k*7,by+k*6,bw,bh);x.fillStyle='#E9E4D8';x.fillRect(bx,by,bw,bh);x.fillStyle='#B9B2A0';x.fillRect(bx+6,by+6,bw-12,bh-12)}}
/* Placeholder imagery. In production swap for MapLibre raster tiles (e.g. Esri World Imagery). */
export default function Sat({seed,mode='Satellite',b,w=900,h=570}){const ref=useRef();useEffect(()=>{draw(ref.current,seed,mode,b,w,h)},[seed,mode,b,w,h]);return <canvas ref={ref}/>}
