import {useAsync,Loading,ErrorState,Empty} from './ui.jsx';
import {fetchAuditLog} from './api.js';
import {Ulpin} from './ulpin.jsx';
import {useState} from 'react';
import {CFG,AUD,RBAC as RBAC_DATA} from './data.js';
import {Badge,Chip,Btn,Head,Kpis,Li,Table} from './ui.jsx';
const ROLES=['Citizen','Officer','Registrar','Planner','Tax Officer','Admin'];
export function Adm({S,go}){
  const H=[['Auth service','ok','Operational'],['Parcels API','ok','Operational'],['Trust Score engine','ok','Operational'],['Change detection','wa','Delayed · 12 min'],['Chatbot retrieval','ok','Operational']];
  const D=[['Consent logged for every full report','ok','On'],['Owner name masked by default','ok','On'],['Access logs kept 12 months','ok','On'],['Data export requests','wa','2 open']];
  const activeUsers=S.users.filter(x=>x.a).length;
  const openFlags=Object.keys(S.fraud).filter(k=>S.fraud[k]==='escalated').length;
  const statesLive=Object.keys(CFG).length;
  return <><Head eb="System admin" title="System overview" sub="Health, access and compliance across all states."/>
    <Kpis items={[['Active users',activeUsers,'var(--f)','◉'],['Pending claims',S.queue.length,'#16A34A','✓'],['Parcels',S.parcels.length,'#16A34A','↑'],['Open risk flags',openFlags||'—','#DC2626','!'],['States live',statesLive,'#5B4FB0','▦']]}/>
    <div className="two"><div className="card"><h3 className="h19">Service health</h3>{H.map(([a,k,b])=><Li key={a}><span>{a}</span><Badge k={k}>{b}</Badge></Li>)}</div>
      <div className="card"><h3 className="h19">DPDP Act 2023 checks</h3>{D.map(([a,k,b])=><Li key={a}><span>{a}</span><Badge k={k}>{b}</Badge></Li>)}<div className="mt"><Btn s v="g" onClick={()=>go('audit')}>Open audit log</Btn></div></div></div></>;
}
export function Users({S,u,toast}){
  const upd=(i,p)=>u(s=>({users:s.users.map((x,j)=>j===i?{...x,...p}:x)}));
  return <><Head eb="Access control" title="Users & roles" sub="Give each person the least access they need."><Btn onClick={()=>toast('Invite link copied')}>Invite user</Btn></Head>
    <Table cols={['Name','Role','Status','']} rows={S.users.map((x,i)=>[<><b>{x.n}</b><br/><span className="mono mut">{x.p}</span></>,
      <select aria-label={`Role for ${x.n}`} style={{width:'auto',padding:'7px 12px'}} value={x.r} onChange={e=>{upd(i,{r:e.target.value});toast(`${x.n} is now ${e.target.value}`)}}>{ROLES.map(r=><option key={r}>{r}</option>)}</select>,
      <Badge k={x.a?'ok':'no'}>{x.a?'Active':'Suspended'}</Badge>,
      <Btn s v="g" onClick={()=>{upd(i,{a:x.a?0:1});toast(x.a?'Suspended':'Reactivated')}}>{x.a?'Suspend':'Reactivate'}</Btn>])}/></>;
}
export function States({S,u,toast,go}){
  const C=CFG[S.st];
  return <><Head eb="One UI, many states" title="State config" sub="Add a state by adding config. The interface and workflows stay the same.">
    <div className="row">{Object.keys(CFG).map(k=><Chip key={k} on={S.st===k} onClick={()=>u({st:k,sel:null})}>{k}</Chip>)}<Chip onClick={()=>go('import')}>Add state</Chip></div></Head>
    <div className="two" style={{marginTop:0}}>
      <div className="card scroll"><h3 className="h19">Field mapping</h3><table><thead><tr><th>Land Stack</th><th>{S.st} field</th><th>Rule</th></tr></thead><tbody>{C.map.map(([a,b,c])=><tr key={a}><td className="mono">{a}</td><td className="mono">{b}</td><td className="mut small">{c}</td></tr>)}</tbody></table></div>
      <div className="card"><h3 className="h19">Preview</h3><div className="mut small mt">Raw record from state</div><div className="code">{C.raw}</div><div className="mut small">Land Stack record</div><div className="code">{C.out}</div></div></div></>;
}
export function Audit({S,u,toast}){
  const [page,setPage]=useState(1),[f,setF]=useState({action:'',role:'',actor:'',ulpin:'',from:'',to:''});
  const set=(k,v)=>{setF(x=>({...x,[k]:v}));setPage(1)};
  const params={page,limit:25,...Object.fromEntries(Object.entries(f).filter(([,v])=>v)),...(f.from?{from:new Date(f.from).toISOString()}:{}),...(f.to?{to:new Date(f.to+'T23:59:59').toISOString()}:{})};
  const q=useAsync(()=>fetchAuditLog(params),[page,f.action,f.role,f.actor,f.ulpin,f.from,f.to]);
  const rows=q.data?.logs||[],total=q.data?.total||0,limit=q.data?.limit||25,pages=Math.max(1,Math.ceil(total/limit));
  const ACTIONS=['PRIVATE_FIELD_READ','PARCEL_FULL_REPORT_VIEWED','CONSENT_REQUESTED','CONSENT_APPROVED','CONSENT_REJECTED','PRIVACY_UPDATED','CLAIM_CREATED','CLAIM_APPROVED','CLAIM_REJECTED','LISTING_CREATED','REGISTRATION_SUBMITTED','REGISTRATION_APPROVED','REGISTRATION_REJECTED','SERVICE_REQUESTED','SERVICE_STEP_ADVANCED','SERVICE_REJECTED','CERTIFICATE_DOWNLOADED','PAYMENT_SIMULATED','ASSISTANT_QUERY'];
  const ROLE_OPTS=['citizen','officer','registrar','planner','auditor','admin'];
  const type=a=>{const x=String(a.action||'').toLowerCase();return x.includes('consent')?'consent':(x.includes('claim')||x.includes('approved'))?'approval':'view'};
  const bad=f.actor&&!/^[0-9a-f]{24}$/i.test(f.actor);
  return <><Head eb="Every access is logged" title="Audit log" sub="Who saw or changed what, and when."><Btn v="g" onClick={()=>toast('Export started')}>Export CSV</Btn></Head>
    <div className="row" style={{marginBottom:14}}>
      <select aria-label="Audit action" value={f.action} onChange={e=>set('action',e.target.value)}><option value="">All actions</option>{ACTIONS.map(a=><option key={a} value={a}>{a}</option>)}</select>
      <select aria-label="Audit role" value={f.role} onChange={e=>set('role',e.target.value)}><option value="">All roles</option>{ROLE_OPTS.map(r=><option key={r} value={r}>{r}</option>)}</select>
      <input aria-label="Filter by actor" placeholder="Actor user id" value={f.actor} onChange={e=>set('actor',e.target.value.trim())}/>
      <input aria-label="Filter by ULPIN" placeholder="ULPIN" value={f.ulpin} onChange={e=>set('ulpin',e.target.value.trim())}/>
      <label className="small mut">From <input type="date" aria-label="From date" value={f.from} onChange={e=>set('from',e.target.value)}/></label>
      <label className="small mut">To <input type="date" aria-label="To date" value={f.to} onChange={e=>set('to',e.target.value)}/></label>
      <Btn s v="g" onClick={()=>{setF({action:'',role:'',actor:'',ulpin:'',from:'',to:''});setPage(1)}}>Clear</Btn>
      <span className="mut small">{total} entries</span></div>
    {bad&&<div className="note r" role="alert" style={{marginBottom:10}}>Actor must be a 24-character user id. The backend rejects anything else.</div>}
    {q.loading?<Loading>Loading audit log...</Loading>:q.err?<ErrorState msg={q.err} retry={q.retry}/>:!rows.length?<Empty>No audit entries for this filter.</Empty>:<><Table cols={['Time','Actor','Role','Action','Resource','ULPIN']} rows={rows.map(a=>[<span className="mono">{new Date(a.createdAt||a.at).toLocaleString()}</span>,a.actorName||a.actor?.name||a.actor||'System',a.role||'—',<><span>{a.action}</span> <Badge k={type(a)==='approval'?'ok':type(a)==='consent'?'wa':'nu'}>{type(a)}</Badge></>,<span className="mono">{a.resourceType||'—'}</span>,a.ulpin?<Ulpin value={a.ulpin} copy={false}/>:'—'])}/><div className="row" style={{justifyContent:'space-between',marginTop:12}}><span className="mut small">Page {page} of {pages}</span><div className="row"><Btn s v="g" disabled={page<=1} onClick={()=>setPage(x=>x-1)}>Previous</Btn><Btn s disabled={page>=pages} onClick={()=>setPage(x=>x+1)}>Next</Btn></div></div></>}</>;
}
export function RBAC({S}){const roles=Object.keys(RBAC_DATA);
  const allViews=[...new Set(roles.flatMap(r=>RBAC_DATA[r]))].sort();
  return <><Head eb="Role-based access control" title="RBAC matrix" sub="Which roles can access which views."/>
    <div className="card scroll"><table className="rbac-table"><thead><tr><th>View</th>{roles.map(r=><th key={r}>{r}</th>)}</tr></thead>
      <tbody>{allViews.map(v=><tr key={v}><td className="mono">{v}</td>{roles.map(r=><td key={r}>{RBAC_DATA[r].includes(v)?<span className="check">✓</span>:<span className="cross">—</span>}</td>)}</tr>)}</tbody></table></div></>;
}
export function deriveThreats(logs){
  const out=[],HOUR=36e5,by=(act)=>{const m=new Map();logs.filter(l=>l.action===act).forEach(l=>{const k=l.actor||l.actorName||'unknown';(m.get(k)||m.set(k,[]).get(k)).push(l)});return m};
  // Rule R1: 5 or more PRIVATE_FIELD_READ by one actor inside any 60-minute window
  by('PRIVATE_FIELD_READ').forEach((ev,actor)=>{const t=ev.map(e=>+new Date(e.createdAt)).sort((a,b)=>a-b);for(let i=0;i<t.length;i++){const n=t.filter(x=>x>=t[i]&&x<t[i]+HOUR).length;if(n>=5){out.push({id:'R1:'+actor,rule:'R1',type:'Many private-field reads',sev:'high',d:`${ev[0].actorName||actor} read private fields ${n} times within one hour.`,at:new Date(t[i]).toLocaleString(),count:n});break}}});
  // Rule R2: 3 or more CONSENT_REJECTED for one actor, or on one ULPIN
  [['actor',l=>l.actor||l.actorName||'unknown'],['ulpin',l=>l.ulpin]].forEach(([kind,key])=>{const m=new Map();logs.filter(l=>l.action==='CONSENT_REJECTED'&&key(l)).forEach(l=>{const k=key(l);(m.get(k)||m.set(k,[]).get(k)).push(l)});m.forEach((ev,k)=>{if(ev.length>=3)out.push({id:'R2:'+kind+':'+k,rule:'R2',type:'Repeated consent rejections',sev:'med',d:kind==='ulpin'?`${ev.length} consent requests on ${k} were rejected.`:`${ev[0].actorName||k} had ${ev.length} consent decisions rejected.`,at:new Date(ev[0].createdAt).toLocaleString(),count:ev.length})})});
  return out}
export function Threats({S}){
  const q=useAsync(()=>fetchAuditLog({page:1,limit:200}),[]);
  const logs=q.data?.logs||[],all=deriveThreats(logs),partial=(q.data?.total||0)>logs.length;
  return <><Head eb="Security monitoring" title="Threat alerts" sub="Rule-based signals derived from the latest audit entries. They are leads to review, not findings."/>
    {q.loading?<Loading>Reading audit entries...</Loading>:q.err?<ErrorState msg={q.err} retry={q.retry}/>:<>
    <div className="row mt" style={{marginBottom:12}}><Badge k={all.length?'no':'ok'}>{all.length} alerts</Badge><span className="mut small">Rules: R1 five or more private-field reads by one actor in an hour. R2 three or more rejected consents for one actor or plot. Based on the newest {logs.length} of {q.data?.total||0} entries{partial?' (older entries not checked)':''}.</span></div>
    {!all.length?<Empty>No rule matched in the loaded entries.</Empty>:all.map(t=><div key={t.id} className="card" style={{marginBottom:12}}><div className="row" style={{justifyContent:'space-between'}}>
      <div><b>{t.type}</b> <Badge>{'Rule '+t.rule}</Badge><p className="mut small">{t.d}</p></div>
      <div className="row"><Badge k={t.sev==='high'?'no':'wa'}>{t.sev}</Badge><span className="mut small mono">{t.at}</span></div></div></div>)}</>}</>;
}
export function PII({S}){
  const me=S.name||'';
  const fields=[['Owner name',me,me[0]+'••••'+me[me.length-1]],['Phone','+91 98765 43210','+91 ••••• •4210'],['Email','owner@example.com','r•••••@example.com'],['Address','House 214, Sector 22','H•••• 214, S•••• 22'],['ID proof','Aadhaar XXXX XXXX 4821','Aadhaar •••• •••• ••21']];
  return <><Head eb="Data protection" title="PII mask preview" sub="How personal data appears to different viewer clearances."/>
    <div className="card"><h3 className="h19">Masking rules</h3>
      <div className="mut small mt">Owner-authorized viewer sees the raw value. Public/buyer sees the masked value.</div>
      {fields.map(([label,raw,masked])=><div key={label} className="mask-row">
        <span className="mut">{label}</span>
        <span className="raw">{raw}</span>
        <span className="masked">{masked}</span>
      </div>)}
      <div className="mt" style={{fontSize:12,color:'var(--soft)'}}>Masking follows DPDP Act 2023 · applied by viewer clearance, not by field name alone.</div>
    </div></>;
}
export function Import({S,u,toast}){
  const [file,setFile]=useState(null),[preview,setPreview]=useState(null),[st,setSt]=useState('Bihar');
  const presets={
    Bihar:{fields:[['ulpin','khesra_number','Prefix BR-PAT'],['owner_name','malik_naam','Transliterate + mask'],['area','rakba_decimal','1 Decimal = 40.47 sq m'],['zoning','bhumi_upyog','Hindi label map']],
      raw:'{ "khesra_number": "142/3",\n  "malik_naam": "रमेश कुमार",\n  "rakba_decimal": 3.5,\n  "bhumi_upyog": "आवासीय" }',
      out:'{ "ulpin": "BR-PAT-142-3",\n  "owner_name": "R••••h K••••r",\n  "area_sqm": 141.6,\n  "zoning": "Residential" }'},
    Karnataka:{fields:[['ulpin','survey_number','Prefix KA-BLR'],['owner_name','owner_name','Mask on display'],['area','area_guntas','1 Gunta = 101.17 sq m'],['zoning','land_use','Kannada label map']],
      raw:'{ "survey_number": "142/3",\n  "owner_name": "Demo Owner",\n  "area_guntas": 8,\n  "land_use": "Residential" }',
      out:'{ "ulpin": "KA-BLR-142-3",\n  "owner_name": "R••••h K••••r",\n  "area_sqm": 809.4,\n  "zoning": "Residential" }'}
  };
  const C=presets[st];
  return <><Head eb="Data onboarding" title="Data import" sub="Upload a state data file, preview normalized records, then confirm."/>
    <div className="card" style={{marginBottom:12}}><label htmlFor="di">State template</label>
      <select id="di" value={st} onChange={e=>setSt(e.target.value)}><option>Bihar</option><option>Karnataka</option></select>
      <label htmlFor="df" className="mt">Upload data file (JSON or CSV)</label>
      <input id="df" type="file" accept=".json,.csv" onChange={e=>{setFile(e.target.files[0]?.name||null);setPreview(true)}}/>
      {file&&<div className="mut small mt">Selected: {file}</div>}
    </div>
    {preview&&<div className="card"><h3 className="h19">Preview normalization for {st}</h3>
      <table><thead><tr><th>Land Stack</th><th>{st} field</th><th>Rule</th></tr></thead><tbody>{C.fields.map(([a,b,c])=><tr key={a}><td className="mono">{a}</td><td className="mono">{b}</td><td className="mut small">{c}</td></tr>)}</tbody></table>
      <div className="mut small mt">Raw record</div><div className="code">{C.raw}</div>
      <div className="mut small">Normalized record</div><div className="code">{C.out}</div>
      <div className="mt"><Btn onClick={()=>{toast(st+' data import started. '+Math.floor(50+Math.random()*100)+' records queued.')}}>Confirm import</Btn><Btn s v="g" onClick={()=>{setFile(null);setPreview(null)}}>Cancel</Btn></div>
    </div>}</>;
}
