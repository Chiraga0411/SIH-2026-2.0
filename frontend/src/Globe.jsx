import {useEffect,useRef} from 'react';
import {geoOrthographic,geoPath,geoGraticule10,geoDistance} from 'd3-geo';
import {feature} from 'topojson-client';
import topo from 'world-atlas/land-110m.json';
const LAND=feature(topo,topo.objects.land),GRAT=geoGraticule10();
const PTS=[[76.78,30.73],[80.27,13.08],[77.41,23.26]]; // Chandigarh, Chennai, Bhopal
export default function Globe(){
  const ref=useRef();
  useEffect(()=>{
    const cv=ref.current,ctx=cv.getContext('2d'),dpr=Math.min(window.devicePixelRatio||1,2);
    const calm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W=0,rot=[-62,-20],drag=null,raf;
    const size=()=>{W=cv.getBoundingClientRect().width||600;cv.width=cv.height=W*dpr};
    size();const ro=new ResizeObserver(size);ro.observe(cv);
    const proj=geoOrthographic().clipAngle(90),path=geoPath(proj,ctx);
    const disc=(x,y,r)=>{ctx.beginPath();ctx.arc(x,y,r,0,7)};
    const frame=t=>{
      const c=W/2,R=W*.4;
      if(!drag&&!calm)rot[0]+=.14;
      proj.scale(R).translate([c,c]).rotate(rot);
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,W);
      let g=ctx.createRadialGradient(c,c,R*.97,c,c,R*1.25);g.addColorStop(0,'rgba(94,168,255,.55)');g.addColorStop(1,'rgba(94,168,255,0)');
      ctx.fillStyle=g;disc(c,c,R*1.25);ctx.fill();                       // atmosphere
      g=ctx.createRadialGradient(c-R*.35,c-R*.4,R*.1,c,c,R);g.addColorStop(0,'#3B8CF0');g.addColorStop(.55,'#12489E');g.addColorStop(1,'#061A3D');
      ctx.fillStyle=g;disc(c,c,R);ctx.fill();                              // ocean
      ctx.beginPath();path(GRAT);ctx.strokeStyle='rgba(190,220,255,.15)';ctx.lineWidth=.6;ctx.stroke();
      ctx.beginPath();path(LAND);ctx.fillStyle='rgba(238,246,255,.93)';ctx.fill();ctx.strokeStyle='rgba(30,114,209,.6)';ctx.lineWidth=.7;ctx.stroke();
      g=ctx.createRadialGradient(c-R*.45,c-R*.5,R*.05,c,c,R*1.05);g.addColorStop(0,'rgba(255,255,255,.28)');g.addColorStop(.45,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(2,10,30,.6)');
      ctx.fillStyle=g;disc(c,c,R);ctx.fill();                              // light + shadow
      ctx.strokeStyle='rgba(150,200,255,.55)';ctx.lineWidth=1.2;disc(c,c,R);ctx.stroke();
      const mid=[-rot[0],-rot[1]],p=(Math.sin(t/450)+1)/2;
      PTS.forEach(pt=>{if(geoDistance(pt,mid)>=1.5)return;const[x,y]=proj(pt);
        ctx.strokeStyle=`rgba(94,168,255,${.9-p*.7})`;ctx.lineWidth=1.5;disc(x,y,5+p*14);ctx.stroke();
        ctx.fillStyle='#1E72D1';disc(x,y,4);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke()});
      raf=requestAnimationFrame(frame)};
    raf=requestAnimationFrame(frame);
    const dn=e=>{drag={x:e.clientX,y:e.clientY,r:[...rot]};cv.setPointerCapture(e.pointerId)};
    const mv=e=>{if(drag){rot[0]=drag.r[0]+(e.clientX-drag.x)*.35;rot[1]=Math.max(-60,Math.min(60,drag.r[1]-(e.clientY-drag.y)*.35))}};
    const up=()=>{drag=null};
    cv.addEventListener('pointerdown',dn);cv.addEventListener('pointermove',mv);cv.addEventListener('pointerup',up);
    return()=>{cancelAnimationFrame(raf);ro.disconnect();cv.removeEventListener('pointerdown',dn);cv.removeEventListener('pointermove',mv);cv.removeEventListener('pointerup',up)};
  },[]);
  return <canvas ref={ref} className="ls-globe-cv" role="img" aria-label="Rotating globe centred on India. Drag to rotate."/>;
}
