import {useState,useEffect} from 'react';
import {NAV,init} from './data.js';
import {Login,SCREENS} from './screens.jsx';
import {ChatWidget,reply} from './Chat.jsx';
import {snapshot} from './desk.jsx';
import {initTranslator,applyLang,readLang,saveLang} from './i18n.js';
export default function App(){
  const [S,set]=useState(()=>({...init(),lang:readLang()})),[msg,setMsg]=useState('');
  const u=p=>set(s=>({...s,...(typeof p==='function'?p(s):p)}));
  const toast=m=>setMsg(m);
  useEffect(()=>{if(!msg)return;const t=setTimeout(()=>setMsg(''),2400);return()=>clearTimeout(t)},[msg]);
  useEffect(()=>{initTranslator()},[]);
  useEffect(()=>{applyLang(S.lang);saveLang(S.lang)},[S.lang]);
  const sbx=()=>{u(s=>s.sandbox?{...s.snap,sandbox:false,snap:null}:{sandbox:true,snap:snapshot(s)});toast(S.sandbox?'Sandbox closed. Original data restored.':'Sandbox on. Changes are discarded when you exit.')};
  const go=v=>u({view:v,sel:null});
  const ask=v=>{u(s=>({msgs:[...s.msgs,['u',v]],typing:true}));setTimeout(()=>u(s=>({msgs:[...s.msgs,['b',reply(v,s.parcels,s.vlang)]],typing:false})),700)};
  if(!S.role)return <Login u={u} lang={S.lang} setLang={l=>u({lang:l})}/>;
  const Screen=SCREENS[S.view],p={S,u,go,toast,ask};
  const who=S.name||{officer:'Land officer',admin:'System admin'}[S.role]||'Ramesh Kumar';
  return <div className="app">
    <nav aria-label="Main"><div className="logo">Land<i>Stack</i></div>
      {NAV[S.role].map(([k,l])=><button key={k} className={S.view===k?'on':''} onClick={()=>go(k)}>{l}{k==='consent'&&S.reqs.length>0&&<span className="badge wa" style={{padding:'1px 8px'}}>{S.reqs.length}</span>}</button>)}
      <div className="lang-toggle" role="group" aria-label="Language" data-notr><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg><button className={S.lang==='en'?'on':''} onClick={()=>u({lang:'en'})}>EN</button><button className={S.lang==='hi'?'on':''} onClick={()=>u({lang:'hi'})}>हिन्दी</button></div>
      <button onClick={sbx} aria-pressed={!!S.sandbox}>{S.sandbox?'Exit sandbox':'Sandbox mode'}</button>
      </nav>
    <main><div className="topbar"><button className="tb-name" onClick={()=>go('profile')} aria-label="Open my profile">{who}</button><button className="tb-out" onClick={()=>u({role:null,name:null})}>Log out</button></div>{S.sandbox&&<div className="note" role="status" style={{marginBottom:14,background:'var(--safs)'}}><b>Sandbox.</b> You are working on a copy. Nothing here is kept. <button className="chip" onClick={()=>{u(s=>({...s.snap}));toast('Sandbox reset')}}>Reset data</button> <button className="chip" onClick={sbx}>Exit and discard</button></div>}<Screen {...p}/></main>
    <ChatWidget {...p}/>
    {msg&&<div className="toast" role="status">{msg}</div>}
  </div>;
}