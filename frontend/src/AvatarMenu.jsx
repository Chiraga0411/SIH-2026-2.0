import {displayName} from './data.js';
import {useState,useRef,useEffect} from 'react';
import {snapshot} from './desk.jsx';
import {clearToken,searchParcels} from './api.js';

const Ic=p=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}/>);
const IcUser=p=><Ic {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></Ic>;
const IcBell=p=><Ic {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></Ic>;
const IcGlobe=p=><Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></Ic>;
const IcShield=p=><Ic {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></Ic>;
const IcLogout=p=><Ic {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></Ic>;
const IcSearch=p=><Ic {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></Ic>;

export function GlobalSearch({parcels,onSelect,toast}){
  const [q,setQ]=useState(''),[open,setOpen]=useState(false),[results,setResults]=useState([]),[loading,setLoading]=useState(false),ref=useRef();
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[]);
  useEffect(()=>{const value=q.trim();if(value.length<2){setResults([]);return}const t=setTimeout(async()=>{setLoading(true);try{setResults(await searchParcels(value))}catch{setResults([])}finally{setLoading(false)}},300);return()=>clearTimeout(t)},[q]);
  const pick=p=>{onSelect(p);setQ('');setOpen(false)};
  return <div className="global-search" ref={ref}><span className="gs-icon"><IcSearch width="16" height="16"/></span>
    <input aria-label="Global search" placeholder="ULPIN, survey no. or plot name" value={q} onChange={e=>{setQ(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)} onKeyDown={e=>{if(e.key==='Enter'&&results[0])pick(results[0])}}/>
    {open&&q.trim().length>=2&&<div className="gs-results">{loading?<div className="gs-item"><span className="mut small">Searching…</span></div>:results.length?results.slice(0,8).map(p=><div key={p.id} className="gs-item" onClick={()=>pick(p)}><span className="mono" style={{fontWeight:600}}>{p.u}</span><span className="mut small" style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.n}</span><span className="badge nu">{p.matchedBy||'match'}</span></div>):<div className="gs-item"><span className="mut small">No results for “{q}”</span></div>}</div>}
  </div>;
}
export function AvatarMenu({S,u,toast}){
  const [open,setOpen]=useState(false),ref=useRef();
  const who=displayName(S);
  const roleLabel=S.title||{citizen:'Citizen',officer:'Land Officer',admin:'System Admin'}[S.role]||'Citizen';
  const stateLabel=S.st||'Chandigarh';
  useEffect(()=>{
    if(!open)return;
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};
    const k=e=>{if(e.key==='Escape')setOpen(false)};
    document.addEventListener('mousedown',h);
    document.addEventListener('keydown',k);
    return()=>{document.removeEventListener('mousedown',h);document.removeEventListener('keydown',k)}
  },[open]);
  const go=v=>{u({view:v});setOpen(false)};
  const logout=()=>{clearToken();u({role:null,name:null,savedView:null});setOpen(false)};
  return <div className="topbar-right" ref={ref}>
    <button className="avatar-btn" aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" onClick={()=>setOpen(v=>!v)}>
      <span>{(who[0]||'U').toUpperCase()}</span>
    </button>
    {open&&<div className="avatar-menu" role="menu">
      <div className="avatar-menu-hd">
        <b>{who}</b>
        <div className="am-role">{roleLabel}</div>
        <div className="am-state">{stateLabel}</div>
      </div>
      <div className="avatar-menu-list">
        <button role="menuitem" onClick={()=>go('profile')}><span className="am-icon"><IcUser/></span>My profile</button>
        <button role="menuitem" onClick={()=>go('notes')}><span className="am-icon"><IcBell/></span>Notifications{S.notes.length>0&&<span className="badge wa" style={{padding:'1px 8px',marginLeft:'auto'}}>{S.notes.length}</span>}</button>
        {(S.role==='officer'||S.role==='admin')&&
          <button role="menuitem" onClick={()=>{const sbx=()=>u(s=>s.sandbox?{...s.snap,sandbox:false,snap:null}:{sandbox:true,snap:snapshot(s)});toast(S.sandbox?'Sandbox closed. Original data restored.':'Sandbox on. Changes are discarded when you exit.');setOpen(false)}}>
            <span className="am-icon"><IcShield/></span>{S.sandbox?'Exit sandbox':'Sandbox mode'}
          </button>}
      </div>
      <div className="avatar-menu-sep"/>
      <div className="avatar-menu-lang">
        <button className={S.lang==='en'?'on':''} onClick={()=>u({lang:'en'})}>English</button>
        <button className={S.lang==='hi'?'on':''} onClick={()=>u({lang:'hi'})}>हिन्दी</button><button className={S.lang==='ta'?'on':''} onClick={()=>u({lang:'ta'})}>தமிழ்</button>
      </div>
      <div className="avatar-menu-sep"/>
      <div className="avatar-menu-list">
        <button role="menuitem" className="danger" onClick={logout}><span className="am-icon"><IcLogout/></span>Log out</button>
      </div>
    </div>}
  </div>;
}
