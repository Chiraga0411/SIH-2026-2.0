import {claimsQueue,decideClaim,registrations,decideRegistration,conflicts,isDemoMode} from './api.js';
import {useState} from 'react';
import {Badge,Btn,Head,Empty,Li} from './ui.jsx';
import {rec,ownerOf,sim} from './records.js';
import {stOf} from './data.js';
const tm=()=>new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
const UI=['role','name','view','sel','lang','msgs','typing','chatOpen','snap','sandbox','vlang','tab','af','filt','mstyle','zoom','layers','lo'];
export const snapshot=s=>structuredClone(Object.fromEntries(Object.entries(s).filter(([k])=>!UI.includes(k))));
const bb=p=>{const a=p.pts.split(' ').map(q=>q.split(',').map(Number)),x=a.map(q=>q[0]),y=a.map(q=>q[1]);return[Math.min(...x),Math.min(...y),Math.max(...x),Math.max(...y)]};
export function overlaps(P){const o=[],L=P.filter(p=>p.pts);for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){if(stOf(L[i])!==stOf(L[j]))continue;
  const a=bb(L[i]),b=bb(L[j]),w=Math.min(a[2],b[2])-Math.max(a[0],b[0]),h=Math.min(a[3],b[3])-Math.max(a[1],b[1]);
  if(w>0&&h>0){const m=Math.min((a[2]-a[0])*(a[3]-a[1]),(b[2]-b[0])*(b[3]-b[1])),pc=Math.round(100*w*h/m);if(pc>=5)o.push({key:'ov:'+L[i].u+'|'+L[j].u,a:L[i],b:L[j],pc})}}return o}
export function variants(P){const by={};P.forEach(p=>{const k=stOf(p)+'|'+ownerOf(p);(by[k]=by[k]||[]).push(p)});const ks=Object.keys(by),o=[];
  for(let i=0;i<ks.length;i++)for(let j=i+1;j<ks.length;j++){const[sa,na]=ks[i].split('|'),[sb,nb]=ks[j].split('|');if(sa!==sb||na.length<8||nb.length<8)continue;const s=sim(na,nb);
    if(s>=85&&na.toLowerCase()!==nb.toLowerCase())o.push({key:'nv:'+na+'|'+nb,a:na,b:nb,s,pa:by[ks[i]],pb:by[ks[j]]})}return o}
export function Dupes({S,u,toast}){const O=overlaps(S.parcels),V=variants(S.parcels),D=S.dupes,set=(k,v)=>u(s=>({dupes:{...s.dupes,[k]:v}}));
  const inject=k=>u(s=>{const b=s.parcels.find(x=>x.u==='CH-0421-8873')||s.parcels[0],n=s.parcels.length;
    const pts=k==='ov'?b.pts.split(' ').map(q=>{const[x,y]=q.split(',').map(Number);return(x+30)+','+(y+20)}).join(' '):'700,700 760,700 760,760 700,760';
    return{parcels:[...s.parcels,{id:9000+n,u:'CH-0421-TEST-'+n,n:'Test plot (sandbox)',a:'100 sq yd',z:'R',s:'none',t:70,pr:'1 Cr',o:k==='ov'?'Test Owner':'Sandbox test owner',pts}]}});
  const Act=({k})=>D[k]==='none'?<Badge k="nu">Not a duplicate</Badge>:<span className="row">{D[k]==='flag'?<Badge k="wa">Flagged for cleanup</Badge>:<Btn s onClick={()=>set(k,'flag')}>Flag for cleanup</Btn>}<Btn s v="g" onClick={()=>set(k,'none')}>Not a duplicate</Btn></span>;
  return <><Head eb="Data integrity" title="Duplicates and overlaps" sub="Boundary overlaps and owner-name spelling variants across the register."/>
    {S.sandbox&&<div className="card" style={{marginBottom:12}}><b>Sandbox test data</b><div className="row mt"><Btn s onClick={()=>{inject('ov');toast('Overlapping test plot added')}}>Inject overlapping plot</Btn><Btn s onClick={()=>{inject('nv');toast('Spelling-variant test plot added')}}>Inject name variant</Btn></div></div>}
    <div className="card" style={{marginBottom:12}}><h3 className="h19">Boundary overlaps <Badge k={O.length?'no':'ok'}>{O.length}</Badge></h3>
      {O.length?O.map(x=><Li key={x.key}><span><b className="mono">{x.a.u}</b> overlaps <b className="mono">{x.b.u}</b><br/><span className="mut small">{x.pc}% of the smaller plot (bounding-box check on the map geometry)</span></span><Act k={x.key}/></Li>):<p className="mut">No overlaps found.{!S.sandbox&&' Turn on Sandbox mode to inject test data.'}</p>}</div>
    <div className="card"><h3 className="h19">Owner name variants <Badge k={V.length?'wa':'ok'}>{V.length}</Badge></h3>
      {V.length?V.map(x=><Li key={x.key}><span><b>{x.a}</b> vs <b>{x.b}</b> <span className="mut small">({x.s}% similar)</span><br/><span className="mut small mono">{[...x.pa,...x.pb].map(p=>p.u).join(', ')}</span></span><Act k={x.key}/></Li>):<p className="mut">No likely name variants found.</p>}</div></>}
export function quality(S){const P=S.parcels,T=S.tasks,miss=[],add=(k,dept,f,u2)=>miss.push({k,dept,f,u:u2,done:!!T[k]});
  P.forEach(p=>{const r=rec(p);!r.khasra&&add('kh:'+p.u,'Revenue','Khasra number',p.u);!(ownerOf(p)||'').trim()&&add('ow:'+p.u,'Revenue','Owner name',p.u);!r.reg.deed&&add('dd:'+p.u,'Registration','Deed number',p.u);!p.pts&&add('bd:'+p.u,'Survey / GIS','Boundary',p.u)});
  overlaps(P).filter(x=>S.dupes[x.key]==='flag').forEach(x=>add(x.key,'Survey / GIS','Resolve overlap with '+x.b.u,x.a.u));
  variants(P).filter(x=>S.dupes[x.key]==='flag').forEach(x=>add(x.key,'Revenue','Merge name variants '+x.a+' / '+x.b,x.pa[0].u));
  return miss}
export function Quality({S,u}){const P=S.parcels,M=quality(S),n=P.length;
  const F=[['Revenue','Khasra number','Khasra number'],['Revenue','Owner name','Owner name'],['Registration','Deed number','Deed number'],['Survey / GIS','Boundary','Boundary']].map(([d,l,f])=>{const m=M.filter(x=>x.dept===d&&x.f===f),o=m.filter(x=>!x.done).length;return{d,l,o,pc:Math.round(100*(n-o)/n)}});
  const open=M.filter(x=>!x.done).length;
  return <><Head eb="Data quality" title="Data-quality dashboard" sub="Completeness of each department's records, with a cleanup task list."/>
    <div className="card" style={{marginBottom:12}}><div className="row" style={{justifyContent:'space-between'}}><b>{n} parcels checked</b><Badge k={open?'wa':'ok'}>{open} open task{open===1?'':'s'}</Badge></div>
      {F.map(x=><div key={x.d+x.l} style={{margin:'10px 0'}}><div className="row small" style={{justifyContent:'space-between'}}><span>{x.d} · {x.l}</span><b className="mono">{x.pc}% complete · {x.o} missing</b></div><div style={{height:8,background:'var(--bg2)',borderRadius:4}} role="img" aria-label={`${x.d} ${x.l} ${x.pc}% complete`}><div style={{width:x.pc+'%',height:'100%',background:x.pc>=95?'#16A34A':x.pc>=85?'#F59E0B':'#DC2626',borderRadius:4}}/></div></div>)}
      <div className="mut small">Khasra and deed gaps come from the generated demo records. Boundary, owner, overlap and name-variant checks read the live parcel data.</div></div>
    <div className="card"><h3 className="h19">Cleanup tasks</h3>{M.length?M.map(x=><Li key={x.k}><span><label><input type="checkbox" checked={x.done} onChange={()=>u(s=>({tasks:{...s.tasks,[x.k]:!s.tasks[x.k]}}))}/> <b style={{textDecoration:x.done?'line-through':'none'}}>{x.f}</b></label><br/><span className="mut small mono">{x.u}</span></span><Badge k="nu">{x.dept}</Badge></Li>):<Empty>No cleanup needed.</Empty>}</div></>}
const cKey=q=>'claim:'+q.u+':'+q.c;
export function Cases({S,u,toast}){const [tab,setTab]=useState('claims'),[sel,setSel]=useState([]),[open,setOpen]=useState(null),[reason,setReason]=useState(''),[txt,setTxt]=useState(''),[file,setFile]=useState(null),[err,setErr]=useState('');
  const I=tab==='claims'?S.queue.map(q=>({key:cKey(q),id:q.id,t:q.claimantName||q.c||'Claimant',sub:(q.ulpin||q.u)+' · '+(q.note||q.m||''),risk:q.status==='Rejected'||q.r==='high'})):S.regs.map(r=>({key:'reg:'+r.id,id:r.id,t:r.id+' · '+r.u,sub:`${r.b}, ${r.pr}`,risk:r.k==='High'}));
  const tg=k=>setSel(x=>x.includes(k)?x.filter(y=>y!==k):[...x,k]),chosen=I.filter(i=>sel.includes(i.key));
  const decide=async a=>{if(!chosen.length)return setErr('Select at least one case.');if(a==='reject'&&!reason.trim())return setErr('Enter a reason for rejection.');
    const ok=a==='approve'?chosen.filter(c=>!c.risk):chosen,skip=chosen.length-ok.length,ks=ok.map(c=>c.key);setErr('');if(!isDemoMode()){try{for(const c of ok){if(tab==='claims')await decideClaim(c.id,a==='approve'?'Verified':'Rejected',reason);else await decideRegistration(c.id,a==='approve'?'APPROVED':'REJECTED')} }catch(e){return setErr(e.message)}}
    u(s=>{const cn={...s.cn},dec=[...s.decided];ks.forEach(k=>{cn[k]=[...(cn[k]||[]),{by:'Officer',text:(a==='approve'?'Approved':'Rejected: '+reason)+' (bulk)',at:tm()}];dec.unshift({key:k,a,at:tm()})});
      return{cn,decided:dec,queue:s.queue.filter(q=>!ks.includes(cKey(q))),regs:s.regs.filter(r=>!ks.includes('reg:'+r.id))}});
    setSel([]);setReason('');toast(`${ks.length} ${a==='approve'?'approved':'rejected'}${skip?`; ${skip} flagged case${skip>1?'s':''} need individual review`:''}`)};
  const addNote=k=>{if(!txt.trim()&&!file)return;u(s=>({cn:{...s.cn,[k]:[...(s.cn[k]||[]),{by:'Officer',text:txt.trim(),file,at:tm()}]}}));setTxt('');setFile(null)};
  return <><Head eb="Officer desk" title="Case desk" sub="Bulk decisions and internal notes. Notes are never shown to citizens."/>
    <div className="row" style={{marginBottom:12}}>{[['claims','Claims'],['regs','Registrations']].map(([k,l])=><button key={k} className={'chip'+(tab===k?' on':'')} onClick={()=>{setTab(k);setSel([]);setOpen(null)}}>{l} ({k==='claims'?S.queue.length:S.regs.length})</button>)}</div>
    {I.length?<><div className="card" style={{marginBottom:12}}><div className="row"><label><input type="checkbox" checked={sel.length===I.length} onChange={e=>setSel(e.target.checked?I.map(i=>i.key):[])}/> Select all</label>
      <input aria-label="Reason for rejection" placeholder="Reason (required to reject)" value={reason} onChange={e=>setReason(e.target.value)} style={{flex:1,minWidth:160}}/><Btn s onClick={()=>decide('approve')}>Approve selected</Btn><Btn s v="g" onClick={()=>decide('reject')}>Reject selected</Btn></div>
      {err&&<div role="alert" className="small" style={{color:'var(--reds)',marginTop:8}}>{err}</div>}<div className="mut small mt">Cases with a mismatch or high risk are skipped by bulk approve.</div></div>
      {I.map(i=><div key={i.key} className="card" style={{marginBottom:10}}><div className="row" style={{justifyContent:'space-between'}}><label><input type="checkbox" checked={sel.includes(i.key)} onChange={()=>tg(i.key)}/> <b>{i.t}</b><br/><span className="mut small">{i.sub}</span></label>
        <span className="row"><Badge k={i.risk?'no':'ok'}>{i.risk?'High risk':'Low risk'}</Badge><Btn s v="g" onClick={()=>setOpen(open===i.key?null:i.key)}>Notes ({(S.cn[i.key]||[]).length})</Btn></span></div>
        {open===i.key&&<div className="mt"><div className="mut small">Internal notes, not visible to citizens</div>{(S.cn[i.key]||[]).map((n,j)=><Li key={j}><span>{n.text}{n.file&&<><br/><span className="small mono">Attachment: {n.file}</span></>}</span><span className="mut small">{n.by} · {n.at}</span></Li>)}
          <textarea aria-label="Add internal note" placeholder="Add an internal note" value={txt} onChange={e=>setTxt(e.target.value)} style={{width:'100%',marginTop:8}}/><div className="row"><input type="file" aria-label="Attachment" onChange={e=>setFile(e.target.files[0]?.name||null)}/><Btn s onClick={()=>addNote(i.key)}>Add note</Btn></div><div className="mut small">Attachments are recorded by file name only in this demo.</div></div>}</div>)}</>:<Empty>No {tab==='claims'?'claims':'registrations'} pending.</Empty>}
    {S.decided.length>0&&<div className="card mt"><h3 className="h19">Decisions this session</h3>{S.decided.map((d,i)=><Li key={i}><span className="mono small">{d.key}</span><span><Badge k={d.a==='approve'?'ok':'no'}>{d.a==='approve'?'Approved':'Rejected'}</Badge> <span className="mut small">{d.at}</span></span></Li>)}</div>}</>}
