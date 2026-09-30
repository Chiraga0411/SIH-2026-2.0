import {useState} from 'react';
import Sat from './Sat.jsx';
import Map3D from './Map3D.jsx';
import {RoleGuard} from './ui.jsx';
import {can} from './auth.js';
import {StatusChart,TrustChart} from './charts.jsx';
import {Services,ServiceQueue} from './services.jsx';
const TOK=import.meta.env.VITE_MAPBOX_TOKEN;
import {P as _P,SC,ST,GEO,stOf,RISK,RC,RL,RISK_ROLES,STALE_YEARS} from './data.js';
import {Badge,Chip,Btn,Head,Empty,Gauge,Table,Kpis,Li,vd} from './ui.jsx';
import {Adm,Users,States,Audit} from './admin.jsx';
import {ChatPage} from './Chat.jsx';

export {Login} from './login.jsx';

const ACT=[['New parcel verified','CH-0421-8874','1 hour ago'],['Sale request submitted','CH-0533-2211','2 hours ago'],['Government overlap detected','CH-0533-2210','3 hours ago'],['Mortgage released','CH-0421-9102','4 hours ago']];
const ACT_MP=[['New parcel verified','MP-BPL-142-4','1 hour ago'],['Sale request submitted','MP-BPL-87-3','2 hours ago'],['Khasra boundary mismatch','MP-BPL-144-1','3 hours ago'],['Mortgage released','MP-BPL-202-1','4 hours ago']];
const PEND_MP=[['2 parcels with a dispute on record','Needs tehsildar review','no','High'],['3 sale requests pending','Awaiting owner consent','wa','Medium'],['1 khasra area mismatch','Bhu-abhilekh area differs from GIS area','no','High'],['2 mutation requests','Documents to verify','wa','Medium']];
const PEND=[['1 parcel with a dispute on record','Needs officer review','no','High'],['2 sale requests pending','Awaiting owner consent','wa','Medium'],['1 boundary mismatch','GIS area differs from registered area','no','High'],['2 claims in the queue','Documents to verify','wa','Medium']];

function Parcel({p,S,u,toast,go}){
  const [k,l]=vd(p.t),tab=S.tab;
  const rec=[['Ownership',p.t>=50?'ok':'no',p.t>=50?'Verified':'Disputed'],['Government land','ok','None'],['Registration','ok','Verified'],['Mortgage',p.s==='mort'?'wa':'ok',p.s==='mort'?'Active':'None'],['GIS boundary','ok','Verified'],['Court case',p.s==='disp'?'no':'ok',p.s==='disp'?'Open':'None']];
  const a=p.pts.split(' ').map(q=>q.split(',').map(Number)),[x0,y0]=a[0],w=a[2][0]-x0,h=a[2][1]-y0;
  const facts=[['Area',p.a],['Land use',p.z==='R'?'Residential':'Commercial'],['Zoning',p.z==='R'?'R1 · Residential':'C1 · Commercial'],['Last verified','28 Sep 2026']];
  const tone=p.t>=75?'var(--mint)':p.t>=50?'var(--safs)':'var(--reds)';
  const T={
    Overview:<>
      <div className="row" style={{alignItems:'flex-start',flexWrap:'nowrap'}}>
        <div className="th"><Sat seed={p.id+10} w={240} h={220}/><svg viewBox={`${x0-14} ${y0-14} ${w+28} ${h+28}`} preserveAspectRatio="xMidYMid slice"><polygon points={p.pts} fill="rgba(255,255,255,.15)" stroke="#5CF0C8" strokeWidth="4"/></svg></div>
        <div className="small" style={{flex:1}}>{facts.map(([a,b])=><div key={a} className="mut" style={{marginBottom:6}}>{a}<br/><b className="mono" style={{color:'var(--ink)'}}>{b}</b></div>)}</div></div>
      <div className="row" style={{margin:'14px 0',flexWrap:'nowrap'}}><Gauge t={p.t}/><div className="note" style={{background:tone,fontSize:12.5}}><b>Trust Score · {p.t>=75?'High trust':p.t>=50?'Check before buying':'Low trust'}</b><br/>{p.t>=75?'All major records verified. No known encumbrances.':p.t>=50?'An active mortgage is on record.':'A dispute is on record. Transactions are blocked.'}</div></div>
      <b style={{font:'500 16px var(--d)'}}>Record status</b>
      <div className="rec" style={{marginTop:10}}>{rec.map(([a,c,b])=><div key={a}><span className="mut">{a}</span><Badge k={c}>{b}</Badge></div>)}</div></>,
    'Land Passport':<><Li>Owner<span className="mono">{p.o}</span></Li><Li>Asking price<span className="mono">{p.s==='sale'?p.pr:'Not listed'}</span></Li><Li>ULPIN layers<span className="mono">Base · Essential · Additional</span></Li></>,
    Timeline:<><Li>Record verified<span className="mono mut">28 Sep 2026</span></Li><Li>Boundary checked<span className="mono mut">14 Aug 2026</span></Li><Li>Registered<span className="mono mut">2019</span></Li></>,
    Documents:<><Li>Record of Rights<Badge k="ok">Verified</Badge></Li><Li>Sale deed<Badge k="ok">Verified</Badge></Li><Li>Full copies need owner consent<Badge>Locked</Badge></Li></>};
  return <>
    <div className="row sp"><h3 className="h22">Land parcel</h3><div className="row"><Badge k={k}>{l}</Badge><Btn v="g" s aria-label="Close panel" onClick={()=>u({sel:null})}>Close</Btn></div></div>
    <div className="mono" style={{marginTop:8,fontSize:15}}><b>{p.u}</b></div><div className="mut small">{p.n} · {GEO[stOf(p)].city}</div>
    <div className="tabs" role="tablist">{Object.keys(T).map(t=><button key={t} role="tab" className={tab===t?'on':''} onClick={()=>u({tab:t})}>{t}</button>)}</div>
    {T[tab]}
    <div className="act"><Btn s onClick={()=>S.role==='citizen'?go('claim'):toast('Officer view')}>Claim plot</Btn><Btn s v="sa" onClick={()=>toast('Open My properties to list a plot you own')}>List for sale</Btn><Btn s v="g" onClick={()=>toast('Report requested. Owner has 24 hours.')}>Request full report</Btn><Btn s v="g" onClick={()=>u({view:'svc',svcU:p.u,sel:null})}>Land services</Btn></div>
    <RoleGuard roles={RISK_ROLES}>{RISK[p.u]&&<div className="note mt" style={{fontSize:12.5,borderLeft:'4px solid '+RC[RISK[p.u]]}}><b>{RL[RISK[p.u]][1]}</b><br/>{RL[RISK[p.u]][2]}{RISK[p.u]==='stale'&&' Limit: '+STALE_YEARS[stOf(p)]+' years.'}</div>}</RoleGuard>
    <div className="note mt" style={{fontSize:12.5}}>Floors data is mock. Satellite flags suspected change only; an officer decides.</div></>;
}

export function MapHome(props){
  const {S,u}=props,{layers:L,sel,mstyle,zoom,lo}=S,G=GEO[S.st]||GEO.Chandigarh,all=S.parcels,P=all.filter(x=>stOf(x)===S.st),MP=S.st==='Madhya Pradesh',p=P.find(x=>x.id===sel),zs={transform:`scale(${zoom})`};
  const kp=[['Total parcels',P.length,'var(--f)','▦'],['Verified',P.filter(x=>x.t>=75).length,'#16A34A','✓'],['Needs review',P.filter(x=>x.t>=50&&x.t<75).length,'#E39A1B','!'],['Potential conflicts',P.filter(x=>x.t<50).length,'#DC2626','!'],['Pending claims',S.queue.length,'#5B4FB0','…']];
  const flags=can(RISK_ROLES),lay=[['zones','Zoning colours'],['status','Status outlines'],['roads','Roads'],['bound','District boundary'],...(flags?[['risk','Risk flags (officer only)']]:[])];
  let tag=null;if(p){const a=p.pts.split(' ').map(q=>q.split(',').map(Number)),cx=(a[0][0]+a[2][0])/2,cy=a[0][1]+8;
    tag=<g pointerEvents="none"><rect x={cx-58} y={cy-4} width="116" height="24" rx="12" fill="var(--f)"/><text x={cx} y={cy+12} textAnchor="middle" fill="#F4EFE2" fontSize="11" fontFamily="JetBrains Mono">{p.u}</text></g>}
  const search=e=>{if(e.key==='Enter'){const f=all.find(x=>x.u===e.target.value.trim().toUpperCase());if(!f)return props.toast('No plot with that ULPIN');if(stOf(f)!==S.st){u({st:stOf(f),sel:f.id});props.toast(`Switched to ${GEO[stOf(f)].city}`)}else u({sel:f.id})}};
  return <>
    <Head eb={`Live parcels · ${G.city}`} title="Map" sub="Tap a plot to see its verified facts and Trust Score."><div className="row"><div className="seg" role="group" aria-label="State">{Object.entries(GEO).map(([k,g])=><button key={k} className={S.st===k?'on':''} onClick={()=>S.st!==k&&u({st:k,sel:null})}>{g.city}</button>)}</div><input aria-label="Search ULPIN" placeholder={`Search a ULPIN, e.g. ${G.ex}`} style={{width:'min(340px,100%)'}} onKeyDown={search}/></div></Head>
    <Kpis items={kp}/>
    <div className="dash"><div className="mapcol"><div className={`map m-${mstyle}`}>
      {TOK&&<Map3D flags={flags} parcels={P} center={G.center} sel={sel} mstyle={mstyle} layers={L} onSelect={id=>u({sel:id})}/>}
      {!TOK&&mstyle!=='Map'&&<div className="stage" style={zs}><Sat seed={3} mode={mstyle}/></div>}
      {!TOK&&<svg viewBox={G.view} preserveAspectRatio="xMidYMid meet" style={zs}>
        {L.bound&&(MP?<rect x="10" y="10" width="600" height="380" fill="none" stroke="var(--faint)" strokeDasharray="6 5" rx="18"/>:<rect x="10" y="10" width="1180" height="990" fill="none" stroke="var(--faint)" strokeDasharray="6 5" rx="18"/>)}
        {L.roads&&MP&&<>{[115,195,275].map(y=><rect key={y} x="0" y={y} width="620" height="4" fill="rgba(140,140,115,.35)"/>)}{[145,255,365,475].map(x=><rect key={x} x={x} y="0" width="4" height="400" fill="rgba(140,140,115,.35)"/>)}</>}
        {L.roads&&!MP&&<><rect x="0" y="158" width="1200" height="14" fill="rgba(140,140,115,.35)"/><rect x="0" y="352" width="1200" height="14" fill="rgba(140,140,115,.35)"/><rect x="0" y="468" width="1200" height="14" fill="rgba(140,140,115,.35)"/><rect x="795" y="495" width="405" height="14" fill="rgba(140,140,115,.35)"/><rect x="0" y="558" width="795" height="14" fill="rgba(140,140,115,.35)"/><rect x="0" y="918" width="1200" height="14" fill="rgba(140,140,115,.35)"/><rect x="204" y="0" width="4" height="352" fill="rgba(140,140,115,.35)"/><rect x="572" y="0" width="4" height="560" fill="rgba(140,140,115,.35)"/><rect x="795" y="0" width="4" height="918" fill="rgba(140,140,115,.35)"/></>}
        {P.map(x=>{const on=sel===x.id;return <polygon key={x.id} className="pl" tabIndex={0} role="button" aria-label={x.n} points={x.pts} fill={L.zones?`var(--z${x.z.toLowerCase()})`:'rgba(255,255,255,.25)'} stroke={on?'var(--f)':L.status?SC[x.s]:'rgba(22,36,27,.3)'} strokeWidth={on?5:3} onClick={()=>u({sel:x.id})} onKeyDown={e=>e.key==='Enter'&&u({sel:x.id})}/>})}
        {flags&&L.risk&&P.filter(x=>RISK[x.u]).map(x=>{const a=x.pts.split(' ').map(q=>q.split(',').map(Number));return <circle key={x.id} cx={(a[0][0]+a[2][0])/2} cy={(a[0][1]+a[2][1])/2} r="9" fill={RC[RISK[x.u]]} stroke="#fff" strokeWidth="2" pointerEvents="none"/>})}
        {tag}</svg>}
      <div className="glass layers"><button className="lb" aria-expanded={lo} onClick={()=>u({lo:!lo})}>Layers <span>{lo?'▴':'▾'}</span></button>
        {lo&&lay.map(([k,l])=><label key={k}><input type="checkbox" checked={!!L[k]} onChange={e=>u({layers:{...L,[k]:e.target.checked?1:0}})}/>{l}</label>)}</div>
      {!TOK&&<div className="zoom"><button className="glass" aria-label="Zoom in" onClick={()=>u({zoom:Math.min(1.6,zoom+.2)})}>+</button><button className="glass" aria-label="Zoom out" onClick={()=>u({zoom:Math.max(1,zoom-.2)})}>−</button></div>}
      <div className="glass styles" role="group" aria-label="Map style">{['Map','Satellite','Terrain'].map(m=><button key={m} className={mstyle===m?'on':''} onClick={()=>u({mstyle:m})}>{m}</button>)}</div>
    </div>
    <div className="leg"><span style={{borderColor:'#16A34A'}}>Verified · for sale</span><span style={{borderColor:'#F59E0B'}}>Mortgaged</span><span style={{borderColor:'#DC2626'}}>Disputed</span><span className="z" style={{background:'var(--zr)'}}>Residential</span><span className="z" style={{background:'var(--zc)'}}>Commercial</span>{flags&&L.risk&&Object.entries(RL).map(([k,v])=><span key={k} style={{borderColor:RC[k]}}>{v[1]}</span>)}</div></div>
    <aside className="card panel">{p?<Parcel p={p} {...props}/>:<><h3 className="h22">Land parcel</h3><div className="empty">Select a plot on the map to see its record status, Trust Score and actions.</div></>}</aside></div>
    <div className="two">
      <div className="card"><h3 className="h19">Recent activity</h3>{(MP?ACT_MP:ACT).map(a=><Li key={a[1]+a[0]}><span>{a[0]}</span><span className="mono mut">{a[1]} · {a[2]}</span></Li>)}</div>
      <div className="card"><h3 className="h19">Pending actions</h3>{(MP?PEND_MP:PEND).map(a=><Li key={a[0]}><span><b>{a[0]}</b><br/><span className="mut small">{a[1]}</span></span><Badge k={a[2]}>{a[3]}</Badge></Li>)}</div></div></>;
}

export function Claim({S,u,go}){
  const [v,setV]=useState(''),r=S.claim;
  const run=()=>{const k=v.trim(),res=k.endsWith('8874')?['ok','Verified','Plot 215 is yours','Ownership matches the Record of Rights. It now appears in My properties.']:k.endsWith('8873')?['no','Rejected','Already owned','This plot is verified to another owner. If this is wrong, raise a dispute with the land office.']:['wa','Pending','Sent to a land officer','We could not auto-match this ULPIN. An officer will review within 2 working days.'];
    u(s=>({claim:res,mine:res[0]==='ok'&&!s.mine.includes(2)?[...s.mine,2]:s.mine}))};
  return <><Head eb="Step 1 · Prove ownership" title="Claim plot" sub="Enter your ULPIN. We check it against the Record of Rights."/>
    <div className="grid"><div className="card"><label htmlFor="cu">ULPIN</label><input id="cu" value={v} onChange={e=>setV(e.target.value)} placeholder={S.st==="Madhya Pradesh"?"MP-BPL-142-4":"CH-0421-8874"}/>
      <div className="mut small mt">Demo: 8874 → Verified · 8873 → Rejected · other → Pending</div><div className="mt"><Btn onClick={run}>Claim plot</Btn></div></div>
      <div className="card">{r?<><Badge k={r[0]}>{r[1]}</Badge><h3 style={{margin:'12px 0 6px'}}>{r[2]}</h3><p className="mut">{r[3]}</p>{r[0]==='ok'&&<Btn s onClick={()=>go('mine')}>View in My properties</Btn>}</>:<div className="empty">Your claim result appears here.</div>}</div></div></>;
}

export function Mine({S,u,go}){
  const L=S.mine.map(i=>S.parcels.find(x=>x.id===i));
  return <><Head eb="Verified by record" title="My properties" sub="Only verified plots appear here."><Btn v="g" onClick={()=>go('claim')}>Claim another plot</Btn></Head>
    {L.length?<div className="grid">{L.map(x=><div className="card" key={x.id}><div className="row sp"><Badge k="ok">Verified</Badge>{S.sold.includes(x.id)?<Badge>Sold</Badge>:<Badge k={ST[x.s][0]}>{ST[x.s][1]}</Badge>}</div>
      <h3 style={{margin:'12px 0 2px'}}>{x.n}</h3><div className="mono mut">{x.u} · {x.a}</div>
      <div className="row mt"><Btn s onClick={()=>u({view:'sell',sellId:x.id})}>List for sale</Btn><Btn s v="g" onClick={()=>go('privacy')}>Privacy</Btn></div></div>)}</div>
    :<Empty>No verified plots yet.<div className="mt"><Btn s onClick={()=>go('claim')}>Claim plot</Btn></div></Empty>}</>;
}

export function Privacy({S,u,toast}){
  const O=['Hidden','Masked','On consent','Public'],shown=(k,v)=>v==='Public'?(k==='owner'?'Ramesh Kumar':k==='price'?'₹1.9 Cr':'Shown'):v==='Masked'?'R••••h K••••r':v==='Hidden'?'—':'Ask owner';
  return <><Head eb="You stay in control" title="Privacy" sub="You decide what each person can see. Changes apply instantly."/>
    <div className="grid" style={{gridTemplateColumns:'1.3fr 1fr'}}>
      <div className="card">{Object.keys(S.vis).map(k=><div key={k} className="row sp" style={{padding:'12px 0',borderBottom:'1px solid var(--line)'}}><b style={{textTransform:'capitalize'}}>{k}</b>
        <div className="seg" role="group" aria-label={`${k} visibility`}>{O.map(v=><button key={v} className={S.vis[k]===v?'on':''} onClick={()=>{u({vis:{...S.vis,[k]:v}});toast(`Saved: ${k} is now ${v.toLowerCase()}`)}}>{v}</button>)}</div></div>)}</div>
      <div className="card"><h3 className="h19">A buyer sees</h3><div style={{margin:'12px 0'}}>{Object.entries(S.vis).map(([k,v])=><div key={k} className="row sp" style={{padding:'6px 0'}}><span className="mut" style={{textTransform:'capitalize'}}>{k}</span><span className="mono">{shown(k,v)}</span></div>)}</div>
        <h3 style={{fontSize:16,marginTop:18}}>Recent views</h3><div className="mut small" style={{marginTop:6}}>Buyer #4821 · 2 hours ago<br/>Registrar office · yesterday</div></div></div></>;
}

export function Sell({S,u,toast}){
  const x=S.parcels.find(q=>q.id===S.sellId),blocked=S.mort&&!S.cleared,warn=x.z==='R'&&S.ut==='Commercial';
  const list=()=>{u(s=>({parcels:s.parcels.map(q=>q.id===x.id?{...q,s:'sale'}:q),view:'listings',sel:null}));toast('Listed. Your plot is live in Buy.')};
  return <><Head eb="Verified for sale" title="List for sale" sub={`${x.n} · ${x.u}`}/>
    <div className="grid"><div className="card"><h3 className="h19">Eligibility</h3>
      {blocked?<><div className="note r mt"><b>Blocked: active mortgage.</b> Clear the mortgage with your bank, then check again.</div><div className="mt"><Btn s onClick={()=>{u({cleared:true,mort:false});toast('Mortgage cleared. You can list now.')}}>Simulate mortgage cleared</Btn></div></>
      :<><div className="note mt" style={{background:'var(--mint)'}}><b>Eligible.</b> No mortgage or dispute found.</div><div className="mt"><Btn s v="g" onClick={()=>u({mort:true})}>Simulate active mortgage</Btn></div></>}</div>
      <div className="card"><label htmlFor="ut">Use type</label><select id="ut" value={S.ut} onChange={e=>u({ut:e.target.value})}><option>Residential</option><option>Commercial</option></select>
        {warn&&<div className="note mt"><b>Zoning warning.</b> This plot sits in a residential zone. Commercial use needs a change of land use (CLU).</div>}
        <label htmlFor="pr">Asking price</label><input id="pr" defaultValue="₹1.9 Cr"/><div style={{marginTop:8}}><Badge k="ok">Fair price · within 6% of area average</Badge></div>
        <label htmlFor="vm">Who can see this listing</label><select id="vm"><option>Public</option><option>Verified buyers only</option></select>
        <div style={{marginTop:18}}><Btn disabled={blocked} onClick={list}>List for sale</Btn></div></div></div></>;
}

export function Listings({S,u,toast}){
  const L=S.parcels.filter(x=>stOf(x)===S.st&&x.s==='sale'&&!S.sold.includes(x.id)&&(S.filt==='All'||(S.filt==='Residential')===(x.z==='R')));
  return <><Head eb="Buyer view" title="Buy" sub="Verified plots only. Public facts are free; the full report needs the owner's consent."><div className="row">{['All','Residential','Commercial'].map(f=><Chip key={f} on={S.filt===f} onClick={()=>u({filt:f})}>{f}</Chip>)}</div></Head>
    {L.length?<div className="grid">{L.map(x=><div className="card" key={x.id}><div className="row sp"><Badge k="ok">Verified</Badge><span className="mono">{x.z==='R'?'Residential':'Commercial'}</span></div>
      <h3 style={{margin:'10px 0 2px'}}>{x.n}</h3><div className="mut mono">{x.a} · Trust {x.t}</div><div style={{font:'500 26px var(--m)',margin:'10px 0'}}>{x.pr}</div>
      <div className="row"><Btn s onClick={()=>toast('Interest sent to the owner')}>Show interest</Btn><Btn s v="g" onClick={()=>{u(s=>({reqs:[...s.reqs,{who:'You',ulpin:x.u,left:'24h'}]}));toast('Report requested. Owner has 24 hours.')}}>Request full report</Btn></div></div>)}</div>
    :<Empty>No listings match these filters.</Empty>}</>;
}

export function Consent({S,u,toast}){
  const drop=(i,m)=>{u(s=>({reqs:s.reqs.filter((_,j)=>j!==i)}));toast(m)};
  return <><Head eb="24-hour access" title="Consent inbox" sub="Approve or reject who can see your full details. Access lasts 24 hours."/>
    {S.reqs.length?<div className="card">{S.reqs.map((r,i)=><div key={i} className="row sp" style={{padding:'12px 0',borderBottom:'1px solid var(--line)'}}><div><b>{r.who}</b> wants the full report<div className="mono mut">{r.ulpin} · {r.left} left to respond</div></div>
      <div className="row"><Btn s onClick={()=>drop(i,'Approved. Access ends in 24 hours.')}>Approve</Btn><Btn s v="g" onClick={()=>drop(i,'Rejected')}>Reject</Btn></div></div>)}</div>:<Empty>No pending requests.</Empty>}</>;
}

export function Office({S,u,toast}){
  const drop=(i,m)=>{u(s=>({queue:s.queue.filter((_,j)=>j!==i)}));toast(m)};
  return <><Head eb="Officer desk" title="Claim queue" sub="Review each claim against the record. Final decision is yours."/>
    <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',marginBottom:16}}><div className="card"><div className="mut">Pending</div><div style={{font:'500 34px var(--d)'}}>{S.queue.length}</div></div><div className="card"><div className="mut">Mismatch alerts</div><div style={{font:'500 34px var(--d)',color:'var(--red)'}}>{S.queue.filter(q=>q.r==='high').length}</div></div></div>
    <div className="two" style={{marginBottom:16}}><StatusChart parcels={S.parcels}/><TrustChart parcels={S.parcels}/></div>
    {S.queue.length?<Table cols={['Claimant','ULPIN','Check','']} rows={S.queue.map((q,i)=>[q.c,<span className="mono">{q.u}</span>,<><Badge k={q.r==='high'?'no':'ok'}>{q.r==='high'?'Mismatch':'Match'}</Badge> <span className="mut small">{q.m}</span></>,<div className="row"><Btn s onClick={()=>drop(i,'Claim verified')}>Verify</Btn><Btn s v="g" onClick={()=>drop(i,'Claim rejected')}>Reject</Btn></div>])}/>:<Empty>Queue is clear.</Empty>}</>;
}

export function Reg({S,u,toast}){
  const ok=r=>{u(s=>({regs:s.regs.filter(q=>q.id!==r.id),duty:s.duty+13,sold:[...s.sold,s.parcels.find(p=>p.u===r.u).id]}));toast('Registered. Record of Rights updated, tax office notified.')};
  return <><Head eb="Registrar desk" title="Registrar desk" sub="Approve confirmed deals. Approval updates the Record of Rights and notifies the tax office."/>
    <Kpis items={[['Awaiting approval',S.regs.length,'var(--f)','…'],['Risk flags',S.regs.filter(r=>r.k==='High').length,'#DC2626','!'],['Stamp duty this week',`₹${S.duty} L`,'#16A34A','₹']]}/>
    {S.regs.length?<Table cols={['Deal','ULPIN','Price','Stamp duty','Risk','']} rows={S.regs.map(r=>[<><span className="mono">{r.id}</span><br/><span className="mut">{r.b}</span></>,<span className="mono">{r.u}</span>,<span className="mono">{r.pr}</span>,<span className="mono">{r.d}</span>,<><Badge k={r.k==='High'?'no':'ok'}>{r.k}</Badge>{r.k==='High'&&<div className="mut small">Price 22% below area average</div>}</>,<Btn s onClick={()=>ok(r)}>Approve</Btn>])}/>:<Empty>No deals waiting. Approved sales show as Sold in Buy.</Empty>}</>;
}

export function Plan({toast}){
  const [x,setX]=useState(50);
  return <><Head eb="Planner desk" title="Change alerts" sub="Satellite shows suspected changes. An officer confirms every one."/>
    <div className="grid" style={{gridTemplateColumns:'1.6fr 1fr'}}><div className="card"><div className="row sp"><Badge k="no">Possible violation</Badge><span className="mono mut">CH-0533-2210</span></div>
      <h3 className="h22" style={{marginTop:10}}>Plot 88, Sector 33</h3>
      <div className="ba"><Sat seed={21} w={600} h={380} b={3}/><div className="af" style={{clipPath:`inset(0 ${100-x}% 0 0)`}}><Sat seed={21} w={600} h={380} b={1}/></div><span className="tg l">Before · 1 floor</span><span className="tg r">After · 3 floors</span></div>
      <input type="range" min="0" max="100" value={x} aria-label="Compare before and after" onChange={e=>setX(+e.target.value)}/></div>
      <div className="card"><h3 className="h19">Why it was flagged</h3>{[['Permit','1 floor allowed'],['Detected','3 floors (estimated)'],['Confidence','87%'],['New construction','Yes'],['Permit on file','Ground floor only']].map(([a,b])=><Li key={a}><span className="mut">{a}</span><span className="mono">{b}</span></Li>)}
        <div className="note mt" style={{fontSize:12.5}}>Floor count is estimated from imagery and mock. The officer decides.</div><div className="mt"><Btn onClick={()=>toast('Sent to officer for site verification')}>Send for verification</Btn></div></div></div></>;
}

export const SCREENS={svc:Services,sreq:ServiceQueue,map:MapHome,claim:Claim,mine:Mine,privacy:Privacy,sell:Sell,listings:Listings,consent:Consent,office:Office,reg:Reg,plan:Plan,adm:Adm,users:Users,states:States,audit:Audit,chat:ChatPage};