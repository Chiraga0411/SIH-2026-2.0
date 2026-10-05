import {useState as _us,useEffect as _ue} from 'react';
export const vd=t=>t>=75?['ok','Verified']:t>=50?['wa','Needs review']:['no','Conflict'];
export const Badge=({k='nu',children})=><span className={`badge ${k}`}>{children}</span>;
export const Chip=({on,...p})=><button className={'chip'+(on?' on':'')} {...p}/>;
export const Btn=({v,s,...p})=><button className={`btn${s?' s':''}${v?' '+v:''}`} {...p}/>;
export const Head=({eb,title,sub,children})=>(<div className="top"><div><div className="eb">{eb}</div><h1>{title}</h1><p>{sub}</p></div>{children}</div>);
export const Empty=({children})=><div className="card empty">{children}</div>;
export function Gauge({t}){const c=t>=75?'#16A34A':t>=50?'#F59E0B':'#DC2626',r=42,L=2*Math.PI*r;
 return(<div className="gauge" role="img" aria-label={`Trust score ${t} of 100`}><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg2)" strokeWidth="9"/><circle cx="50" cy="50" r={r} fill="none" stroke={c} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${L*t/100} ${L}`} transform="rotate(-90 50 50)"/></svg><b>{t}</b></div>)}
export const Table=({cols,rows})=>(<div className="card scroll"><table><thead><tr>{cols.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table></div>);
export const Kpis=({items})=>(<div className="kpis">{items.map(([l,n,c,i])=><div key={l} className="card kpi"><i style={{background:c}}>{i}</i><div><b>{n}</b><br/><span>{l}</span></div></div>)}</div>);
export const Li=({children})=><div className="li">{children}</div>;

export const Loading=({children='Loading...'})=><div className="card empty" role="status" aria-live="polite">{children}</div>;
export const ErrorState=({msg,retry})=><div className="card empty" role="alert">{msg||'Something went wrong.'}{retry&&<div className="mt"><button className="btn s" onClick={retry}>Try again</button></div>}</div>;
export function useAsync(fn,deps=[]){const[s,set]=_us({loading:true}),[n,setN]=_ue&&_us(0);
  _ue(()=>{let on=true;set({loading:true});Promise.resolve().then(fn).then(d=>on&&set({data:d}),e=>on&&set({err:e.message||'Request failed'}));return()=>{on=false}},[...deps,n]);
  return {...s,retry:()=>setN(x=>x+1)}}
