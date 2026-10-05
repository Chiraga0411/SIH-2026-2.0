/* Real Esri World Imagery tiles. Parcel placement is illustrative, not surveyed. */
const X=(lo,z)=>(lo+180)/360*2**z,Y=(la,z)=>{const r=la*Math.PI/180;return(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*2**z};
export default function Sat({seed=1,b=1,w=900,h=570,c=[76.78,30.73]}){
  const z=17,fx=X(c[0],z)+((seed*37)%13-6)*.15,fy=Y(c[1],z)+((seed*53)%13-6)*.15,x0=Math.floor(fx)-1,y0=Math.floor(fy)-1;
  const ox=w/2-(fx-x0)*256,oy=h/2-(fy-y0)*256,t=[];
  for(let j=0;j<3;j++)for(let i=0;i<3;i++)t.push(<img key={i+'-'+j} alt="" loading="lazy" draggable="false" style={{position:'absolute',left:i*256,top:j*256,width:256,height:256}} src={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y0+j}/${x0+i}`}/>);
  return <div role="img" aria-label="Satellite imagery (illustrative placement)" style={{position:'relative',overflow:'hidden',width:'100%',height:'100%',background:'linear-gradient(135deg,#0B3D91,#1554B5)',filter:b===3?'saturate(.7) brightness(.9)':b===1?'contrast(1.1)':'none'}}>
    <div style={{position:'absolute',left:ox,top:oy,width:768,height:768}}>{t}</div></div>;
}
