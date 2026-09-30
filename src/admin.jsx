import {CFG,AUD} from './data.js';
import {Badge,Chip,Btn,Head,Kpis,Li,Table} from './ui.jsx';
const ROLES=['Citizen','Officer','Registrar','Planner','Admin'];
export function Adm({go}){
  const H=[['Auth service','ok','Operational'],['Parcels API','ok','Operational'],['Trust Score engine','ok','Operational'],['Change detection','wa','Delayed · 12 min'],['Chatbot retrieval','ok','Operational']];
  const D=[['Consent logged for every full report','ok','On'],['Owner name masked by default','ok','On'],['Access logs kept 12 months','ok','On'],['Data export requests','wa','2 open']];
  return <><Head eb="System admin" title="System overview" sub="Health, access and compliance across all states."/>
    <Kpis items={[['Active users','1,284','var(--f)','◉'],['Claims today','46','#16A34A','✓'],['API uptime','99.9%','#16A34A','↑'],['Open risk flags','5','#DC2626','!'],['States live','2','#5B4FB0','▦']]}/>
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
export function States({S,u,toast}){
  const C=CFG[S.st];
  return <><Head eb="One UI, many states" title="State config" sub="Add a state by adding config. The interface and workflows stay the same.">
    <div className="row">{Object.keys(CFG).map(k=><Chip key={k} on={S.st===k} onClick={()=>u({st:k,sel:null})}>{k}</Chip>)}<Chip onClick={()=>toast('Upload a state schema to add a state')}>Add state</Chip></div></Head>
    <div className="two" style={{marginTop:0}}>
      <div className="card scroll"><h3 className="h19">Field mapping</h3><table><thead><tr><th>Land Stack</th><th>{S.st} field</th><th>Rule</th></tr></thead><tbody>{C.map.map(([a,b,c])=><tr key={a}><td className="mono">{a}</td><td className="mono">{b}</td><td className="mut small">{c}</td></tr>)}</tbody></table></div>
      <div className="card"><h3 className="h19">Preview</h3><div className="mut small mt">Raw record from state</div><div className="code">{C.raw}</div><div className="mut small">Land Stack record</div><div className="code">{C.out}</div></div></div></>;
}
export function Audit({S,u,toast}){
  const L=AUD.filter(a=>S.af==='All'||a[4]===S.af);
  return <><Head eb="Every access is logged" title="Audit log" sub="Who saw or changed what, and when."><Btn v="g" onClick={()=>toast('Export started')}>Export CSV</Btn></Head>
    <div className="row" style={{marginBottom:14}}>{[['All','All'],['view','Views'],['consent','Consents'],['approval','Approvals']].map(([k,l])=><Chip key={k} on={S.af===k} onClick={()=>u({af:k})}>{l}</Chip>)}</div>
    <Table cols={['Time','Who','Action','ULPIN']} rows={L.map(a=>[<span className="mono">{a[0]}</span>,a[1],<>{a[2]} <Badge k={a[4]==='approval'?'ok':a[4]==='consent'?'wa':'nu'}>{a[4]}</Badge></>,<span className="mono">{a[3]}</span>])}/></>;
}