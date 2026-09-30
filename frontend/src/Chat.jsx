import {useEffect,useRef} from 'react';
import {Badge,Chip,Btn,Head,vd} from './ui.jsx';
import {SUG} from './data.js';
const Src=({t})=><div className="srcs">{t.map(x=><span key={x}>{x}</span>)}</div>;
export function reply(v,P){
  const m=v.match(/(CH-\d{4}-\d{4}|MP-BPL-\d+-\d+)/i),p=m&&P.find(x=>x.u===m[0].toUpperCase()),q=v.toLowerCase();
  if(p){const [k,l]=vd(p.t);return <><b>{p.u}</b> · {p.n}<div className="row mt8"><Badge k={k}>{l}</Badge><span className="mono">Trust {p.t}/100</span></div>{p.s==='mort'?'An active mortgage is on record.':p.s==='disp'?'A dispute is on record. Transactions are blocked.':'No mortgage or dispute found.'}<Src t={['Record of Rights','GIS boundary','Encumbrance register']}/></>}
  if(q.includes('block')||q.includes('mortgage'))return <>A listing is blocked while a mortgage or dispute is active. Clear it with the bank or land office, then check eligibility again.<Src t={['Listing rules']}/></>;
  if(q.includes('see')||q.includes('privacy'))return <>You set each field to Hidden, Masked, On consent or Public. Buyers see public fields for free. The full report needs your approval and lasts 24 hours.<Src t={['Privacy policy','DPDP Act 2023']}/></>;
  if(q.includes('trust'))return <>Trust Score (0 to 100) combines ownership match, mortgage and dispute flags, boundary agreement and record age. 75 and above is high trust.<Src t={['Trust Score method']}/></>;
  return 'I need a ULPIN or a topic to answer. Try "Is CH-0421-8873 safe to buy?"';
}
function Log({S}){return <>{S.msgs.map((m,i)=><div key={i} className={`mg ${m[0]}`}>{m[0]==='b'&&<i className="av">L</i>}<div className={`cm ${m[0]}`}>{m[1]}</div></div>)}
  {S.typing&&<div className="mg b"><i className="av">L</i><div className="cm b typ" aria-label="Assistant is typing"><s/><s/><s/></div></div>}</>}
export function ChatBody({S,ask,full}){
  const end=useRef(),inp=useRef();
  useEffect(()=>{end.current?.scrollIntoView({block:'end'});if(!S.typing)inp.current?.focus()},[S.msgs.length,S.typing]);
  const send=()=>{const v=inp.current.value.trim();if(v){inp.current.value='';ask(v)}};
  return <>
    <div className={full?'cl':''} id="clog"><Log S={S}/><div ref={end}/></div>
    {full&&<div className="sug">{SUG.map(q=><Chip key={q} onClick={()=>ask(q)}>{q}</Chip>)}</div>}
    <div className={full?'comp':''}><input ref={inp} aria-label="Ask a question" placeholder={full?'Ask about a plot or a rule':'Is CH-0421-8873 safe to buy?'} onKeyDown={e=>e.key==='Enter'&&send()}/>{full&&<Btn onClick={send}>Send</Btn>}</div></>;
}
export function ChatPage({S,u,ask}){return <>
  <Head eb="Answers from records" title="Assistant" sub="Ask about any plot. Answers come from verified records, with sources."><Btn v="g" s onClick={()=>u({msgs:[S.msgs[0]]})}>Clear chat</Btn></Head>
  <div className="card chatbox"><div className="chh"><i className="av">L</i><div><b>Land Stack assistant</b><div className="mut small">Answers from records only · not legal advice</div></div></div><ChatBody S={S} ask={ask} full/></div></>}
export function ChatWidget({S,u,ask}){if(S.view==='chat')return null;return <>
  <button className="chatb glass" aria-label="Ask Land Stack" onClick={()=>u({chatOpen:!S.chatOpen})}>{S.chatOpen?'Close':'Ask'}</button>
  {S.chatOpen&&<div className="chatp glass"><b style={{font:'500 18px var(--d)'}}>Ask about a plot</b><ChatBody S={S} ask={ask}/></div>}</>}