import {useState} from 'react';
import {Badge,Btn,Head,Li} from './ui.jsx';
const D={
 citizen:{name:'Ramesh Kumar',role:'Citizen',phone:'+91 98765 43210',email:'ramesh.kumar@example.com',addr:'House 214, Sector 22, Chandigarh',id:'Aadhaar XXXX XXXX 4821'},
 officer:{name:'Anita Verma',role:'Land officer',phone:'+91 90000 11122',email:'anita.verma@landstack.gov.example',addr:'Land Records Office, Sector 17',id:'Employee OFF-1042',desig:'Land Records Officer'},
 admin:{name:'Ops admin',role:'System admin',phone:'+91 95555 66677',email:'ops@landstack.gov.example',addr:'State Data Centre',id:'Employee ADM-0001',desig:'Platform administrator'}};
export function Profile({S,u,toast}){
  const role=S.role,over=S.prof[role]||{},f={...D[role],...over},[ed,setEd]=useState(false),[v,setV]=useState(f),[err,setErr]=useState(''),gov=role!=='citizen';
  const name=role==='citizen'?(S.name||f.name):f.name;
  const st=role==='citizen'?[['Verified properties',S.mine.length],['Applications',S.apps.length],['Payments made',S.pays.length],['Notifications',S.notes.length]]
    :role==='officer'?[['Claims pending',S.queue.length],['Registrations pending',S.regs.length],['Decisions this session',S.decided.length],['Cleanup tasks done',Object.values(S.tasks).filter(Boolean).length]]
    :[['Registered users',S.users.length],['Parcels in register',S.parcels.length],['Active users',S.users.filter(x=>x.a).length],['Open fraud alerts',Object.keys(S.fraud).length]];
  const save=()=>{if(!/^\+?[\d\s-]{10,15}$/.test(v.phone))return setErr('Enter a valid phone number.');if(!/^\S+@\S+\.\S+$/.test(v.email))return setErr('Enter a valid email address.');
    setErr('');u(s=>({prof:{...s.prof,[role]:{phone:v.phone,email:v.email,addr:v.addr}}}));setEd(false);toast('Profile updated')};
  const F=[['Phone','phone'],['Email','email'],[gov?'Office':'Address','addr']];
  return <><Head eb={gov?'Government official':'Citizen'} title="My profile" sub={gov?'Your role, jurisdiction and account details.':'Your identity and contact details.'}>{!ed&&<Btn s onClick={()=>{setV(f);setEd(true)}}>Edit contact details</Btn>}</Head>
    <div className="grid"><div className="card"><div className="row" style={{flexWrap:'nowrap'}}><i className="av" aria-hidden="true" style={{width:56,height:56,fontSize:22}}>{name[0]}</i><div><b style={{font:'500 20px var(--d)'}}>{name}</b><br/><Badge k="ok">{f.role}</Badge> <Badge k="nu">{S.st}</Badge></div></div>
      <div className="mt"><Li><span className="mut">{gov?'Employee ID':'ID proof'}</span><b className="mono">{f.id}</b></Li>{gov&&<Li><span className="mut">Designation</span><b>{f.desig}</b></Li>}
        {ed?<>{F.map(([l,k])=><div key={k}><label htmlFor={'pf'+k}>{l}</label><input id={'pf'+k} value={v[k]} onChange={e=>setV({...v,[k]:e.target.value})}/></div>)}
          {err&&<div role="alert" className="small" style={{color:'var(--reds)',marginTop:8}}>{err}</div>}<div className="row mt"><Btn onClick={save}>Save</Btn><Btn s v="g" onClick={()=>{setEd(false);setErr('')}}>Cancel</Btn></div></>
          :F.map(([l,k])=><Li key={k}><span className="mut">{l}</span><span>{f[k]}</span></Li>)}</div>
      {!gov&&<div className="mut small mt">Your legal name comes from the Record of Rights and cannot be edited here.</div>}</div>
    <div className="card"><h3 className="h19">{gov?'Your workload':'Your activity'}</h3>{st.map(([l,n])=><Li key={l}><span>{l}</span><b className="mono">{n}</b></Li>)}
      <div className="row mt"><Btn s v="g" onClick={()=>u({role:null,name:null})}>Log out</Btn></div></div></div></>}