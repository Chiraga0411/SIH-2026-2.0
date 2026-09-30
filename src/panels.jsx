import {useState,useEffect} from 'react';
import {Badge} from './ui.jsx';
import {rec,breakdown,trust} from './records.js';
const bar=v=>v>=75?'#16A34A':v>=50?'#F59E0B':'#DC2626';
export function RecordStatus({p}){const r=rec(p),m=r.mortgages[0],c=r.cases[0];
  const rows=[['Ownership',p.s==='disp'?'no':'ok',p.s==='disp'?'Disputed':'Verified'],['Government land',r.govt==='None'?'ok':'no',r.govt],['Registration',r.reg.deed?'ok':'wa',r.reg.deed?'Deed '+r.reg.deed:'Deed number missing'],
    ['Mortgage',m?'wa':'ok',m?`${m.bank} ${m.amt} (${m.status})`:'None'],['GIS boundary',r.gis.startsWith('Match')?'ok':'wa',r.gis],['Court case',c?'no':'ok',c?`${c.no} ${c.status}`:'None'],['Property tax',r.tax==='No dues'?'ok':'wa',r.tax]];
  return <div className="rec" style={{marginTop:10}}>{rows.map(([a,k,b])=><div key={a}><span className="mut">{a}</span><Badge k={k}>{b}</Badge></div>)}</div>}
export function ScorePanel({p}){const [api,setApi]=useState(null),b=breakdown(p);
  useEffect(()=>{let ok=true;trust(p).then(x=>ok&&setApi(x));return()=>{ok=false}},[p.u]);
  return <div style={{marginTop:16}}><b style={{font:'500 16px var(--d)'}}>Why this score</b>
    <div className="mut small" style={{margin:'4px 0 8px'}}>{api?'From the trust-score service':'Local estimate from parcel records (set VITE_TRUST_API to use the live model)'}</div>
    {b.c.map(([n,v,w])=><div key={n} style={{margin:'6px 0'}}><div className="row small" style={{justifyContent:'space-between'}}><span>{n} <span className="mut">· weight {Math.round(w*100)}%</span></span><b className="mono">{v}</b></div>
      <div style={{height:7,background:'var(--bg2)',borderRadius:4}} role="img" aria-label={`${n} ${v} of 100`}><div style={{width:v+'%',height:'100%',background:bar(v),borderRadius:4}}/></div></div>)}
    {b.cap&&<div className="note" style={{background:'var(--reds)',marginTop:8,fontSize:12.5}}><b>Cap applied.</b> {b.cap}</div>}
    {b.warn.map(w=><div key={w} className="note" style={{background:'var(--safs)',marginTop:6,fontSize:12.5}}>{w}</div>)}
    <div className="small" style={{marginTop:8}}><b>Top factors:</b> {b.why.join('; ')}</div></div>}
export function LayerExplorer({p}){const r=rec(p),s=r.sources,[open,setOpen]=useState('Base');
  const L={Base:[['Parcel boundary + ULPIN',p.u,s.base],['Khasra / survey no.',r.khasra||'Missing',s.base]],
    Essential:[['Record of Rights',r.coOwners.map(x=>x.join(' '+'· ')).join(', '),s.ror],['Registration',`${r.reg.deed||'deed no. missing'}, ${r.reg.date}, ${r.reg.office}`,s.reg],
      ['Master plan',`${r.plan.use}, FAR ${r.plan.far}, height ${r.plan.height}, setback ${r.plan.setback}`,s.mp],['Building permission',`${r.permit.no}, ${r.permit.floors}, completion cert ${r.permit.cc}`,s.mp],
      ['Encumbrances',r.mortgages.length?`${r.mortgages[0].bank} ${r.mortgages[0].amt} ${r.mortgages[0].status}`:'None on record',s.enc]],
    Additional:[['Property tax',r.tax,s.tax],['Circle rate',r.circle,s.reg],['Restriction zones',r.restrict.length?r.restrict.join(', '):'None',s.env]]};
  return <div style={{marginTop:16}}><b style={{font:'500 16px var(--d)'}}>Data layers</b>
    <div className="row" style={{margin:'8px 0',gap:6}} role="tablist">{Object.keys(L).map(k=><button key={k} role="tab" aria-selected={open===k} className={'chip'+(open===k?' on':'')} onClick={()=>setOpen(k)}>{k}</button>)}</div>
    {L[open].map(([n,v,[dept,dt]])=><div key={n} className="li" style={{display:'block'}}><b>{n}</b><div className="small">{v}</div><div className="mut small">Source: {dept} · updated {dt}</div></div>)}</div>}
