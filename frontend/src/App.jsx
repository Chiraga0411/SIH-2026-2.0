import {useState,useEffect,useRef} from 'react';
import {NAV,SECTIONS,VIEW_TO_SECTION,init,GEO,stOf,canAccess,displayName} from './data.js';
import {Login,SCREENS} from './screens.jsx';
import {ChatWidget,reply} from './Chat.jsx';
import {snapshot} from './desk.jsx';
import {initTranslator,applyLang,readLang,saveLang,t} from './i18n.js';
import {AvatarMenu,GlobalSearch} from './AvatarMenu.jsx';
import appLogo from './assets/landstack-logo.png';
import {getToken,clearToken,me,sessionFromUser,fetchParcels,isDemoMode,setSandbox,askAssistant,myProperties,claimsQueue,serviceRequests,listings,registrations,alerts,conflicts,dues,consents} from './api.js';

const FIRST_SUB={}
Object.values(SECTIONS).forEach(sec=>Object.entries(sec).forEach(([k,v])=>{if(v.tabs[0])FIRST_SUB[k]=v.tabs[0][0]}));

const SESSION_KEY='ls-session';
const saveSession=s=>{try{const {parcels,...rest}=s;localStorage.setItem(SESSION_KEY,JSON.stringify({view:rest.view,st:rest.st,lang:rest.lang}))}catch{}};
const loadSession=()=>{try{const r=localStorage.getItem(SESSION_KEY);return r?JSON.parse(r):null}catch{return null}};

function readHash(){const h=window.location.hash.slice(1);return h||''}
function writeHash(v){if(readHash()!==v)window.location.hash=v}

export default function App(){
  const [S,set]=useState(()=>{
    const saved=loadSession();
    const base={...init(),lang:readLang()};
    if(saved){base.st=saved.st||base.st;base.lang=saved.lang||base.lang;base.savedView=saved.view}
    const h=readHash();
    if(h&&SCREENS[h])base.view=h;
    return base;
  }),[msg,setMsg]=useState(''),[loadError,setLoadError]=useState(''),[toastKey,setToastKey]=useState(0),[toastPaused,setToastPaused]=useState(false),[booting,setBooting]=useState(()=>!!getToken()),bboxAbort=useRef(null);
  const u=p=>set(s=>({...s,...(typeof p==='function'?p(s):p)}));
  const toast=m=>{setMsg(m);setToastKey(k=>k+1)};
  useEffect(()=>{if(!msg||toastPaused)return;const t=setTimeout(()=>setMsg(''),8000);return()=>clearTimeout(t)},[msg,toastKey,toastPaused]);
  useEffect(()=>{const h=e=>e.key==='Escape'&&msg&&setMsg('');document.addEventListener('keydown',h);return()=>document.removeEventListener('keydown',h)},[msg]);
  useEffect(()=>{
    if(!getToken())return;
    let live=true;
    me().then(({user})=>{
      if(!live)return;
      const s0=sessionFromUser(user);
      u(s=>({...s0,view:(s.savedView&&canAccess(s0.role,s.savedView)&&SCREENS[s.savedView])?s.savedView:s0.view}));
    }).catch(e=>{if(e.status===401||e.status===403)clearToken()}).finally(()=>{if(live)setBooting(false)});
    return()=>{live=false};
  },[]);
  useEffect(()=>{const h=()=>u({role:null,name:null});window.addEventListener('ls-unauthorized',h);return()=>window.removeEventListener('ls-unauthorized',h)},[]);
  useEffect(()=>{initTranslator()},[]);
  useEffect(()=>{applyLang(S.lang);saveLang(S.lang)},[S.lang]);
  useEffect(()=>{
    if(!S.role)return;
    let cancelled=false;
    u({liveLoading:true}); Promise.allSettled([fetchParcels(null,S.st),S.role==='citizen'?myProperties():Promise.resolve([]),(['officer','admin'].includes(S.user?.role))?claimsQueue():Promise.resolve([]),serviceRequests(),listings(),(['registrar','admin'].includes(S.user?.role))?registrations(false):Promise.resolve([]),(S.user?.role!=='citizen')?alerts():Promise.resolve([]),(S.user?.role!=='citizen')?conflicts():Promise.resolve([]),dues(),consents('requester'),consents('owner')]).then(([parc,mine,claims,apps,ls,regs,al,cf,due,req,owner])=>{if(cancelled)return;const value=x=>x.status==='fulfilled'?(x.value||[]):[];const failed=[parc,mine,claims,apps,ls,regs,al,cf,due,req,owner].some(x=>x.status==='rejected');if(failed)setLoadError('Some live data could not be loaded.');const mineRows=value(mine);u({liveLoading:false,parcels:value(parc).parcels||[],mine:mineRows.map(p=>p.id),queue:value(claims).map(c=>({...c,c:c.claimantName||c.c||'Claimant',u:c.ulpin||c.u,m:c.note||c.status,r:c.status==='Pending'?'low':'high'})),apps:value(apps).requests||value(apps)||[],liveListings:value(ls),liveRegs:value(regs).registrations||value(regs)||[],regs:(value(regs).registrations||value(regs)||[]).map(r=>({...r,id:r._id||r.id,u:r.parcel?.ulpin||r.u,b:r.buyer?.name||r.b||'Buyer',pr:r.salePrice||r.pr,d:r.stampDuty||r.d,k:r.status==='PENDING'?'Low':r.status})),alerts:value(al),conflicts:value(cf),dues:value(due),reqs:value(owner).length?value(owner):value(req),myReqs:value(req)})});
    return()=>{cancelled=true};
  },[S.role]);
  useEffect(()=>{if(S.role)saveSession(S)},[S.role,S.view,S.st,S.lang]);
  useEffect(()=>{if(S.role)writeHash(S.view)},[S.view,S.role]);
  useEffect(()=>{const h=e=>{const v=readHash();if(v&&SCREENS[v]&&v!==S.view)u({view:v})};window.addEventListener('hashchange',h);return()=>window.removeEventListener('hashchange',h)},[S.view]);

  const sbx=()=>{if(S.sandbox){setSandbox(false);u(s=>({...s.snap,sandbox:false,snap:null}));toast('Sandbox closed. Original data restored.')}else{setSandbox(true);u(s=>({...s,sandbox:true,snap:snapshot(s)}));toast('Sandbox on. Changes apply to this local copy and are discarded when you exit.')}};
  const loadBbox=async bbox=>{if(!S.role||!bbox)return;bboxAbort.current?.abort();const c=new AbortController();bboxAbort.current=c;try{const d=await fetchParcels(bbox,S.st,c.signal);u(s=>{const by=new Map(s.parcels.map(p=>[p.u,p]));(d.parcels||[]).forEach(p=>by.set(p.u,p));return {parcels:[...by.values()].slice(0,500),truncated:!!d.truncated}})}catch(e){if(e.name!=='AbortError')u({parcelError:e.message})}};
  const go=v=>{const target=SCREENS[v]?v:(FIRST_SUB[v]||v);u({view:target,sel:null,subView:null})};
  const ask=v=>{
    u(s=>({msgs:[...s.msgs,['u',v]],typing:true}));
    const lang=(S.lang||'en').slice(0,2);
    if(isDemoMode()){setTimeout(()=>u(s=>({msgs:[...s.msgs,['b',reply(v,s.parcels,s.vlang)]],typing:false})),700);return}
    const selected=S.parcels.find(p=>p.id===S.sel);
    askAssistant(v,lang,selected?.u).then(d=>u(s=>({msgs:[...s.msgs,['b',<><span>{d.answer}</span>{d.matched&&d.sources?.length&&<div className="srcs">{d.sources.map(x=><span key={x.label||x.title}>{x.label||x.title||x}</span>)}</div>}</>]],typing:false}))).catch(e=>u(s=>({msgs:[...s.msgs,['b',e.message||'The assistant is temporarily unavailable.']],typing:false})));
  };
  if(booting)return <div role="status" style={{display:'grid',placeItems:'center',minHeight:'100vh'}}>Loading...</div>;
  if(!S.role)return <Login u={u} lang={S.lang} setLang={l=>u({lang:l})}/>;

  const Screen=SCREENS[S.view],p={S,u,go,toast,ask,loadBbox};

  if(!Screen||!canAccess(S.role,S.view)){
    const fallback=S.role==='officer'?'office':S.role==='admin'?'adm':'map';
    if(S.view!==fallback){u({view:fallback})}
    return null;
  }

  const who=S.name||({officer:'Land officer',admin:'System admin'}[S.role]||'User');
  const activeSection=VIEW_TO_SECTION[S.view]||S.view;
  const tr=x=>t(x,S.lang);

  return <div className="app">
    {(isDemoMode()||S.sandbox)&&<div className="demo-banner" aria-label="Demo mode">{isDemoMode()?'Demo mode · data is simulated':'Sandbox mode · changes are discarded on exit'}</div>}
    <nav aria-label="Main">
      <div className="logo"><span className="logo-globe"><img src={appLogo} alt="" /></span>Land<i>Stack</i></div>
      {NAV[S.role].map(([k,l])=>{
        const isActive=activeSection===k||(k===S.view);
        const subTabs=SECTIONS[S.role]&&SECTIONS[S.role][k];
        return <div key={k} className="nav-section">
          <button className={isActive?'on':''} onClick={()=>go(k)}>{tr(l)}</button>
          {isActive&&subTabs&&<div style={{padding:'2px 0 4px 8px'}}>
            {subTabs.tabs.map(([sv,sl])=><button key={sv} className={'chip'+(S.view===sv?' on':'')} style={{fontSize:11.5,padding:'4px 10px',margin:'2px 0',border:'1px solid var(--line)'}} onClick={()=>go(sv)}>{sl}</button>)}
          </div>}
        </div>;
      })}
    </nav>
    <main>
      {S.liveLoading&&<div className="note" role="status">Loading live records…</div>}{loadError&&<div className="note r" role="alert">{loadError} <button className="chip" onClick={()=>window.location.reload()}>Try again</button></div>}
      <div className="topbar">
        <div className="topbar-left">
          <GlobalSearch parcels={S.parcels} onSelect={x=>{const nst=stOf(x);if(nst!==S.st){u({st:nst,sel:x.id})}else u({sel:x.id});toast(`Selected ${x.u}`)}} toast={toast}/>
        </div>
        <AvatarMenu S={S} u={u} toast={toast}/>
      </div>
      {S.sandbox&&<div className="note" role="status" style={{marginBottom:14,background:'var(--safs)'}}><b>Sandbox.</b> You are working on a copy. Nothing here is kept. <button className="chip" onClick={()=>{u(s=>({...s.snap,sandbox:true,snap:s.snap}));toast('Sandbox reset to the local-copy baseline')}}>Reset data</button> <button className="chip" onClick={sbx}>Exit and discard</button></div>}
      <div className="screen-anim" key={S.view+S.st}>
        <Screen {...p}/>
      </div>
    </main>
    <ChatWidget {...p}/>
    {msg&&<div className="toast" role="status" key={toastKey} onMouseEnter={()=>setToastPaused(true)} onMouseLeave={()=>setToastPaused(false)} onFocus={()=>setToastPaused(true)} onBlur={()=>setToastPaused(false)}><span>{msg}</span><button className="chip" aria-label="Close" onClick={()=>setMsg('')}>Close</button></div>}
  </div>;
}
