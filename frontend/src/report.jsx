import {useState,useEffect} from 'react';
import {Badge,Btn,Li} from './ui.jsx';
import {Ulpin} from './ulpin.jsx';
import {fetchFullReport,isDemoMode} from './api.js';

const ZONE={R:'Residential',C:'Commercial',A:'Agricultural',I:'Industrial',G:'Government'};
const STATUS={none:'No active transaction',sale:'Listed for sale',mort:'Mortgaged',disp:'Disputed'};
const SKIP=new Set(['_id','__v','id','ulpin','geometry','shape','owner','viewer','hidden','legacyId','surveyNo','name','state','district','area','zoning','status','trustScore','ownerName','maskedOwner','phone','price','address','risks','createdAt','updatedAt']);
const human=k=>String(k).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]+/g,' ').replace(/^./,c=>c.toUpperCase());
const val=v=>v==null||v===''?'—':typeof v==='boolean'?(v?'Yes':'No'):Array.isArray(v)?(v.length?v.map(val).join(', '):'None'):typeof v==='object'?Object.entries(v).map(([k,x])=>`${human(k)}: ${val(x)}`).join(' · '):String(v);

export function ReportView({report,onClose}){
  const r=report?.raw||{};
  const rows=[
    ['Plot',report.n],['ULPIN',<Ulpin value={report.u}/>],r.legacyId&&['Legacy ID',r.legacyId],['Survey number',report.surveyNo||r.surveyNo],
    ['State',r.state||report.st],r.district&&['District',r.district],['Area',report.a],['Zoning',ZONE[report.z]||report.z],['Status',STATUS[report.s]||report.s],
    ['Trust score',report.t],['Owner',report.ownerName||r.ownerName||report.o],['Phone',report.phone||r.phone],['Price',r.price||report.pr],['Address',report.address||r.address]
  ].filter(Boolean).filter(([,v])=>v!==undefined);
  const extra=Object.entries(r).filter(([k])=>!SKIP.has(k));
  return <div className="card mt" role="region" aria-label="Full report">
    <div className="row sp"><b>Full report</b><div className="row">{report.viewer?.relation&&<Badge k="nu">{human(report.viewer.relation)} view</Badge>}{onClose&&<Btn s v="g" onClick={onClose}>Close</Btn>}</div></div>
    {rows.map(([l,v])=><Li key={l}><span className="mut">{l}</span><b>{typeof v==='object'?v:val(v)}</b></Li>)}
    {extra.map(([k,v])=><Li key={k}><span className="mut">{human(k)}</span><b>{val(v)}</b></Li>)}
    {report.hidden?.length>0&&<div className="mut small mt">Hidden by owner: {report.hidden.map(human).join(', ')}</div>}
  </div>;
}

function Countdown({until}){
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t)},[]);
  const ms=new Date(until).getTime()-now;
  if(!until||Number.isNaN(ms))return null;
  if(ms<=0)return <span>expired</span>;
  const h=Math.floor(ms/36e5),m=Math.floor(ms%36e5/6e4),s=Math.floor(ms%6e4/1e3);
  return <span className="mono">{h}h {String(m).padStart(2,'0')}m {String(s).padStart(2,'0')}s left</span>;
}

const LABEL={PENDING:['wa','Waiting for owner'],APPROVED:['ok','Approved'],REJECTED:['no','Rejected'],EXPIRED:['nu','Expired']};
export function MyRequests({S,u,toast}){
  const [busy,setBusy]=useState(null),[msgs,setMsgs]=useState({});
  const rows=S.myReqs||[];
  if(!rows.length)return null;
  const open=async r=>{
    const id=r._id||r.id,ulpin=r.ulpin||r.parcel?.ulpin;
    setBusy(id);
    try{const full=await fetchFullReport(ulpin);setMsgs(m=>({...m,[id]:''}));u({selectedReport:full})}
    catch(e){setMsgs(m=>({...m,[id]:e.status===403?(e.message||'Consent required or expired'):e.message}));u({selectedReport:null})}
    finally{setBusy(null)}
  };
  return <div className="card" style={{marginBottom:12}}><h3 className="h19">My requests</h3>
    {rows.map((r,i)=>{
      const id=r._id||r.id||i,live=r.status==='APPROVED'&&r.expiresAt&&new Date(r.expiresAt)>new Date(),status=r.status==='APPROVED'&&r.expiresAt&&!live?'EXPIRED':(r.status||'PENDING'),[k,l]=LABEL[status]||['nu',status];
      return <Li key={id}><span><Ulpin value={r.ulpin||r.parcel?.ulpin} copy={false}/> · {String(r.purpose||'due_diligence').replace(/_/g,' ')}<br/>
        <span className="mut small"><Badge k={k}>{l}</Badge> {live&&<Countdown until={r.expiresAt}/>}{msgs[id]&&<span role="alert" style={{color:'var(--reds)'}}> {msgs[id]}</span>}</span></span>
        {live&&<Btn s disabled={busy===id} onClick={()=>open(r)}>Open full report</Btn>}
        {status==='EXPIRED'&&<Btn s v="g" onClick={()=>open(r)}>Try again</Btn>}</Li>;
    })}
  </div>;
}
