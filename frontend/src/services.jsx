import {useState} from 'react';
import {P,SVC,AUD,GEO,stOf} from './data.js';
import {Head,Badge,Btn,Li,Table,Empty} from './ui.jsx';

/* Mock rules. Replace each run() with the matching API call (GET /services/{id}?ulpin=). */
const GOVT={'CH-0533-2210':'Parcel boundary overlaps government land (suspected)','CH-0705-5002':'Inside wetland buffer zone (suspected)'};
const FLOORS={R:2,C:4};
const mask=n=>n.trim().split(/\s+/).map(w=>w[0]+'••••'+w.slice(-1)).join(' ');
const num=a=>parseInt(a)||200;
export const run=(id,p,x)=>{
  const bad=p.t<50,mid=p.t>=50&&p.t<75;
  if(id==='own')return{k:bad?'no':mid?'wa':'ok',t:bad?'Conflict on record':mid?'Needs review':'Ownership verified',
    rows:[['Revenue (RoR)',bad?'Dispute on record':'Match'],['Registration',bad?'Mismatch':'Match'],['GIS boundary','Verified'],['Trust Score',p.t+' / 100']]};
  if(id==='enc'){const m=p.s==='mort',d=p.s==='disp';return{k:d?'no':m?'wa':'ok',t:d||m?'Encumbrance found':'No encumbrance',
    rows:[['Bank mortgage',m?'Active':'None'],['Court case',d?'Open':'None'],['Registered deeds','1 on record']],cert:!d&&!m}}
  if(id==='lu'){const z=p.z==='R'?'Residential':'Commercial',ok=!x.use||x.use===z;return{k:ok?'ok':'wa',t:ok?'Use is compliant':'Use needs review (CLU)',
    rows:[['Master Plan 2035 zone',z],['Zoning code',p.z==='R'?'R1':'C1'],['Intended use',x.use||z]],cert:ok}}
  if(id==='res'){const g=GOVT[p.u];return{k:g?'wa':'ok',t:g?'Suspected restriction, needs review':'No restriction found',
    rows:[['Government land',g?'Overlap suspected':'None'],['Wetland / protected zone',g&&g.includes('wetland')?'Suspected':'None'],['Acquisition notice','None']],note:'Satellite and GIS flag suspected cases only. An officer decides.'}}
  if(id==='tax'){const due=p.id%3===0,a=num(p.a)*(p.z==='R'?9:16);return{k:due?'wa':'ok',t:due?'Tax due':'Paid up',
    rows:[['Assessment','₹'+(a*10).toLocaleString('en-IN')],['Annual demand','₹'+a.toLocaleString('en-IN')],['Status',due?'Due':'Paid'],['Last receipt',due?'2025':'2026']],note:'Mock tax data. Live data needs the municipal API.'}}
  if(id==='ror')return{k:'ok',t:'Record of Rights available',rows:[['Khatiyan / Jamabandi','On file'],['Owner',p.o],['Certified copy','Officer signs']],req:1};
  if(id==='mut'){const ok=p.s!=='disp';return{k:ok?'ok':'no',t:ok?'Eligible for mutation':'Blocked by dispute',rows:[['Registered deed','Verified'],['Court case',ok?'None':'Open']],req:ok,need:'New owner name'}}
  if(id==='bld'){const al=FLOORS[p.z],f=+x.fl||1,ok=f<=al;return{k:ok?'ok':'no',t:ok?'Within permit limit':'Exceeds permitted floors',
    rows:[['Zone limit',al+' floors'],['Planned',f+' floors']],req:ok,need:'Floors'}}
};
const html=(r,p)=>'<h2>Land Stack · '+r.n+'</h2><p>ULPIN '+p.u+' · '+p.n+'</p><p>Status: Issued (demo copy, not a legal document)</p>';
export function Services({S,u,toast}){
  const [sv,setSv]=useState(null),[ul,setUl]=useState(S.svcU||''),[x,setX]=useState({}),[out,setOut]=useState(null);
  const inSt=P.filter(q=>stOf(q)===S.st),p=S.parcels.find(q=>q.u===ul);
  const go=()=>{if(!p)return toast('Pick a plot first');setOut(run(sv.id,p,x))};
  const send=()=>{const r={id:'SR-'+(2001+S.svcReqs.length),n:sv.n,u:p.u,by:S.name||'Ramesh Kumar',s:'Pending',x:{...x}};
    u(s=>({svcReqs:[r,...s.svcReqs]}));AUD.unshift(['now',r.by,'Requested '+sv.n,p.u,'consent']);toast('Request sent. Target: '+sv.tat);setOut(null)};
  const my=S.svcReqs;
  return <><Head eb="One platform" title="Land services" sub="Check a plot instantly or apply for a certificate. Every step is logged."/>
    <div className="grid">{SVC.map(s=><button key={s.id} className="card svc" onClick={()=>{setSv(s);setOut(null);setX({})}} style={{textAlign:'left',cursor:'pointer',outline:sv&&sv.id===s.id?'2px solid var(--f)':'none'}}>
      <b style={{font:'500 18px var(--d)'}}>{s.i} {s.n}</b><div className="mut small" style={{margin:'6px 0 10px'}}>{s.d}</div>
      <Badge k="nu">{s.dep}</Badge> <span className="mut small">⏱ {s.tat}</span></button>)}</div>
    {sv&&<div className="card" style={{marginTop:16}}><h3 className="h22">{sv.n}</h3>
      <div className="row" style={{margin:'12px 0'}}>
        <select aria-label="Plot" value={ul} onChange={e=>{setUl(e.target.value);setOut(null)}}><option value="">Select a plot</option>{inSt.map(q=><option key={q.id} value={q.u}>{q.u} · {q.n}</option>)}</select>
        {sv.id==='lu'&&<select aria-label="Intended use" onChange={e=>setX({use:e.target.value})}><option value="">Intended use: as zoned</option><option>Residential</option><option>Commercial</option></select>}
        {sv.id==='bld'&&<input aria-label="Floors" type="number" min="1" max="10" placeholder="Planned floors" onChange={e=>setX({fl:e.target.value})}/>}
        {sv.id==='mut'&&<input aria-label="New owner" placeholder="New owner name" onChange={e=>setX({nn:e.target.value})}/>}
        <Btn onClick={go}>Check now</Btn></div>
      {out&&<><div className="row sp"><b>{out.t}</b><Badge k={out.k}>{out.k==='ok'?'Clear':out.k==='wa'?'Review':'Blocked'}</Badge></div>
        {out.rows.map(([a,b])=><Li key={a}><span className="mut">{a}</span><span className="mono">{b}</span></Li>)}
        {out.note&&<div className="note mt" style={{fontSize:12.5}}>{out.note}</div>}
        {(out.req||out.cert)&&<div className="mt"><Btn onClick={()=>(sv.id==='mut'&&!x.nn)?toast('Enter the new owner name'):send()}>{sv.id==='bld'||sv.id==='mut'?'Submit application':'Request certificate'}</Btn></div>}</>}</div>}
    <h3 className="h19" style={{margin:'22px 0 10px'}}>My requests</h3>
    {my.length?<Table cols={['Request','Service','ULPIN','Status','']} rows={my.map(r=>[<span className="mono">{r.id}</span>,r.n,<span className="mono">{r.u}</span>,<Badge k={r.s==='Issued'?'ok':r.s==='Rejected'?'no':'wa'}>{r.s}</Badge>,
      r.s==='Issued'&&<Btn s v="g" onClick={()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html(r,S.parcels.find(q=>q.u===r.u))],{type:'text/html'}));a.download=r.id+'.html';a.click()}}>Download</Btn>])}/>:<Empty>No requests yet. Pick a service above.</Empty>}</>;
}
export function ServiceQueue({S,u,toast}){
  const dec=(r,s)=>{u(st=>({svcReqs:st.svcReqs.map(q=>q.id===r.id?{...q,s}:q),parcels:s==='Issued'&&r.n==='Property Mutation'&&r.x.nn?st.parcels.map(q=>q.u===r.u?{...q,o:mask(r.x.nn)}:q):st.parcels}));
    AUD.unshift(['now','Land officer',s+' '+r.n,r.u,'approval']);toast(r.n+': '+s.toLowerCase())};
  const pend=S.svcReqs.filter(r=>r.s==='Pending');
  return <><Head eb="Officer desk" title="Service requests" sub="Certificates and applications from citizens. Final decision is yours."/>
    {pend.length?<Table cols={['Request','Service','ULPIN','By','']} rows={pend.map(r=>[<span className="mono">{r.id}</span>,r.n,<span className="mono">{r.u}</span>,r.by,<div className="row"><Btn s onClick={()=>dec(r,'Issued')}>Approve</Btn><Btn s v="g" onClick={()=>dec(r,'Rejected')}>Reject</Btn></div>])}/>:<Empty>No pending service requests.</Empty>}</>;
}
