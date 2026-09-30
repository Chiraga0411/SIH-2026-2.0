// Per-parcel record fields (derived deterministically from the parcel until /parcels API exists)
const NAMES={'CH-0421-8873':'Ramesh Kumar','CH-0421-8874':'Ramesh Kumar','CH-0421-9102':'Mohit Tyagi','CH-0533-2210':'Alok Garg','CH-0612-4102':'Ramesh Kumaar'};
export const ownerOf=p=>NAMES[p.u]||p.o;
export function sim(a,b){a=a.toLowerCase().trim();b=b.toLowerCase().trim();if(!a||!b)return 0;
  const d=Array.from({length:a.length+1},(_,i)=>[i,...Array(b.length).fill(0)]);for(let j=1;j<=b.length;j++)d[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return Math.round(100*(1-d[a.length][b.length]/Math.max(a.length,b.length)))}
export function rec(p){const i=p.id,disp=p.s==='disp',mort=p.s==='mort',ov=p.u==='CH-0533-2210',o=ownerOf(p),com=p.z==='C',y=2014+i%10;
  return{owner:o,khasra:i%9===0?'':`${100+i*7}/${i%4+1}`,
    coOwners:i%3===0?[[o,'50%'],['Co-owner (spouse)','50%']]:[[o,'100%']],
    reg:{deed:i%11===0?'':`RD/${y}/${4000+i*37}`,date:`${10+i%18} Mar ${y}`,office:'Sub-Registrar office'},
    govt:ov?'Overlap: 6 sq m':'None',gis:ov?'Mismatch: 6% vs record':'Matches record',
    mortgages:mort?[{bank:'State Bank of India',amt:'45 L',status:'Active'}]:[],
    cases:disp?[{no:`CS/${200+i}/2026`,court:'District Court',status:'Open'}]:[],
    tax:i%5===0?'Due: 18,400':'No dues',
    plan:{use:com?'Commercial':'Residential',far:com?'2.0':'1.5',height:com?'15 m':'10 m',setback:'3 m front, 1.5 m sides'},
    permit:{no:`BP/${y+1}/${900+i*11}`,floors:com?'G+3':'G+2',cc:i%7===0?'Pending':'Issued'},
    circle:com?'62,000 / sq yd':'48,000 / sq yd',
    restrict:ov?['Government land overlap']:i%6===0?['Airport height limit']:[],
    sources:{base:['Survey / GIS','12 Sep 2026'],ror:['Revenue','28 Sep 2026'],reg:['Registration','27 Sep 2026'],mp:['Town planning','01 Aug 2026'],
      enc:['Registration / banks','29 Sep 2026'],tax:['Municipal tax','25 Sep 2026'],env:['Environment','15 Jul 2026']}}}
// Trust breakdown. Uses VITE_TRUST_API when set, else this local estimate (labelled as such in the UI).
export function breakdown(p){const r=rec(p),c=[['Ownership',p.s==='disp'?30:95,.3],['Encumbrances',r.mortgages.length?55:100,.2],['Legal cases',r.cases.length?15:100,.2],
    ['Boundary match',r.gis.startsWith('Mismatch')?50:97,.15],['Data freshness',i=>i,.15]].map(([n,v,w])=>[n,typeof v==='function'?92:v,w]);
  const warn=[];if(r.cases.length)warn.push('Open court case: '+r.cases[0].no);if(r.mortgages.length)warn.push('Active mortgage with '+r.mortgages[0].bank);
  if(r.govt!=='None')warn.push('Government land '+r.govt.toLowerCase());if(r.tax!=='No dues')warn.push('Property tax '+r.tax.toLowerCase());
  const cap=r.cases.length?'Score capped at 40 while a court case is open':r.mortgages.length?'Score capped at 65 while a mortgage is active':null;
  const why=c.slice().sort((a,b)=>(100-b[1])*b[2]-(100-a[1])*a[2]).slice(0,3).map(x=>`${x[0]} (${x[1]}/100, weight ${Math.round(x[2]*100)}%)`);
  return{c,warn,cap,why,fresh:92}}
export async function trust(p){const b=import.meta.env.VITE_TRUST_API;if(!b)return null;
  try{const r=await fetch(`${b}/score?ulpin=${encodeURIComponent(p.u)}`);return r.ok?await r.json():null}catch{return null}}
