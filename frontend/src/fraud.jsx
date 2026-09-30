import {useState} from 'react';
import {Badge,Btn,Head,Empty,Li} from './ui.jsx';
import {rec,ownerOf} from './records.js';
import {stOf} from './data.js';
export const note=(p,text)=>({id:Date.now()+Math.random(),u:p.u,own:ownerOf(p),text,at:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})});
const rs=v=>{const[n,u]=v.split(' ');return parseFloat(n)*(u==='Cr'?1e7:u==='L'?1e5:1)};
const inr=n=>n>=1e7?(n/1e7).toFixed(2)+' Cr':(n/1e5).toFixed(1)+' L';
const rate=p=>+rec(p).circle.split(' ')[0].replace(',','');
const val=p=>parseFloat(p.a)*rate(p);
// Live rule + sample signals (the sample ones stand in for listing/mutation feeds not connected yet)
export function alerts(P){const out=[];
  P.filter(p=>p.s==='sale').forEach(p=>{const v=val(p),pr=rs(p.pr);if(pr<.6*v)out.push({id:'F-P-'+p.id,u:p.u,sev:'high',type:'Price below circle rate',d:`Asking ${p.pr} is ${Math.round(100*pr/v)}% of circle-rate value (${inr(v)}).`,live:true})});
  const has=u=>P.some(p=>p.u===u);
  has('CH-0421-9102')&&out.push({id:'F-S-1',u:'CH-0421-9102',sev:'high',type:'Duplicate listing',d:'Two active listings from different accounts for the same plot. Sample signal.'});
  has('CH-0612-4101')&&out.push({id:'F-S-2',u:'CH-0612-4101',sev:'med',type:'Quick resale',d:'Ownership changed 9 days ago and the plot is listed again. Sample signal.'});
  return out}
export function Fraud({S,u,toast}){const A=alerts(S.parcels),st=S.fraud||{},open=A.filter(a=>!st[a.id]);
  const act=(a,k)=>{const p=S.parcels.find(x=>x.u===a.u);u(s=>({fraud:{...s.fraud,[a.id]:k},notes:k==='escalated'&&p?[note(p,'Officer flagged suspicious activity on your plot: '+a.type),...s.notes]:s.notes}));toast(k==='escalated'?'Escalated. Owner notified.':'Marked '+k)};
  return <><Head eb="Trust and fraud" title="Fraud alerts" sub="Review queue built from listing, price and ownership-change signals."/>
    <div className="row mt" style={{marginBottom:12}}><Badge k={open.length?'no':'ok'}>{open.length} open</Badge><span className="mut small">{A.length-open.length} reviewed</span></div>
    {!A.length?<Empty>No alerts.</Empty>:A.map(a=><div key={a.id} className="card" style={{marginBottom:12,opacity:st[a.id]?.6:1}}>
      <div className="row" style={{justifyContent:'space-between'}}><div><b>{a.type}</b> <span className="mono mut">{a.u}</span><p className="mut small">{a.d}{a.live?' (live rule)':''}</p></div><Badge k={st[a.id]?'nu':a.sev==='high'?'no':'wa'}>{st[a.id]||(a.sev==='high'?'High':'Medium')}</Badge></div>
      {!st[a.id]&&<div className="row"><Btn s onClick={()=>act(a,'escalated')}>Escalate + notify owner</Btn><Btn s v="g" onClick={()=>act(a,'confirmed')}>Confirm fraud</Btn><Btn s v="g" onClick={()=>act(a,'dismissed')}>Dismiss</Btn></div>}</div>)}</>}
const SEED=[{id:'seed',u:'CH-0421-8873',own:'Ramesh Kumar',text:'Buyer #4821 viewed the public fields of your plot',at:'10:42'}];
export function Notes({S,u}){const me=S.name||'Ramesh Kumar',pr=S.nprefs,L=[...S.notes,...SEED].filter(n=>n.own===me||S.mine.some(id=>S.parcels.find(p=>p.id===id)?.u===n.u));
  const tg=k=>u(s=>({nprefs:{...s.nprefs,[k]:!s.nprefs[k]}})),ch=[['app','In-app'],['sms','SMS'],['wa','WhatsApp']].filter(([k])=>pr[k]).map(x=>x[1]);
  return <><Head eb="Fraud early warning" title="Notifications" sub="Get told when someone views, claims or applies for a change on your plot."/>
    <div className="card" style={{marginBottom:12}}><b>Channels</b><div className="row mt" role="group" aria-label="Channels">{[['app','In-app'],['sms','SMS'],['wa','WhatsApp']].map(([k,l])=><button key={k} className={'chip'+(pr[k]?' on':'')} aria-pressed={pr[k]} onClick={()=>tg(k)}>{l}</button>)}</div><div className="mut small mt">SMS and WhatsApp are simulated until a gateway is connected.</div></div>
    {L.length?<div className="card">{L.map(n=><Li key={n.id}><span>{n.text}<br/><span className="mut small mono">{n.u} · {n.at} · sent via {ch.join(', ')||'none (all channels off)'}</span></span></Li>)}</div>:<Empty>No notifications yet.</Empty>}</>}
export function BuyCheck({S,u}){const P=S.parcels.filter(x=>stOf(x)===S.st),[id,setId]=useState(P[0]?.id),[out,setOut]=useState(null);
  const run=()=>{const p=P.find(x=>x.id===+id);if(!p)return;const r=rec(p),C=[];
    C.push(['Ownership',p.s==='disp'?'stop':'pass',p.s==='disp'?'Ownership is disputed':`Record of Rights owner: ${r.owner}`,p.s==='disp'?'Do not proceed until the dispute is resolved.':'Ask the seller for ID matching this name.']);
    C.push(['Encumbrance',r.mortgages.length?'caution':'pass',r.mortgages.length?`${r.mortgages[0].bank}, ${r.mortgages[0].amt}, ${r.mortgages[0].status}`:'No mortgage on record',r.mortgages.length?'Get a release letter before paying.':'Obtain an encumbrance certificate.']);
    C.push(['Restrictions',r.govt!=='None'?'stop':r.restrict.length?'caution':'pass',r.govt!=='None'?'Government land '+r.govt.toLowerCase():r.restrict.length?r.restrict.join(', '):'No restriction zones',r.govt!=='None'?'Boundary overlaps government land.':'Check height or use limits with the planning office.']);
    C.push(['Property tax',r.tax==='No dues'?'pass':'caution',r.tax,'Ask the seller to clear dues before registration.']);
    C.push(['Legal cases',r.cases.length?'stop':'pass',r.cases.length?`${r.cases[0].no} (${r.cases[0].status})`:'No case on record','']);
    C.push(['Boundary (GIS vs record)',r.gis.startsWith('Match')?'pass':'caution',r.gis,'Order a survey before buying.']);
    if(p.s==='sale'){const v=val(p),pr=rs(p.pr);C.push(['Price vs circle rate',pr<.6*v?'caution':'pass',`Asking ${p.pr}; circle-rate value ${inr(v)}`,'Stamp duty is charged on the higher of the two.'])}
    const v=C.some(c=>c[1]==='stop')?'stop':C.some(c=>c[1]==='caution')?'caution':'pass';
    setOut({p,C,v});u(s=>({notes:[note(p,'A buyer ran a due-diligence check on your plot'),...s.notes]}))};
  const K={pass:'ok',caution:'wa',stop:'no'},T={pass:'PASS: no blocking issues found',caution:'CAUTION: resolve the flagged items first',stop:'STOP: do not buy until this is resolved'};
  return <><Head eb="Buyer protection" title="Before you buy" sub="Ownership, encumbrance, restriction and tax checks in one report."/>
    <div className="card" style={{marginBottom:12}}><label htmlFor="bp">Plot</label><select id="bp" value={id} onChange={e=>{setId(e.target.value);setOut(null)}}>{P.map(p=><option key={p.id} value={p.id}>{p.u} · {p.n}</option>)}</select><div className="mt"><Btn onClick={run}>Run checks</Btn></div></div>
    {out&&<div className="card"><Badge k={K[out.v]}>{T[out.v]}</Badge><h3 style={{margin:'10px 0'}}>{out.p.n} <span className="mono mut">{out.p.u}</span></h3>
      {out.C.map(([n,k,e,a])=><Li key={n}><span><b>{n}</b><br/><span className="small">{e}</span>{a&&k!=='pass'&&<><br/><span className="mut small">Next: {a}</span></>}</span><Badge k={K[k]}>{k}</Badge></Li>)}
      <div className="row mt"><Btn s onClick={()=>window.print()}>Print report</Btn></div><div className="mut small mt">Based on demo records. The owner is notified that a check was run.</div></div>}</>}
