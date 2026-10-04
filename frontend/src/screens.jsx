import {Ulpin} from './ulpin.jsx';
import {ReportView,MyRequests} from './report.jsx';
import {claim,requestConsent,createListing,listings,putPrivacy,getPrivacy,isDemoMode,inquiry,eligibility,submitRegistration,decideConsent,decideRegistration,fetchParcel,fetchFullReport} from './api.js';
import {useState,useEffect} from 'react';
import Sat from './Sat.jsx';
import Map3D from './Map3D.jsx';
import {SC,ST,GEO,stOf} from './data.js';
import {ErrorState,Badge,Chip,Btn,Head,Empty,Gauge,Table,Kpis,Li,vd} from './ui.jsx';
import {Adm,Users,States,Audit,RBAC,Threats,PII,Import} from './admin.jsx';
import {ChatPage} from './Chat.jsx';
import {RecordStatus,ScorePanel,LayerExplorer,RiskProfile} from './panels.jsx';
import {Profile} from './profile.jsx';
import {Cases,Dupes,Quality} from './desk.jsx';
import {Family,Pay,Remind} from './pay.jsx';
import {Fraud,Conflicts,Notes,BuyCheck,note} from './fraud.jsx';
import {Services,Applications} from './services.jsx';
import {rec,ownerOf,sim} from './records.js';

export {Login} from './Login.jsx';

function Parcel({p,S,u,toast,go}){
  const [purpose,setPurpose]=useState('due_diligence'),[report,setReport]=useState(null),[reportErr,setReportErr]=useState('');
  const openReport=async()=>{try{setReport(await fetchFullReport(p.u))}catch(e){setReportErr(e.message)}};
  const [k,l]=vd(p.t),tab=S.tab,r=rec(p);
  const a=p.pts.split(' ').map(q=>q.split(',').map(Number)),[x0,y0]=a[0],w=a[2][0]-x0,h=a[2][1]-y0;
  const facts=[['Area',p.a],['Land use',p.z==='R'?'Residential':'Commercial'],['Zoning',p.z==='R'?'R1 · Residential':'C1 · Commercial'],['Last verified',r.sources.ror[1]]];
  const tone=p.t>=75?'var(--mint)':p.t>=50?'var(--safs)':'var(--reds)';
  const isOwner=S.mine.includes(p.id);
  const T={
    Overview:<>
      <div className="row" style={{alignItems:'flex-start',flexWrap:'nowrap'}}>
        <div className="th"><Sat seed={p.id+10} w={240} h={220} c={(GEO[stOf(p)]||{}).center}/><svg viewBox={`${x0-14} ${y0-14} ${w+28} ${h+28}`} preserveAspectRatio="xMidYMid slice"><polygon points={p.pts} fill="rgba(255,255,255,.15)" stroke="#8CC8FF" strokeWidth="4"/></svg></div>
        <div className="small" style={{flex:1}}>{facts.map(([a,b])=><div key={a} className="mut" style={{marginBottom:6}}>{a}<br/><b className="mono" style={{color:'var(--ink)'}}>{b}</b></div>)}</div></div>
      <div className="row" style={{margin:'14px 0',flexWrap:'nowrap'}}><Gauge t={p.t}/><div className="note" style={{background:tone,fontSize:12.5}}><b>Trust Score · {p.t>=75?'High trust':p.t>=50?'Check before buying':'Low trust'}</b><br/>{p.t>=75?'All major records verified. No known encumbrances.':p.t>=50?'An active mortgage is on record.':'A dispute is on record. Transactions are blocked.'}</div></div>
      <b style={{font:'500 16px var(--d)'}}>Record status</b>
      <RecordStatus p={p}/><ScorePanel p={p}/><RiskProfile p={p}/><LayerExplorer p={p}/></>,
    'Land Passport':<><Li>Owner<span className="mono">{ownerOf(p)}</span></Li><Li>Asking price<span className="mono">{p.s==='sale'?p.pr:'Not listed'}</span></Li><Li>ULPIN layers<span className="mono">Base · Essential · Additional</span></Li></>,
    Timeline:<><Li>Record verified<span className="mono mut">{r.sources.ror[1]}</span></Li><Li>Boundary checked<span className="mono mut">{r.sources.base[1]}</span></Li><Li>Registered<span className="mono mut">{r.reg.date}</span></Li></>,
    Documents:<><Li>Record of Rights<Badge k="ok">Verified</Badge></Li><Li>Sale deed<Badge k="ok">Verified</Badge></Li><Li>Full copies need owner consent<Badge>Locked</Badge></Li></>,
    Risk:<><RiskProfile p={p}/></>};
  const tabKeys=S.role==='citizen'?['Overview','Land Passport','Timeline','Documents','Risk']:['Overview','Land Passport','Timeline','Documents','Risk'];
  return <>
    <div className="row sp"><h3 className="h22">Land parcel</h3><div className="row"><Badge k={k}>{l}</Badge><Btn v="g" s aria-label="Close panel" onClick={()=>u({sel:null})}>Close</Btn></div></div>
    <div style={{marginTop:8,fontSize:15}}><b><Ulpin value={p.u}/></b></div><div className="mut small">{p.n} · {GEO[stOf(p)].city}</div>
    <div className="tabs" role="tablist">{tabKeys.map(t=><button key={t} role="tab" className={tab===t?'on':''} onClick={()=>u({tab:t})}>{t}</button>)}</div>
    {T[tab]}
    <div className="act">
      {S.role==='citizen'&&isOwner&&<Btn s onClick={()=>go('claim')}>Claim plot</Btn>}
      {S.role==='citizen'&&isOwner&&<Btn s v="sa" onClick={()=>{u({view:'sell',sellId:p.id})}}>List for sale</Btn>}
      {S.role==='citizen'&&!isOwner&&<><select aria-label="Report purpose" value={purpose} onChange={e=>setPurpose(e.target.value)}><option value="due_diligence">Due diligence</option><option value="loan">Loan / mortgage</option><option value="legal">Legal review</option></select><Btn s v="g" onClick={async()=>{try{if(!isDemoMode())await requestConsent(p.u,purpose);u(s=>({reqs:[...s.reqs,{who:'You',ulpin:p.u,left:'24h',purpose}],notes:[note(p,'A buyer requested the full report on your plot for '+purpose),...s.notes]}));toast('Report requested. Owner has 24 hours.')}catch(e){toast(e.message)}}}>Request full report</Btn><Btn s onClick={openReport}>Open full report</Btn>{reportErr&&<ErrorState msg={reportErr} retry={openReport}/>} {report&&<ReportView report={report} onClose={()=>setReport(null)}/>}</>}
      {S.role==='officer'&&<Btn s onClick={()=>go('casedesk')}>Open case</Btn>}
    </div></>;
}

function buildActivity(S){const act=[];
  S.apps.slice(0,2).forEach(a=>act.push([a.s+' submitted',a.u,'recently']));
  S.queue.slice(0,1).forEach(q=>act.push(['Claim pending review',q.u,'recently']));
  S.regs.slice(0,1).forEach(r=>act.push(['Registration awaiting approval',r.u,'recently']));
  if(!act.length)act.push(['New parcel verified','CH-0421-8874','1 hour ago'],['Sale request submitted','CH-0533-2211','2 hours ago']);
  return act.slice(0,4)}

function buildPending(S,role){const pend=[];
  if(role==='citizen'){
    if(S.reqs.length)pend.push([`${S.reqs.length} consent request${S.reqs.length>1?'s':''} pending`,'Awaiting your approval','wa','Medium']);
    if(S.apps.length)pend.push([`${S.apps.length} application${S.apps.length>1?'s':''} in progress`,'Track status','wa','Medium']);
  }else{
    if(S.queue.length)pend.push([`${S.queue.length} claim${S.queue.length>1?'s':''} in queue`,'Documents to verify','wa','Medium']);
    if(S.regs.length)pend.push([`${S.regs.length} registration${S.regs.length>1?'s':''} pending`,'Awaiting approval','wa','Medium']);
  }
  if(!pend.length)pend.push(['No pending actions','All clear','ok','Low']);
  return pend}

export function MapHome(props){
  const {S,u}=props,{layers:L,sel,mstyle,zoom,lo}=S,G=GEO[S.st]||GEO.Chandigarh,all=S.parcels,P=all.filter(x=>stOf(x)===S.st),TN=S.st==='Tamil Nadu',MP=S.st==='Madhya Pradesh',p=P.find(x=>x.id===sel),zs={transform:`scale(${zoom})`};
  const kp=S.role==='citizen'?
    [['Total parcels',P.length,'var(--f)','▦'],['Verified',P.filter(x=>x.t>=75).length,'#16A34A','✓'],['Needs review',P.filter(x=>x.t>=50&&x.t<75).length,'#E39A1B','!'],['Potential conflicts',P.filter(x=>x.t<50).length,'#DC2626','!'],['My properties',S.mine.length,'#1E72D1','◈']]:
    [['Total parcels',P.length,'var(--f)','▦'],['Verified',P.filter(x=>x.t>=75).length,'#16A34A','✓'],['Needs review',P.filter(x=>x.t>=50&&x.t<75).length,'#E39A1B','!'],['Potential conflicts',P.filter(x=>x.t<50).length,'#DC2626','!'],['Pending claims',S.queue.length,'#5B4FB0','…']];
  const FL=S.role!=='citizen',open=lo===undefined?true:lo,lay=[['Land use',[['zones','Zoning colours']]],['Status',[['status','Status outlines (sale, mortgage, dispute)']]],...(FL?[['Risk flags (officers only)',[['enc','Encroachment suspected'],['stale','Stale record'],['mis','Data mismatch']]]]:[])];
  let tag=null;if(p){const a=p.pts.split(' ').map(q=>q.split(',').map(Number)),cx=(a[0][0]+a[2][0])/2,cy=a[0][1]+8;
    tag=<g pointerEvents="none"><rect x={cx-58} y={cy-4} width="116" height="24" rx="12" fill="var(--f)"/><text x={cx} y={cy+12} textAnchor="middle" fill="#fff" fontSize="11" fontFamily="JetBrains Mono">{p.u}</text></g>}
  const search=e=>{if(e.key==='Enter'){const f=all.find(x=>x.u===e.target.value.trim().toUpperCase());if(!f)return props.toast('No plot with that ULPIN');if(stOf(f)!==S.st){u({st:stOf(f),sel:f.id});props.toast(`Switched to ${GEO[stOf(f)].city}`)}else u({sel:f.id})}};
  return <>
    <Head eb={`Live parcels · ${G.city}`} title="Map" sub="Tap a plot to see its verified facts and Trust Score."><div className="row"><div className="seg" role="group" aria-label="State">{Object.entries(GEO).map(([k,g])=><button key={k} className={S.st===k?'on':''} onClick={()=>S.st!==k&&u({st:k,sel:null})}>{g.city}</button>)}</div><input aria-label="Search ULPIN" placeholder={`Search a ULPIN, e.g. ${G.ex}`} style={{width:'min(340px,100%)'}} onKeyDown={search}/></div></Head>
    <Kpis items={kp}/>
    <div className="dash"><div className="mapcol"><div className={`map m-${mstyle}`}>
      <Map3D parcels={P} center={G.center} sel={sel} mstyle={mstyle} layers={L} flags={FL} onMoveEnd={props.loadBbox} z0={S.st==='Chandigarh'?15:16.2} onSelect={id=>u({sel:id})}/>
      <div className="glass layers"><button className="lb" aria-expanded={open} onClick={()=>u({lo:!open})}>Layers <span>{open?'▴':'▾'}</span></button>
        {open&&lay.map(([g,items])=><div key={g}><div className="mut small" style={{margin:'6px 0 2px',fontWeight:600}}>{g}</div>{items.map(([k,l])=><label key={k}><input type="checkbox" checked={L[k]!==0&&L[k]!==false} onChange={e=>u({layers:{...L,[k]:e.target.checked?1:0}})}/>{l}</label>)}</div>)}</div>
      <div className="glass styles" role="group" aria-label="Map style">{['Map','Satellite','Terrain'].map(m=><button key={m} className={mstyle===m?'on':''} onClick={()=>u({mstyle:m})}>{m}</button>)}</div>
    </div>
    <div className="mut small map-count">Showing {P.length} plots in view{S.truncated?' · Zoom in to see more':''}</div><div className="leg"><span style={{borderColor:'#16A34A'}}>Verified · for sale</span><span style={{borderColor:'#F59E0B'}}>Mortgaged</span><span style={{borderColor:'#DC2626'}}>Disputed</span><span className="z" style={{background:'var(--zr)'}}>Residential</span><span className="z" style={{background:'var(--zc)'}}>Commercial</span>{FL&&<><span><i style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:'#DC2626',marginRight:4}}/>Encroachment suspected</span><span><i style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:'#6B7280',marginRight:4}}/>Stale record</span><span><i style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:'#F59E0B',marginRight:4}}/>Data mismatch</span></>}</div></div>
    <aside className="card panel">{p?<Parcel p={p} {...props}/>:<><h3 className="h22">Land parcel</h3><div className="empty">Click any coloured plot on the map, or type a ULPIN in the search box, to see its record status, Trust Score and actions.</div></>}</aside></div>
    <div className="two">
      <div className="card"><h3 className="h19">Recent activity</h3>{buildActivity(S).map(a=><Li key={a[1]+a[0]}><span>{a[0]}</span><span className="mono mut">{a[1]} · {a[2]}</span></Li>)}</div>
      <div className="card"><h3 className="h19">Pending actions</h3>{buildPending(S,S.role).map(a=><Li key={a[0]}><span><b>{a[0]}</b><br/><span className="mut small">{a[1]}</span></span><Badge k={a[2]}>{a[3]}</Badge></Li>)}</div></div></>;
}

export function Claim({S,u,go}){
  const [st,setSt]=useState(1),[v,setV]=useState(''),[nm,setNm]=useState(S.name||''),[idn,setIdn]=useState(''),[doc,setDoc]=useState(null),[err,setErr]=useState(''),r=S.claim;
  const par=S.parcels.find(x=>x.u.toLowerCase()===v.trim().toLowerCase()),ror=par&&rec(par),conf=par?sim(nm,ownerOf(par)):0;
  const next=async()=>{setErr('');
    if(st===1&&!par&&!isDemoMode()){try{const remote=await fetchParcel(v.trim());if(remote){u({parcels:[...S.parcels,remote]});return setSt(2)} }catch(e){return setErr(e.message)}}
    if(st===1){if(!par)return setErr('No parcel with this ULPIN in the register.');if(S.mine.includes(par.id))return setErr('This plot is already in My properties.');return setSt(2)}
    if(st===2){if(!nm.trim()||!/^\d{4}$/.test(idn))return setErr('Enter your name as on ID and the last 4 digits of your ID.');return setSt(3)}
    if(st===3)return setSt(4)};
  const finish=async()=>{if(!isDemoMode()){try{const out=await claim(par.u);const ok=out.status==='Verified';const res=ok?['ok','Verified',par.n+' is yours','Your claim was verified by the backend and it now appears in My properties.']:['wa',out.status||'Pending','Sent to a land officer',out.message||'An officer will review this claim.'];u(s=>({claim:res,notes:[note(par,'A backend claim was filed by '+nm),...s.notes]}));setSt(1);return}catch(e){return setErr(e.message)}}const res=conf>=90&&doc?['ok','Verified',par.n+' is yours',`Name matches the Record of Rights (${conf}%) and a document was attached. It now appears in My properties.`]
    :conf>=60?['wa','Pending','Sent to a land officer',`Name match is ${conf}% against the Record of Rights${doc?'':' and no document was attached'}. An officer will review within 2 working days.`]
    :['no','Rejected','Does not match the record',`Name match is only ${conf}%. This plot is verified to another owner. If this is wrong, raise a dispute with the land office.`];
    u(s=>({claim:res,mine:res[0]==='ok'?[...s.mine,par.id]:s.mine,notes:[note(par,'A claim was filed on your plot by '+nm+' (match '+conf+'%)'),...s.notes]}));setSt(1)};
  const reset=()=>{setSt(1);setV('');setDoc(null);setErr('');u({claim:null})};
  const steps=['ULPIN','Identity','Name match','Document'];
  return <><Head eb="Prove ownership" title="Claim plot" sub="We check your identity and name against the Record of Rights."/>
    <div className="grid"><div className="card"><div className="row small mut" aria-label={`Step ${st} of 4`}>{steps.map((x,i)=><b key={x} style={{color:i+1===st?'var(--ink)':undefined}}>{i+1}. {x}{i<3?'  >':''} </b>)}</div>
      {st===1&&<><label htmlFor="cu">ULPIN</label><input id="cu" value={v} onChange={e=>setV(e.target.value)} placeholder={GEO[S.st]?GEO[S.st].ex:'CH-0421-8874'}/></>}
      {st===2&&<><label htmlFor="cn">Name as on ID</label><input id="cn" value={nm} onChange={e=>setNm(e.target.value)}/><label htmlFor="ci" className="mt">ID number, last 4 digits</label><input id="ci" inputMode="numeric" maxLength={4} value={idn} onChange={e=>setIdn(e.target.value)}/></>}
      {st===3&&par&&<><p>Record of Rights owner: <b>{ownerOf(par)}</b> (khasra {ror.khasra})</p><p>Your name: <b>{nm}</b></p><Badge k={conf>=90?'ok':conf>=60?'wa':'no'}>Match confidence {conf}%</Badge></>}
      {st===4&&<><label htmlFor="cd">Upload sale deed or mutation order</label><input id="cd" type="file" accept=".pdf,.jpg,.png" onChange={e=>setDoc(e.target.files[0]?.name||null)}/><div className="mut small mt">{doc?'Attached: '+doc:'Without a document, a match goes to an officer instead of auto-verifying.'}</div></>}
      {err&&<div role="alert" className="small" style={{color:'var(--reds)',marginTop:8}}>{err}</div>}
      <div className="mt row">{st>1&&<Btn s onClick={()=>setSt(st-1)}>Back</Btn>}{st<4?<Btn onClick={next}>Continue</Btn>:<Btn onClick={finish}>Submit claim</Btn>}</div></div>
      <div className="card">{r?<><Badge k={r[0]}>{r[1]}</Badge><h3 style={{margin:'12px 0 6px'}}>{r[2]}</h3><p className="mut">{r[3]}</p><div className="row">{r[0]==='ok'&&<Btn s onClick={()=>go('mine')}>View in My properties</Btn>}<Btn s onClick={reset}>New claim</Btn></div></>:<div className="empty">Your claim result appears here.</div>}</div></div></>;
}

export function Mine({S,u,go,toast}){
  const L=S.mine.map(i=>S.parcels.find(x=>x.id===i)).filter(Boolean);
  if(S.liveLoading&&!S.mine.length)return <><Head eb="Verified by record" title="My properties" sub="Loading your verified properties."/><div className="card" role="status">Loading properties…</div></>;
  return <><Head eb="Verified by record" title="My properties" sub="Only verified plots appear here."><Btn v="g" onClick={()=>go('claim')}>Claim another plot</Btn></Head>
    <MyRequests S={S} u={u} toast={toast}/>
    {S.selectedReport&&<ReportView report={S.selectedReport} onClose={()=>u({selectedReport:null})}/>}
    {L.length?<div className="grid">{L.map(x=><div className="card" key={x.id}><div className="row sp"><Badge k="ok">Verified</Badge>{S.sold.includes(x.id)?<Badge>Sold</Badge>:<Badge k={ST[x.s][0]}>{ST[x.s][1]}</Badge>}</div>
      <h3 style={{margin:'12px 0 2px'}}>{x.n}</h3><Ulpin value={x.u}/><span className="mut"> · {x.a}</span>
      <div className="row mt"><Btn s onClick={()=>u({view:'sell',sellId:x.id})}>List for sale</Btn><Btn s v="g" onClick={()=>go('privacy')}>Privacy</Btn></div></div>)}</div>
    :<Empty>No verified plots yet.<div className="mt"><Btn s onClick={()=>go('claim')}>Claim plot</Btn></div></Empty>}</>;
}

export function Privacy({S,u,toast}){
  const me=S.name||'';
  const [selected,setSelected]=useState(S.mine[0]);
  const mineP=S.parcels.find(p=>p.id===selected)||S.parcels.find(p=>S.mine.includes(p.id));
  const [pErr,setPErr]=useState(''),[pBusy,setPBusy]=useState(false),[pTry,setPTry]=useState(0);
  useEffect(()=>{if(isDemoMode()||!mineP)return;let on=true;setPErr('');setPBusy(true);getPrivacy(mineP.u).then(v=>{if(!on)return;const map={hidden:'Hidden',masked:'Masked',consent:'On consent',public:'Public'};const fields={ownerName:'owner',phone:'phone',price:'price',address:'address'};u({vis:Object.fromEntries(Object.entries(v).filter(([k])=>fields[k]).map(([k,x])=>[fields[k],map[x]||x]))})}).catch(e=>on&&setPErr(e.message||'Could not load privacy settings.')).finally(()=>on&&setPBusy(false));return()=>{on=false}},[mineP?.u,pTry]);
  const O=['Hidden','Masked','On consent','Public'];
  const shown=(k,v)=>{if(v==='Public'){if(k==='owner')return me;if(k==='price')return mineP?mineP.pr:'—';return'Shown'}return v==='Masked'?(me[0]+'••••'+me[me.length-1]):v==='Hidden'?'—':'Ask owner'};
  return <><Head eb="You stay in control" title="Privacy" sub="You decide what each person can see. Changes apply instantly."/>
    {S.mine.length>1&&<div className="card" style={{marginBottom:12}}><label htmlFor="privacy-property">Property</label><select id="privacy-property" value={selected||''} onChange={e=>setSelected(e.target.value)}>{S.mine.map(id=>{const p=S.parcels.find(x=>x.id===id);return <option key={id} value={id}>{p?.u||id}</option>})}</select></div>}
    {!mineP&&<Empty>Claim or select a verified property to manage its privacy.</Empty>}{pErr&&<ErrorState msg={pErr} retry={()=>setPTry(x=>x+1)}/>}
    {mineP&&!pErr&&<div className="grid" style={{gridTemplateColumns:'1.3fr 1fr'}}>
      <div className="card" aria-busy={pBusy}>{Object.keys(S.vis).map(k=><div key={k} className="row sp" style={{padding:'12px 0',borderBottom:'1px solid var(--line)'}}><b style={{textTransform:'capitalize'}}>{k}</b>
        <div className="seg" role="group" aria-label={`${k} visibility`}>{O.map(v=><button key={v} disabled={pBusy} className={S.vis[k]===v?'on':''} onClick={async()=>{const prev=S.vis;u({vis:{...S.vis,[k]:v}});try{if(!isDemoMode()&&mineP){const field={owner:'ownerName',phone:'phone',price:'price',address:'address'}[k]||k;await putPrivacy(mineP.u,{[field]:({Hidden:'hidden',Masked:'masked','On consent':'consent',Public:'public'})[v]})} ;toast(`Saved: ${k} is now ${v.toLowerCase()}`)}catch(e){u({vis:prev});toast(e.message)}}}>{v}</button>)}</div></div>)}</div>
      <div className="card"><h3 className="h19">A buyer sees</h3><div style={{margin:'12px 0'}}>{Object.entries(S.vis).map(([k,v])=><div key={k} className="row sp" style={{padding:'6px 0'}}><span className="mut" style={{textTransform:'capitalize'}}>{k}</span><span className="mono">{shown(k,v)}</span></div>)}</div>
        <h3 style={{fontSize:16,marginTop:18}}>Who requested your report</h3><div className="mut small" style={{marginTop:6}}>{(S.reqs||[]).filter(r=>!mineP||(r.ulpin||r.parcel?.ulpin)===mineP.u).map((r,i)=><div key={r._id||r.id||i}>{(r.requester?.name||r.who||'Buyer')} · {r.purpose||'due_diligence'} · {r.status||'PENDING'}</div>)}{!(S.reqs||[]).length&&'No requests yet.'}</div></div></div>}</>;
}

export function Sell({S,u,toast}){
  const x=S.parcels.find(q=>String(q.id)===String(S.sellId));
  const [check,setCheck]=useState(null),[err,setErr]=useState(''),[askPrice,setAskPrice]=useState(x?.pr||''),[vis,setVis]=useState(x?.vis||'Public');
  useEffect(()=>{setAskPrice(x?.pr||'');setVis(x?.vis||'Public');setCheck(null);setErr('')},[x?.u]);
  useEffect(()=>{if(x&&!isDemoMode())eligibility(x.u).then(setCheck).catch(e=>setErr(e.message))},[x?.u]);
  if(!x)return <><Head eb="Verified for sale" title="List for sale" sub="Select a verified property first."/><Empty>Select a property from My properties to list it for sale.</Empty></>;
  const r=rec(x),blocked=S.mort&&!S.cleared,warn=x.z==='R'&&S.ut==='Commercial';
  const circleVal=parseFloat(r.circle.split(' ')[0].replace(/,/g,''));
  const areaNum=parseFloat(x.a);
  const fairPrice=Math.round(circleVal*areaNum/1e5)*1e5;
  const fairStr=fairPrice>=1e7?'₹'+(fairPrice/1e7).toFixed(1)+' Cr':'₹'+(fairPrice/1e5).toFixed(0)+' L';
  const list=async()=>{try{if(check&&!check.eligible)return setErr(check.reason||'This parcel is not eligible for listing');if(!isDemoMode())await createListing({ulpin:x.u,useType:S.ut.toLowerCase(),price:Number(String(askPrice).replace(/[^0-9.]/g,'')),visibility:vis==='Verified buyers only'?'masked':'public'});u(s=>({parcels:s.parcels.map(q=>q.id===x.id?{...q,s:'sale',pr:askPrice,vis}:q),view:'listings',sel:null}));toast('Listed. Your plot is live in Buy.')}catch(e){toast(e.message)}};
  return <><Head eb="Verified for sale" title="List for sale" sub={`${x.n} · ${x.u}`}/>
    <div className="grid"><div className="card"><h3 className="h19">Eligibility</h3>{err&&<ErrorState msg={err} retry={()=>setErr('')}/>}
      {(blocked||(check&&!check.eligible))?<><div className="note r mt"><b>Blocked: active mortgage.</b> Clear the mortgage with your bank, then check again.</div>{S.sandbox&&<div className="mt"><Btn s onClick={()=>{u({cleared:true,mort:false});toast('Mortgage cleared. You can list now.')}}>Simulate mortgage cleared</Btn></div>}</>
      :<><div className="note mt" style={{background:'var(--mint)'}}><b>Eligible.</b> No mortgage or dispute found.</div>{S.sandbox&&<div className="mt"><Btn s v="g" onClick={()=>u({mort:true})}>Simulate active mortgage</Btn></div>}</>}</div>
      <div className="card"><label htmlFor="ut">Use type</label><select id="ut" value={S.ut} onChange={e=>u({ut:e.target.value})}><option>Residential</option><option>Commercial</option></select>
        {warn&&<div className="note mt"><b>Zoning warning.</b> This plot sits in a residential zone. Commercial use needs a change of land use (CLU).</div>}
        <label htmlFor="pr">Asking price</label><input id="pr" value={askPrice} onChange={e=>setAskPrice(e.target.value)}/><div style={{marginTop:8}}><Badge k="ok">Fair price · circle-rate value {fairStr}</Badge></div>
        <label htmlFor="vm">Who can see this listing</label><select id="vm" value={vis} onChange={e=>setVis(e.target.value)}><option>Public</option><option>Verified buyers only</option></select>
        <div style={{marginTop:18}}><Btn disabled={blocked} onClick={list}>List for sale</Btn></div></div></div></>;
}

export function Listings({S,u,toast}){
  const [busy,setBusy]=useState(null),[err,setErr]=useState(''),[elig,setElig]=useState({});
  const L=(S.liveListings?.length?S.liveListings:S.parcels.filter(x=>stOf(x)===S.st&&x.s==='sale')).filter(x=>S.filt==='All'||(S.filt==='Residential')===(x.z==='R'));
  const interest=async x=>{setBusy(x.id);setErr('');try{if(!isDemoMode())await inquiry(x.listingId,'I am interested in this property.');u(s=>({notes:[note(x,'A buyer showed interest in your plot'),...s.notes]}));toast('Interest sent to the owner')}catch(e){setErr(e.message)}finally{setBusy(null)}};
  const register=async x=>{setBusy('r'+x.id);try{if(!isDemoMode())await submitRegistration(x.listingId);u(s=>({notes:[note(x,'Registration submitted for '+x.u),...s.notes]}));toast('Registration submitted')}catch(e){setErr(e.message)}finally{setBusy(null)}};
  return <><Head eb="Buyer view" title="Buy" sub="Verified plots only. Public facts are free; the full report needs the owner's consent."><div className="row">{['All','Residential','Commercial'].map(f=><Chip key={f} on={S.filt===f} onClick={()=>u({filt:f})}>{f}</Chip>)}</div></Head>{err&&<ErrorState msg={err} retry={()=>setErr('')}/>}
    <MyRequests S={S} u={u} toast={toast}/>
    {S.selectedReport&&<ReportView report={S.selectedReport} onClose={()=>u({selectedReport:null})}/>}
    {L.length?<div className="grid">{L.map(x=><div className="card" key={x.id}><div className="row sp"><Badge k="ok">Verified</Badge><span className="mono">{x.z==='R'?'Residential':'Commercial'}</span></div><h3 style={{margin:'10px 0 2px'}}>{x.n}</h3><div className="mut mono">{x.a} · Trust {x.t}</div><div style={{font:'500 26px var(--m)',margin:'10px 0'}}>{x.pr}</div><div className="row"><Btn s disabled={busy===x.id} onClick={()=>interest(x)}>Show interest</Btn>{x.listingId&&<Btn s onClick={()=>register(x)}>Submit registration</Btn>}<Btn s v="g" onClick={async()=>{try{if(!isDemoMode())await requestConsent(x.u,'due_diligence');toast('Report requested. The owner decides, then it appears in My requests.')}catch(e){toast(e.message)}}}>Request full report</Btn></div></div>)}</div>:<Empty>No listings match these filters.</Empty>}</>;
}

export function Consent({S,u,toast}){
  const [busy,setBusy]=useState(null),[err,setErr]=useState('');
  const decide=async(r,status)=>{setBusy(r._id||r.id);try{if(!isDemoMode())await decideConsent(r._id||r.id,status);u(s=>({reqs:s.reqs.filter(x=>(x._id||x.id)!==(r._id||r.id))}));toast(status==='APPROVED'?'Approved. Access ends in 24 hours.':'Rejected')}catch(e){setErr(e.message)}finally{setBusy(null)}};
  return <><Head eb="24-hour access" title="Consent inbox" sub="Approve or reject who can see your full details. Access lasts 24 hours."/>{err&&<ErrorState msg={err} retry={()=>setErr('')}/>}
    {S.reqs.length?<div className="card">{S.reqs.map((r,i)=><div key={r._id||r.id||i} className="row sp" style={{padding:'12px 0',borderBottom:'1px solid var(--line)'}}><div><b>{r.requester?.name||r.who||'Buyer'}</b> wants the full report<div className="mut"><Ulpin value={r.ulpin||r.parcel?.ulpin} copy={false}/> · {r.purpose||'due_diligence'} · {r.left||'24h'} left</div></div><div className="row"><Btn s disabled={busy=== (r._id||r.id)} onClick={()=>decide(r,'APPROVED')}>Approve</Btn><Btn s v="g" disabled={busy=== (r._id||r.id)} onClick={()=>decide(r,'REJECTED')}>Reject</Btn></div></div>)}</div>:<Empty>No pending requests.</Empty>}</>;
}

export function Office({S,u,toast}){
  const act=async(q,status)=>{try{if(!isDemoMode())await decideClaim(q.id,status);u(s=>({queue:s.queue.filter(x=>x.id!==q.id)}));toast(status==='Verified'?'Claim verified':'Claim rejected')}catch(e){toast(e.message)}};
  return <><Head eb="Officer desk" title="Claim queue" sub="Review each claim against the record. Final decision is yours."/><div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',marginBottom:16}}><div className="card"><div className="mut">Pending</div><div style={{font:'500 34px var(--d)'}}>{S.queue.length}</div></div></div>{S.queue.length?<Table cols={['Claimant','ULPIN','Check','']} rows={S.queue.map(q=>[q.claimantName||q.c||'Claimant',<Ulpin value={q.ulpin||q.u} copy={false}/>,<><Badge k={q.status==='Pending'?'wa':'ok'}>{q.status||'Pending'}</Badge> <span className="mut small">{q.note||q.m||''}</span></>,<div className="row"><Btn s onClick={()=>act(q,'Verified')}>Verify</Btn><Btn s v="g" onClick={()=>act(q,'Rejected')}>Reject</Btn></div>])}/>:<Empty>Queue is clear.</Empty>}</>;
}
export function Reg({S,u,toast}){
  const ok=async r=>{try{if(!isDemoMode())await decideRegistration(r.id,'APPROVED');u(s=>({regs:s.regs.filter(q=>q.id!==r.id),duty:s.duty+13,sold:[...s.sold,s.parcelId].filter(Boolean)}));toast('Registered. Record of Rights updated, tax office notified.')}catch(e){toast(e.message)}};
  return <><Head eb="Registrar desk" title="Registrar desk" sub="Approve confirmed deals. Approval updates the Record of Rights and notifies the tax office."/><Kpis items={[['Awaiting approval',S.regs.length,'var(--f)','…'],['Risk flags',S.regs.filter(r=>r.k==='High').length,'#DC2626','!'],['Stamp duty this week',`₹${S.duty} L`,'#16A34A','₹']]}/>{S.regs.length?<Table cols={['Deal','ULPIN','Price','Risk','']} rows={S.regs.map(r=>[<><span className="mono">{r.id}</span><br/><span className="mut">{r.b}</span></>,<Ulpin value={r.u} copy={false}/>,<span className="mono">{r.pr}</span>,<Badge k={r.k==='High'?'no':'ok'}>{r.k}</Badge>,<Btn s onClick={()=>ok(r)}>Approve</Btn>])}/>:<Empty>No deals waiting. Approved sales show as Sold in Buy.</Empty>}</>;
}

export function Plan({toast}){
  const [x,setX]=useState(50);
  return <><Head eb="Planner desk" title="Change alerts" sub="Satellite shows suspected changes. An officer confirms every one."/>
    <div className="grid" style={{gridTemplateColumns:'1.6fr 1fr'}}><div className="card"><div className="row sp"><Badge k="no">Possible violation</Badge><span className="mono mut">CH-0533-2210</span></div>
      <h3 className="h22" style={{marginTop:10}}>Plot 88, Sector 33</h3>
      <div className="ba"><Sat seed={21} w={600} h={380} b={3}/><div className="af" style={{clipPath:`inset(0 ${100-x}% 0 0)`}}><Sat seed={21} w={600} h={380} b={1}/></div><span className="tg l">Before · 1 floor</span><span className="tg r">After · 3 floors</span></div>
      <input type="range" min="0" max="100" value={x} aria-label="Compare before and after" onChange={e=>setX(+e.target.value)}/></div>
      <div className="card"><h3 className="h19">Why it was flagged</h3>{[['Permit','1 floor allowed'],['Detected','3 floors (estimated)'],['Confidence','87%'],['New construction','Yes'],['Permit on file','Ground floor only']].map(([a,b])=><Li key={a}><span className="mut">{a}</span><span className="mono">{b}</span></Li>)}
        <div className="mt"><Btn onClick={()=>toast('Sent to officer for site verification')}>Send for verification</Btn></div></div></div></>;
}

export const SCREENS={
  profile:Profile,cases:Cases,dupes:Dupes,quality:Quality,family:Family,pay:Pay,remind:Remind,
  fraud:Fraud,conflicts:Conflicts,notes:Notes,buycheck:BuyCheck,services:Services,apps:Applications,
  map:MapHome,claim:Claim,mine:Mine,privacy:Privacy,sell:Sell,listings:Listings,consent:Consent,
  office:Office,reg:Reg,plan:Plan,
  adm:Adm,users:Users,states:States,audit:Audit,
  rbac:RBAC,pii:PII,threats:Threats,import:Import,
  chat:ChatPage
};
