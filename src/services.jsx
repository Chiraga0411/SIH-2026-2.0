import {useState} from 'react';
import {Badge,Btn,Head,Empty} from './ui.jsx';
import {rec} from './records.js';
import {note} from './fraud.jsx';
export const SERVICES=[
 {k:'own',n:'Ownership Verification',g:'✓',d:'Verify ownership records across Revenue and Registration departments',dep:'Revenue + Registration',t:'2-3 business days',max:3},
 {k:'ror',n:'RoR Extract',g:'▤',d:'Request a certified copy of Record of Rights (Khatiyan / Jamabandi)',dep:'Revenue Department',t:'3-5 business days',max:5},
 {k:'enc',n:'Encumbrance Certificate',g:'⌂',d:'Check non-encumbrance status, bank mortgages and registered deeds',dep:'Registration Department',t:'2-3 business days',max:3},
 {k:'bld',n:'Building Permission',g:'⚒',d:'Apply for building plan clearance or layout NOC from Town Planning',dep:'Planning Department',t:'15-30 business days',max:30},
 {k:'luc',n:'Land Use Certificate',g:'❦',d:'Get certified Master Plan 2035 land use and zoning compliance certificate',dep:'Planning Department',t:'5-7 business days',max:7},
 {k:'tax',n:'Property Tax Query',g:'₹',d:'View municipal property tax assessment, tax demand, and payment receipts',dep:'Municipality Department',t:'Instant',max:0},
 {k:'mut',n:'Property Mutation',g:'✎',d:'Apply for mutation / title name transfer in Jamabandi revenue records',dep:'Revenue Department',t:'15-45 business days',max:45},
 {k:'rst',n:'Restriction Check',g:'⚠',d:'Check if parcel falls in government acquisition, wetland, or protected zone',dep:'Revenue Department',t:'Instant',max:0}];
const STAGES=['Submitted','Department review','Verification','Issued'];
const DAY=864e5,left=a=>Math.ceil((a.at+a.max*DAY-Date.now())/DAY);
export function Services({S,u,toast}){
  const mine=S.parcels.filter(p=>S.mine.includes(p.id)),[sv,setSv]=useState(null),[pid,setPid]=useState(''),[res,setRes]=useState(null);
  const pick=s=>{setSv(s);setRes(null);setPid(mine[0]?.id||'')};
  const go=()=>{const p=S.parcels.find(x=>x.id===+pid);if(!p)return toast('Choose a property first');const r=rec(p);
    if(!sv.max){const out=sv.k==='tax'?[['Assessment status',r.tax==='No dues'?'Paid up':'Demand pending'],['Tax',r.tax]]:[['Government land',r.govt],['Restriction zones',r.restrict.length?r.restrict.join(', '):'None'],['Court case',r.cases.length?'Open':'None']];
      return setRes({p,rows:out,ok:sv.k==='tax'?r.tax==='No dues':r.govt==='None'&&!r.restrict.length})}
    const a={id:`${sv.k.toUpperCase()}-${Date.now().toString().slice(-6)}`,s:sv.n,u:p.u,dep:sv.dep,max:sv.max,at:Date.now(),stage:0};
    u(x=>({apps:[a,...x.apps],notes:sv.k==='mut'?[note(p,'A mutation application '+a.id+' was filed on your plot'),...x.notes]:x.notes}));toast('Application '+a.id+' submitted');setSv(null)};
  return <><Head eb="Citizen services" title="Land Services" sub="Access all land governance services from a single platform"/>
    {sv&&<div className="card" style={{marginBottom:16}} role="dialog" aria-label={sv.n}><h3 className="h19">{sv.n}</h3>
      {mine.length?<><label htmlFor="sp">Property</label><select id="sp" value={pid} onChange={e=>setPid(e.target.value)}>{mine.map(p=><option key={p.id} value={p.id}>{p.u} · {p.n}</option>)}</select>
        <div className="mt row"><Btn onClick={go}>{sv.max?'Submit application':'Check now'}</Btn><Btn s onClick={()=>setSv(null)}>Cancel</Btn></div></>:<p className="mut">Claim a plot first. Services apply to your verified properties.</p>}
      {res&&<div className="mt"><Badge k={res.ok?'ok':'wa'}>{res.ok?'Clear':'Needs attention'}</Badge>{res.rows.map(([a,b])=><div key={a} className="li"><span>{a}</span><b>{b}</b></div>)}</div>}</div>}
    <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))'}}>{SERVICES.map(s=>
      <button key={s.k} className="card" style={{textAlign:'left',cursor:'pointer'}} onClick={()=>pick(s)}>
        <div className="row" style={{flexWrap:'nowrap',alignItems:'flex-start'}}><span aria-hidden="true" style={{font:'500 22px var(--d)'}}>{s.g}</span>
          <div><b style={{font:'500 17px var(--d)'}}>{s.n}</b><p className="mut small">{s.d}</p><div className="row small"><Badge k="nu">{s.dep}</Badge><span className="mut">{s.t}</span></div></div></div></button>)}</div></>}
export function Applications({S,u,go}){
  return <><Head eb="Track" title="My applications" sub="Reference ID, stage and SLA for every service request"/>
    {!S.apps.length?<Empty>No applications yet. <a href="#" onClick={e=>{e.preventDefault();go('services')}}>Open Land Services</a></Empty>:
    S.apps.map(a=>{const d=left(a),done=a.stage>=3;return <div key={a.id} className="card" style={{marginBottom:12}}>
      <div className="row" style={{justifyContent:'space-between'}}><div><b>{a.s}</b><div className="mut small mono">{a.id} · {a.u} · {a.dep}</div></div>
        <Badge k={done?'ok':d<0?'no':'wa'}>{done?'Issued':d<0?`SLA breached by ${-d}d`:`${d} day${d===1?'':'s'} left`}</Badge></div>
      <ol className="row small" style={{listStyle:'none',padding:0,margin:'12px 0',gap:8}} aria-label="Stages">{STAGES.map((t,i)=><li key={t}><Badge k={i<=a.stage?'ok':'nu'}>{i+1}. {t}</Badge></li>)}</ol>
      {!done&&<Btn s onClick={()=>u(x=>({apps:x.apps.map(y=>y.id===a.id?{...y,stage:y.stage+1}:y)}))}>Demo: advance stage</Btn>}</div>})}</>}
