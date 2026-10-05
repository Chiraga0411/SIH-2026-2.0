import {services,serviceResult,createServiceRequest,serviceRequests,advanceService,downloadCertificate,isDemoMode} from './api.js';
import {useState} from 'react';
import {Badge,Btn,Head,Empty,Li,Loading,ErrorState} from './ui.jsx';
import {rec} from './records.js';
import {note} from './fraud.jsx';
export const SERVICES=[
 {k:'own',backendId:'ownership-verification',n:'Ownership Verification',g:'✓',d:'Verify ownership records across Revenue and Registration departments',dep:'Revenue + Registration',t:'2-3 business days',max:3},
 {k:'ror',backendId:'ror-extract',n:'RoR Extract',g:'▤',d:'Request a certified copy of Record of Rights (Khatiyan / Jamabandi)',dep:'Revenue Department',t:'3-5 business days',max:5},
 {k:'enc',backendId:'encumbrance-certificate',n:'Encumbrance Certificate',g:'⌂',d:'Check non-encumbrance status, bank mortgages and registered deeds',dep:'Registration Department',t:'2-3 business days',max:3},
 {k:'bld',backendId:'building-permission',n:'Building Permission',g:'⚒',d:'Apply for building plan clearance or layout NOC from Town Planning',dep:'Planning Department',t:'15-30 business days',max:30},
 {k:'luc',backendId:'land-use-certificate',n:'Land Use Certificate',g:'❦',d:'Get certified Master Plan 2035 land use and zoning compliance certificate',dep:'Planning Department',t:'5-7 business days',max:7},
 {k:'tax',backendId:'property-tax-query',n:'Property Tax Query',g:'₹',d:'View municipal property tax assessment, tax demand, and payment receipts',dep:'Municipality Department',t:'Instant',max:0},
 {k:'mut',backendId:'property-mutation',n:'Property Mutation',g:'✎',d:'Apply for mutation / title name transfer in Jamabandi revenue records',dep:'Revenue Department',t:'15-45 business days',max:45},
 {k:'rst',backendId:'restriction-check',n:'Restriction Check',g:'⚠',d:'Check if parcel falls in government acquisition, wetland, or protected zone',dep:'Revenue Department',t:'Instant',max:0}];
export function Services({S,u,toast}){
  const mine=S.parcels.filter(p=>S.mine.includes(p.id)),[sv,setSv]=useState(null),[pid,setPid]=useState(''),[res,setRes]=useState(null);
  const pick=s=>{setSv(s);setRes(null);setPid(mine[0]?.id||'')};
  const go=async()=>{const p=S.parcels.find(x=>String(x.id)===String(pid)||x.u===pid);if(!p)return toast('Choose a property first');if(!isDemoMode()){try{if(!sv.max){const out=await serviceResult(sv.backendId||sv.k,p.u);setRes({p,rows:Object.entries(out.result||{}).map(([a,b])=>[a,String(b)]),ok:out.status==='COMPLETED'&&!(out.result?.clear===false)});return}const out=await createServiceRequest({serviceId:sv.backendId||sv.k,ulpin:p.u});u(x=>({apps:[out.request||out,...x.apps]}));toast(`Application ${out.refId||out.request?.refId||''} submitted`);setSv(null);return}catch(e){toast(e.message);return}}const r=rec(p);
    if(!sv.max){const out=sv.k==='tax'?[['Assessment status',r.tax==='No dues'?'Paid up':'Demand pending'],['Tax',r.tax]]:[['Government land',r.govt],['Restriction zones',r.restrict.length?r.restrict.join(', '):'None'],['Court case',r.cases.length?'Open':'None']];
      return setRes({p,rows:out,ok:sv.k==='tax'?r.tax==='No dues':r.govt==='None'&&!r.restrict.length})}
    const a={id:`${sv.k.toUpperCase()}-${Date.now().toString().slice(-6)}`,s:sv.n,u:p.u,dep:sv.dep,max:sv.max,at:Date.now(),stage:0,k:sv.k};
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
export function Applications({S,u,go,toast}){
  const [rejectId,setRejectId]=useState(null),[reason,setReason]=useState(''),[err,setErr]=useState('');
  const rows=S.apps||[];
  const reject=async a=>{if(!reason.trim())return;try{if(!isDemoMode())await advanceService(a.id,'reject',reason);u(x=>({apps:x.apps.map(y=>y.id===a.id?{...y,status:'REJECTED',rejection:{reason}}:y)}));toast('Application rejected');setRejectId(null);setReason('')}catch(e){setErr(e.message)}};
  const advance=async a=>{try{const out=await advanceService(a.id,'advance');u(x=>({apps:x.apps.map(y=>y.id===a.id?(out.request||out):y)}));toast('Application advanced')}catch(e){setErr(e.message)}};
  const cert=async a=>{try{const blob=await downloadCertificate(a.id);const url=URL.createObjectURL(blob),el=document.createElement('a');el.href=url;el.download=`${a.refId||a.id}.txt`;el.click();URL.revokeObjectURL(url)}catch(e){setErr(e.message)}};
  return <><Head eb="Track" title="My applications" sub="Reference ID, backend-driven steps and SLA for every request"/>{err&&<ErrorState msg={err} retry={()=>setErr('')}/>}
    {!rows.length?<Empty>No applications yet. <button className="chip" onClick={()=>go('services')}>Open Land Services</button></Empty>:rows.map(a=>{const steps=a.steps||[];const stage=a.currentStep||a.stage||0;const rejected=a.status==='REJECTED'||a.rejected,done=a.status==='ISSUED'||a.status==='COMPLETED';const due=a.slaDueAt?Math.ceil((new Date(a.slaDueAt)-Date.now())/864e5):null;return <div key={a.id||a.refId} className="card" style={{marginBottom:12}}><div className="row" style={{justifyContent:'space-between'}}><div><b>{a.serviceName||a.s||'Land service'}</b><div className="mut small mono">{a.refId||a.id} · {a.ulpin} · {a.department||a.dep}</div></div><Badge k={rejected?'no':done?'ok':due!=null&&due<0?'no':'wa'}>{rejected?'Rejected':done?'Issued':due==null?'In progress':due<0?`SLA breached by ${-due}d`:`${due}d left`}</Badge></div><div className="sla-steps">{steps.map((step,i)=>{const name=typeof step==='string'?step:step.name;const status=typeof step==='string'?(i<stage?'done':i===stage?'in_progress':''):step.status;return <div key={name+i} className={'sla-step '+(status==='done'?'done':status==='in_progress'?'current':'')}><b>{i+1}. {name}</b>{typeof step!=='string'&&step.slaHours!=null&&<div className="sla-sub">{step.slaHours}h SLA</div>}</div>})}</div>{a.certificateUrl&&done&&<Btn s onClick={()=>cert(a)}>Download certificate</Btn>}{S.role==='officer'&&!done&&!rejected&&<div className="row mt"><Btn s onClick={()=>advance(a)}>Advance</Btn><Btn s v="g" onClick={()=>{setRejectId(a.id);setReason('')}}>Reject</Btn></div>}{rejectId===a.id&&<div className="mt"><textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason"/><Btn s v="g" onClick={()=>reject(a)}>Confirm rejection</Btn></div>}</div>})}</>;
}

