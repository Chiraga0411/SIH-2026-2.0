import {askAssistant} from './api.js';
import {useEffect,useRef,useState} from 'react';
import {Badge,Chip,Btn,Head,vd} from './ui.jsx';
import {SUG} from './data.js';
const Src=({t})=><div className="srcs">{t.map(x=><span key={x}>{x}</span>)}</div>;
const TX={mort:{en:'A listing is blocked while a mortgage or dispute is active. Clear it with the bank or land office, then check eligibility again.',hi:'बंधक या विवाद सक्रिय होने पर लिस्टिंग रुकी रहती है। बैंक या भूमि कार्यालय से इसे साफ़ करवाएँ, फिर दोबारा जाँचें।',ta:'அடமானம் அல்லது வழக்கு நடப்பில் இருந்தால் பட்டியல் தடுக்கப்படும். வங்கி அல்லது நில அலுவலகத்தில் அதை நீக்கிய பின் மீண்டும் சரிபார்க்கவும்.'},
 priv:{en:'You set each field to Hidden, Masked, On consent or Public. Buyers see public fields for free. The full report needs your approval and lasts 24 hours.',hi:'हर जानकारी को छिपा हुआ, मास्क, सहमति पर या सार्वजनिक रखा जा सकता है। पूरी रिपोर्ट के लिए आपकी मंज़ूरी चाहिए और वह 24 घंटे चलती है।',ta:'ஒவ்வொரு தகவலையும் மறைக்கலாம், மாஸ்க் செய்யலாம், ஒப்புதலுடன் அல்லது பொதுவாக வைக்கலாம். முழு அறிக்கைக்கு உங்கள் அனுமதி தேவை; அது 24 மணி நேரம் செல்லும்.'},
 trust:{en:'Trust Score (0 to 100) combines ownership match, mortgage and dispute flags, boundary agreement and record age. 75 and above is high trust.',hi:'भरोसा स्कोर (0 से 100) स्वामित्व मिलान, बंधक और विवाद, सीमा मिलान और रिकॉर्ड की उम्र से बनता है। 75 या अधिक उच्च भरोसा है।',ta:'நம்பிக்கை மதிப்பெண் (0-100) உரிமை பொருத்தம், அடமானம், வழக்கு, எல்லை பொருத்தம், பதிவின் வயது ஆகியவற்றால் உருவாகிறது. 75 அல்லது அதற்கு மேல் அதிக நம்பிக்கை.'},
 none:{en:'I need a ULPIN or a topic to answer. Try "How risky is buying CH-0421-8873?"',hi:'उत्तर देने के लिए मुझे ULPIN या विषय चाहिए। जैसे "CH-0421-8873" पूछें।',ta:'பதிலளிக்க ULPIN அல்லது தலைப்பு தேவை. எ.கா. "CH-0421-8873" எனக் கேளுங்கள்.'}};
export function reply(v,P,lang){
  let m=v.match(/(CH-\d{4}-\d{4}|MP-BPL-\d+-\d+)/i),id=m&&m[0].toUpperCase();
  if(!id){const w=v.match(/\bCH[\s-]*(\d{4})[\s-]*(\d{4})\b/i);if(w)id='CH-'+w[1]+'-'+w[2]}
  const p=id&&P.find(x=>x.u===id),q=v.toLowerCase(),L=(lang||'en-IN').slice(0,2),has=a=>a.some(k=>q.includes(k));
  if(p&&L==='hi')return `${p.u}: भरोसा स्कोर ${p.t}/100। `+(p.s==='mort'?'सक्रिय बंधक दर्ज है।':p.s==='disp'?'विवाद दर्ज है, लेन-देन रुके हैं।':'कोई बंधक या विवाद नहीं मिला।');
  if(p&&L==='ta')return `${p.u}: நம்பிக்கை மதிப்பெண் ${p.t}/100. `+(p.s==='mort'?'செயலில் உள்ள அடமானம் பதிவில் உள்ளது.':p.s==='disp'?'வழக்கு பதிவில் உள்ளது; பரிவர்த்தனைகள் தடுக்கப்பட்டுள்ளன.':'அடமானம் அல்லது வழக்கு எதுவும் இல்லை.');
  if(p){const [k,l]=vd(p.t);return <><b>{p.u}</b> · {p.n}<div className="row mt8"><Badge k={k}>{l}</Badge><span className="mono">Trust {p.t}/100</span></div>{p.s==='mort'?'An active mortgage is on record.':p.s==='disp'?'A dispute is on record. Transactions are blocked.':'No mortgage or dispute found.'}<Src t={['Record of Rights','GIS boundary','Encumbrance register']}/></>}
  if(has(['block','mortgage','बंधक','रोक','அடமான','தடு']))return <>{TX.mort[L]||TX.mort.en}<Src t={['Listing rules']}/></>;
  if(has(['see','privacy','गोपनीय','देख','தனியுரிமை','யார்']))return <>{TX.priv[L]||TX.priv.en}<Src t={['Privacy policy','DPDP Act 2023']}/></>;
  if(has(['trust','भरोसा','स्कोर','நம்பிக்கை','மதிப்பெண்']))return <>{TX.trust[L]||TX.trust.en}<Src t={['Trust Score method']}/></>;
  return (TX.none[L]||TX.none.en);
}
function Log({S}){return <>{S.msgs.map((m,i)=><div key={i} className={`mg ${m[0]}`}>{m[0]==='b'&&<i className="av">L</i>}<div className={`cm ${m[0]}`}>{m[1]}</div></div>)}
  {S.typing&&<div className="mg b"><i className="av">L</i><div className="cm b typ" aria-label="Assistant is typing"><s/><s/><s/></div></div>}</>}
export function ChatBody({S,u,ask,full}){
  const end=useRef(),inp=useRef(),SR=window.SpeechRecognition||window.webkitSpeechRecognition,[on,setOn]=useState(false),[err,setErr]=useState(''),vl=S.vlang||'en-IN';
  const mic=()=>{if(!SR)return setErr('Voice input needs Chrome or Edge.');const r=new SR();r.lang=vl;r.onresult=e=>ask(e.results[0][0].transcript);r.onend=()=>setOn(false);r.onerror=()=>{setOn(false);setErr('Voice input failed. Check microphone permission.')};setErr('');setOn(true);r.start()};
  const say=()=>{const t=[...document.querySelectorAll('.cm.b')].pop()?.textContent;if(!t||!window.speechSynthesis)return setErr('Read-aloud is not supported here.');const s=new SpeechSynthesisUtterance(t);s.lang=vl;speechSynthesis.cancel();speechSynthesis.speak(s)};
  useEffect(()=>{end.current?.scrollIntoView({block:'end'});if(!S.typing)inp.current?.focus()},[S.msgs.length,S.typing]);
  const send=()=>{const v=inp.current.value.trim();if(v){inp.current.value='';ask(v)}};
  return <>
    <div className={full?'cl':''} id="clog"><Log S={S}/><div ref={end}/></div>
    {full&&<div className="sug">{SUG.map(q=><Chip key={q} onClick={()=>ask(q)}>{q}</Chip>)}</div>}
    <div className={full?'comp':''}><input ref={inp} aria-label="Ask a question" placeholder={full?'Ask about a plot or a rule':'How risky is buying CH-0421-8873?'} onKeyDown={e=>e.key==='Enter'&&send()}/>{full&&<Btn onClick={send}>Send</Btn>}</div>
    <div className="row small mt8"><select aria-label="Voice language" value={vl} onChange={e=>u({vlang:e.target.value})}><option value="en-IN">English</option><option value="hi-IN">हिन्दी</option><option value="ta-IN">தமிழ்</option></select><button className="chip" aria-pressed={on} onClick={mic}>{on?'Listening...':'Speak'}</button><button className="chip" onClick={say}>Listen</button></div>{err&&<div role="alert" className="small" style={{color:'var(--reds)'}}>{err}</div>}</>;
}
export function ChatPage({S,u,ask}){return <>
  <Head eb="Answers from records" title="Assistant" sub="Ask about any plot. Answers come from verified records, with sources."><Btn v="g" s onClick={()=>u({msgs:[S.msgs[0]]})}>Clear chat</Btn></Head>
  <div className="card chatbox"><div className="chh"><i className="av">L</i><div><b>Land Stack assistant</b><div className="mut small">Answers from records only · not legal advice</div></div></div><ChatBody S={S} u={u} ask={ask} full/></div></>}
export function ChatWidget({S,u,ask}){if(S.view==='chat')return null;return <>
  <button className="chatb glass" aria-label="Ask Land Stack" onClick={()=>u({chatOpen:!S.chatOpen})}>{S.chatOpen?'Close':'Ask'}</button>
  {S.chatOpen&&<div className="chatp glass"><b style={{font:'500 18px var(--d)'}}>Ask about a plot</b><ChatBody S={S} u={u} ask={ask}/></div>}</>}