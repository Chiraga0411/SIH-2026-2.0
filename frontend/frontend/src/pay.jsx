import {dues,payDue,isDemoMode} from './api.js';
import {useState} from 'react';
import {Badge,Btn,Head,Empty,Li} from './ui.jsx';
import {rec} from './records.js';
import {note} from './fraud.jsx';
import {stOf} from './data.js';
const FEE={OWN:200,ROR:100,ENC:300,BLD:5000,LUC:500,MUT:1000,SUC:1500},DAY=864e5,TAXDUE=new Date('2026-10-31').getTime();
const inr=n=>'₹'+n.toLocaleString('en-IN'),dl=t=>Math.ceil((t-Date.now())/DAY),taxAmt=p=>{const t=rec(p).tax;return t.startsWith('Due')?+t.replace(/\D/g,''):0};
const dfmt=t=>new Date(t).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
export function Family({S,u,toast}){
  const mine=S.parcels.filter(p=>S.mine.includes(p.id)),[pid,setPid]=useState(mine[0]?.id),[n,setN]=useState(''),[r,setR]=useState('Spouse'),[sh,setSh]=useState(''),[dec,setDec]=useState(0),[doc,setDoc]=useState(null),[err,setErr]=useState('');
  const p=mine.find(x=>x.id===+pid)||mine[0];
  if(!p)return <><Head eb="Family" title="Family and heirs" sub="Legal heirs, co-owner shares and succession."/><Empty>Claim a plot first.</Empty></>;
  const own=rec(p).coOwners,H=(S.heirs[p.u]||[]),tot=H.reduce((a,b)=>a+b.share,0),sub=S.apps.some(a=>a.id.startsWith('SUC')&&a.u===p.u),d=own[dec]||own[0],dp=parseFloat(d[1]);
  const setH=f=>u(s=>({heirs:{...s.heirs,[p.u]:f(s.heirs[p.u]||[])}}));
  const add=()=>{const v=+sh;if(!n.trim())return setErr('Enter the heir\'s name.');if(!(v>0)||tot+v>100)return setErr(`Share must be between 1 and ${100-tot}.`);setErr('');setH(h=>[...h,{name:n.trim(),rel:r,share:v}]);setN('');setSh('')};
  const start=()=>{if(tot!==100)return setErr('Heir shares must add up to 100%.');if(!doc)return setErr('Attach the death certificate.');setErr('');
    const a={id:'SUC-'+Date.now().toString().slice(-6),s:'Succession Mutation',u:p.u,dep:'Revenue Department',max:45,at:Date.now(),stage:0};
    u(x=>({apps:[a,...x.apps],notes:[note(p,'A succession mutation '+a.id+' was started on your plot'),...x.notes]}));toast('Succession '+a.id+' started. Track it in My applications.')};
  return <><Head eb="Family" title="Family and heirs" sub="Legal heirs, co-owner shares and succession."/>
    <div className="card" style={{marginBottom:12}}><label htmlFor="fp">Property</label><select id="fp" value={p.id} onChange={e=>{setPid(e.target.value);setDec(0);setErr('')}}>{mine.map(x=><option key={x.id} value={x.id}>{x.u} · {x.n}</option>)}</select>
      <h3 className="h19 mt">Co-owner shares (Record of Rights)</h3>{own.map(([a,b])=><Li key={a}><span>{a}</span><b className="mono">{b}</b></Li>)}</div>
    <div className="card" style={{marginBottom:12}}><h3 className="h19">Legal heirs</h3>
      <label htmlFor="fd">Succession applies to the share of</label><select id="fd" value={dec} onChange={e=>setDec(+e.target.value)}>{own.map(([a,b],i)=><option key={a} value={i}>{a} ({b})</option>)}</select>
      {H.map((h,i)=><Li key={i}><span>{h.name} <span className="mut small">({h.rel})</span></span><span><b className="mono">{h.share}%</b> <span className="mut small">= {(dp*h.share/100).toFixed(1)}% of plot</span> {!sub&&<button className="chip" aria-label={'Remove '+h.name} onClick={()=>setH(h2=>h2.filter((_,j)=>j!==i))}>Remove</button>}</span></Li>)}
      {!sub&&<div className="row mt"><input aria-label="Heir name" placeholder="Heir name" value={n} onChange={e=>setN(e.target.value)}/><select aria-label="Relation" value={r} onChange={e=>setR(e.target.value)}>{['Spouse','Son','Daughter','Parent','Sibling'].map(x=><option key={x}>{x}</option>)}</select><input aria-label="Share percent" inputMode="numeric" placeholder="Share %" style={{maxWidth:100}} value={sh} onChange={e=>setSh(e.target.value)}/><Btn s onClick={add}>Add heir</Btn></div>}
      <div className="mt"><Badge k={tot===100?'ok':'wa'}>{tot}% allocated</Badge></div>
      {!sub?<><label htmlFor="fc" className="mt">Death certificate</label><input id="fc" type="file" accept=".pdf,.jpg,.png" onChange={e=>setDoc(e.target.files[0]?.name||null)}/><div className="mt"><Btn onClick={start}>Start succession mutation</Btn></div></>:<p className="mut mt">A succession mutation is in progress for this plot.</p>}
      {err&&<div role="alert" className="small" style={{color:'var(--reds)',marginTop:8}}>{err}</div>}</div></>}
export function Pay({S,u,toast}){
  const P=S.parcels.filter(x=>stOf(x)===S.st),[pid,setPid]=useState(P[0]?.id),[sel,setSel]=useState(null),[upi,setUpi]=useState(''),[step,setStep]=useState('form'),[err,setErr]=useState('');
  const paid=new Set(S.pays.map(x=>x.ref)),p=P.find(x=>x.id===+pid),items=[];
  if(S.dues?.length)S.dues.filter(d=>d.status==='DUE').forEach(d=>items.push({id:d.id,ref:d.id,label:d.label,amt:d.amount,u:d.ulpin}));
  else p&&taxAmt(p)&&!paid.has('TAX-'+p.u)&&items.push({ref:'TAX-'+p.u,label:'Property tax',amt:taxAmt(p),u:p.u});
  S.apps.forEach(a=>{const f=FEE[a.id.split('-')[0]];f&&!paid.has(a.id)&&items.push({ref:a.id,label:a.s+' fee',amt:f,u:a.u})});
  const pay=async()=>{if(!/^[\w.-]{2,}@[a-z]{2,}$/i.test(upi))return setErr('Enter a valid UPI ID, e.g. name@bank.');setErr('');setStep('pending');try{const out=!isDemoMode()&&sel.id?await payDue(sel.id):null;const r={id:out?.receiptNo||'RCPT-'+Date.now().toString().slice(-7),txn:'UPI'+Math.floor(1e9+Math.random()*9e9),ref:sel.ref,label:sel.label,amt:out?.amount||sel.amt,u:sel.u,upi,at:new Date().toLocaleString('en-IN')};u(s=>({pays:[r,...s.pays],dues:(s.dues||[]).filter(d=>d.id!==sel.id)}));setStep('done');toast('Payment received')}catch(e){setStep('form');setErr(e.message)}};
  const last=S.pays[0];
  return <><Head eb="Payments" title="Pay dues and fees" sub="Property tax and service fees by UPI. Receipts are issued instantly."/>
    <div className="grid"><div className="card"><label htmlFor="pp">Check property tax for</label><select id="pp" value={pid} onChange={e=>{setPid(e.target.value);setSel(null);setStep('form')}}>{P.map(x=><option key={x.id} value={x.id}>{x.u} · {x.n}</option>)}</select>
      <h3 className="h19 mt">Outstanding</h3>{items.length?items.map(i=><Li key={i.ref}><span>{i.label}<br/><span className="mut small mono">{i.ref}</span></span><span><b>{inr(i.amt)}</b> <Btn s onClick={()=>{setSel(i);setStep('form');setErr('')}}>Pay</Btn></span></Li>):<p className="mut">Nothing due for this plot or your applications.</p>}</div>
    <div className="card">{sel&&step!=='done'?<><h3 className="h19">{sel.label}: {inr(sel.amt)}</h3><label htmlFor="up">UPI ID</label><input id="up" value={upi} onChange={e=>setUpi(e.target.value)} placeholder="name@bank" disabled={step==='pending'}/>
      {step==='pending'?<p role="status" className="mt">Waiting for approval in your UPI app...</p>:<div className="mt"><Btn onClick={pay}>Pay {inr(sel.amt)}</Btn></div>}{err&&<div role="alert" className="small" style={{color:'var(--reds)',marginTop:8}}>{err}</div>}<div className="mut small mt">Mock UPI: no money moves and nothing is sent to a bank.</div></>
      :step==='done'&&last?<Receipt r={last}/>:<div className="empty">Choose an item to pay.</div>}</div></div>
    {S.pays.length>1&&<div className="card mt"><h3 className="h19">Payment history</h3>{S.pays.map(x=><Li key={x.id}><span>{x.label} <span className="mut small mono">{x.id} · {x.at}</span></span><b>{inr(x.amt)}</b></Li>)}</div>}</>}
const Receipt=({r})=><div><Badge k="ok">Payment successful</Badge><h3 style={{margin:'10px 0'}}>Receipt {r.id}</h3>{[['For',r.label],['Plot / ref',r.u+' · '+r.ref],['Amount',inr(r.amt)],['UPI ID',r.upi],['Transaction',r.txn],['Date',r.at]].map(([a,b])=><Li key={a}><span className="mut">{a}</span><b className="mono">{b}</b></Li>)}<div className="mt"><Btn s onClick={()=>window.print()}>Print receipt</Btn></div></div>;
export function Remind({S}){
  const mine=S.parcels.filter(p=>S.mine.includes(p.id)),paid=new Set(S.pays.map(x=>x.ref)),L=[];
  S.apps.forEach(a=>{if(a.stage<3)L.push({k:'SLA',t:a.at+a.max*DAY,title:a.s+' due',sub:a.id+' · '+a.u});const f=FEE[a.id.split('-')[0]];if(f&&!paid.has(a.id))L.push({k:'Fee',t:a.at+7*DAY,title:'Pay '+a.s+' fee',sub:inr(f)+' · '+a.id})});
  mine.forEach(p=>{if(taxAmt(p)&&!paid.has('TAX-'+p.u))L.push({k:'Tax',t:TAXDUE,title:'Property tax due',sub:inr(taxAmt(p))+' · '+p.u});const m=rec(p).mortgages[0];if(m)L.push({k:'Mortgage',t:TAXDUE+15*DAY,title:'Follow up mortgage release',sub:m.bank+' · '+p.u})});
  (S.dues||[]).filter(d=>d.status==='DUE').forEach(d=>L.push({k:'Tax',t:d.dueDate?new Date(d.dueDate).getTime():TAXDUE,title:d.label||'Property tax due',sub:inr(d.amount)+' · '+d.ulpin}));
  L.sort((a,b)=>a.t-b.t);const ch=[['app','In-app'],['sms','SMS'],['wa','WhatsApp']].filter(([k])=>S.nprefs[k]).map(x=>x[1]).join(', ')||'none';
  const ics=x=>{const d=new Date(x.t).toISOString().slice(0,10).replace(/-/g,'');return 'data:text/calendar;charset=utf-8,'+encodeURIComponent(`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:${x.title}-${d}@landstack\r\nDTSTAMP:${d}T000000Z\r\nDTSTART;VALUE=DATE:${d}\r\nSUMMARY:${x.title}\r\nDESCRIPTION:${x.sub}\r\nEND:VEVENT\r\nEND:VCALENDAR`)};
  return <><Head eb="Deadlines" title="Reminders" sub="SLA dates, tax due dates, fees and mortgage release in one list."/>
    <div className="card"><div className="mut small" style={{marginBottom:8}}>Reminders go to: {ch} (simulated). Change channels in Notifications.</div>
      {L.map((x,i)=>{const d=dl(x.t);return <Li key={i}><span><b>{x.title}</b><br/><span className="mut small">{x.sub} · {dfmt(x.t)}</span></span><span className="row"><Badge k={d<0?'no':d<=7?'wa':'ok'}>{d<0?`${-d}d overdue`:d===0?'Today':`${d}d left`}</Badge><a className="small" href={ics(x)} download="reminder.ics">Add to calendar</a></span></Li>})}</div></>}
