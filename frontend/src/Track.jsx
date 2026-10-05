import {useState} from 'react';
import {trackApplication,isMockMode} from './api.js';
export default function TrackBox(){
  const [ref,setRef]=useState(''),[st,setSt]=useState({});
  const go=async()=>{const r=ref.trim().toUpperCase();if(!r)return;setSt({loading:true});
    try{const d=await trackApplication(r);setSt({d})}catch(e){setSt({err:e.message==='notfound'?'No application found for this reference ID.':'Could not reach the service. Try again.'})}};
  const d=st.d;
  return <div className="ls-track"><b>Track an application</b><span>No login needed. Enter the reference ID from your receipt.</span>
    <div className="ls-trow"><input aria-label="Application reference ID" placeholder="e.g. OWN-482913" value={ref} onChange={e=>setRef(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go()}/><button onClick={go} disabled={st.loading}>{st.loading?'Checking...':'Track'}</button></div>
    {st.err&&<div role="alert" className="ls-terr">{st.err}</div>}
    {d&&<div className="ls-tres"><div><b>{d.id}</b> · {d.dept}</div><ol>{d.steps.map((s,i)=><li key={s} className={i<d.stage?'done':i===d.stage?'now':''}>{s}</li>)}</ol>
      <div>Status: {d.status}{isMockMode()||d.simulated?' · simulated result':''}</div></div>}
  </div>;
}
