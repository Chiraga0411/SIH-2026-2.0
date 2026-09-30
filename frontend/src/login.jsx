import {useState,useRef} from 'react';
import './login.css';

/* ---------- text (English / Hindi) ---------- */
const TXT={
en:{badge:'National Land Record Authentication & RBAC Engine',hA:'One ULPIN.',hB:'The whole truth',hC:'about a plot.',
 lead:'Verified ownership, privacy you control, and AI that flags fraud before it costs anyone a home.',
 f1:'Verified land records with a live Trust Score',f2:'Your data is shared only with your consent',f3:'AI alerts for fraud, disputes and boundary mismatches',
 s1:'Active users',s2:'States live',s3:'Uptime',welcome:'Welcome to Land Stack',sub:'Choose how you want to sign in.',
 tC:'Citizen',tCd:'Owner, buyer or seller',tD:'Official',tDd:'Revenue, registry, planning, admin',
 login:'Log in with OTP',signup:'Create account',mobile:'Mobile number',otpNote:'We will send a 6-digit code by SMS (simulated in this demo).',
 getOtp:'Send verification code',name:'Full legal name',namePh:'e.g. Ramesh Kumar',email:'Email (optional)',emailPh:'name@example.com',
 district:'District',circle:'Circle / Anchal',mauza:'Mauza / Village (optional)',register:'Create account & send code',
 gov:'GOVERNMENT OFFICIALS ONLY',govInfo:'Official accounts are pre-provisioned in the State Land Registry. Pick your department, then sign in with your Employee ID.',
 emp:'Employee ID / Gov email',pwd:'Password',show:'Show',hide:'Hide',secure:'Sign in securely',
 enterOtp:'Enter the 6-digit code',sentTo:'Code sent to',verify:'Verify & continue',change:'Change number',resend:'Clear & retry',
 badPhone:'Enter a valid 10-digit Indian mobile number.',badName:'Please enter your full legal name.',badOtp:'Incorrect code. Please try again.',
 badCred:'Employee ID or password is incorrect for this department.',demoPwd:'Demo password'},
hi:{badge:'राष्ट्रीय भूमि अभिलेख प्रमाणीकरण एवं RBAC इंजन',hA:'एक ULPIN।',hB:'पूरी सच्चाई',hC:'हर भूखंड की।',
 lead:'सत्यापित स्वामित्व, आपके नियंत्रण में गोपनीयता, और AI जो किसी का घर खोने से पहले धोखाधड़ी पकड़ ले।',
 f1:'सत्यापित भूमि अभिलेख और लाइव Trust Score',f2:'आपका डेटा केवल आपकी सहमति से साझा होता है',f3:'धोखाधड़ी, विवाद और सीमा-अंतर पर AI चेतावनी',
 s1:'सक्रिय उपयोगकर्ता',s2:'राज्य लाइव',s3:'अपटाइम',welcome:'लैंड स्टैक में स्वागत है',sub:'चुनें कि आप कैसे साइन इन करना चाहते हैं।',
 tC:'नागरिक',tCd:'मालिक, खरीदार या विक्रेता',tD:'अधिकारी',tDd:'राजस्व, पंजीकरण, योजना, प्रशासन',
 login:'OTP से लॉगिन',signup:'खाता बनाएँ',mobile:'मोबाइल नंबर',otpNote:'हम SMS से 6 अंकों का कोड भेजेंगे (इस डेमो में सिम्युलेटेड)।',
 getOtp:'सत्यापन कोड भेजें',name:'पूरा कानूनी नाम',namePh:'जैसे रमेश कुमार',email:'ईमेल (वैकल्पिक)',emailPh:'name@example.com',
 district:'जिला',circle:'अंचल',mauza:'मौजा / गाँव (वैकल्पिक)',register:'खाता बनाएँ और कोड भेजें',
 gov:'केवल सरकारी अधिकारी',govInfo:'आधिकारिक खाते राज्य भूमि रजिस्ट्री में पहले से बने होते हैं। अपना विभाग चुनें और कर्मचारी आईडी से साइन इन करें।',
 emp:'कर्मचारी आईडी / सरकारी ईमेल',pwd:'पासवर्ड',show:'दिखाएँ',hide:'छिपाएँ',secure:'सुरक्षित साइन इन',
 enterOtp:'6 अंकों का कोड दर्ज करें',sentTo:'कोड भेजा गया',verify:'सत्यापित करें और आगे बढ़ें',change:'नंबर बदलें',resend:'साफ़ करें और फिर से लिखें',
 badPhone:'कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें।',badName:'कृपया अपना पूरा नाम लिखें।',badOtp:'कोड गलत है। फिर से प्रयास करें।',
 badCred:'इस विभाग के लिए कर्मचारी आईडी या पासवर्ड गलत है।',demoPwd:'डेमो पासवर्ड'}
};

/* ---------- demo department accounts (replace with real auth API later) ---------- */
export const DEMO_OTP='123456',DEMO_PWD='demo123';
const DEPTS=[
 {k:'REV',dn:'Revenue & Land Records',who:'Vikram Singh \u00B7 Circle Officer, Basopatti',id:'REV-001',name:'Vikram Singh',role:'officer',view:'office'},
 {k:'REG',dn:'Registration Department',who:'Sunita Devi \u00B7 Sub-Registrar',id:'REG-001',name:'Sunita Devi',role:'officer',view:'reg'},
 {k:'PLN',dn:'Urban Planning',who:'Meera Singh \u00B7 Planner',id:'PLN-001',name:'Meera Singh',role:'officer',view:'plan'},
 {k:'ADM',dn:'IT & System Administration',who:'Ops Admin',id:'ADM-001',name:'Ops Admin',role:'admin',view:'adm'}
];

/* ---------- small inline icons ---------- */
const S=(p,c)=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{c}</svg>;
const IcBuilding=p=>S(p,<><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M16 9h2a2 2 0 0 1 2 2v10"/><path d="M2 21h20"/><path d="M8 7h4M8 11h4M8 15h4"/></>);
const IcUser=p=>S(p,<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>);
const IcBank=p=>S(p,<><path d="M3 10 12 4l9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 21h18"/></>);
const IcShield=p=>S(p,<><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></>);
const IcGlobe=p=>S(p,<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></>);
const IcLock=p=>S(p,<><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>);
const IcCheck=p=>S(p,<><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></>);
const IcKey=p=>S(p,<><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3"/></>);
const IcSend=p=>S(p,<><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></>);
const Flag=()=><span className="ls-flag" aria-hidden="true"><i/><i/><i/></span>;

export function Login({u,lang:extLang,setLang:extSet}){
  const [localLang,setLocalLang]=useState('en'),lang=extLang||localLang,setLang=extSet||setLocalLang,t=TXT[lang];
  const [tab,setTab]=useState('citizen'),[mode,setMode]=useState('login'),[step,setStep]=useState('form');
  const [phone,setPhone]=useState(''),[fname,setFname]=useState(''),[email,setEmail]=useState('');
  const [district,setDistrict]=useState('Madhubani'),[circle,setCircle]=useState('Basopatti'),[mauza,setMauza]=useState('Mauza Arghawa (33)');
  const [dg,setDg]=useState(['','','','','','']),otp=dg.join(''),boxes=useRef([]),[err,setErr]=useState('');
  const [dk,setDk]=useState('REV'),dept=DEPTS.find(d=>d.k===dk),[emp,setEmp]=useState(dept.id),[pwd,setPwd]=useState(''),[showPw,setShowPw]=useState(false);

  const phoneOk=/^[6-9]\d{9}$/.test(phone);
  const clearOtp=()=>{setDg(['','','','','','']);setErr('')};
  const reset=()=>{setStep('form');clearOtp()};
  const enter=(role,view,name)=>u({role,view,name});

  const sendOtp=()=>{
    if(mode==='signup'&&fname.trim().length<2){setErr(t.badName);return}
    if(!phoneOk){setErr(t.badPhone);return}
    setErr('');setStep('otp');
  };
  const verify=()=>{
    if(otp!==DEMO_OTP){setErr(t.badOtp);return}
    enter('citizen','map',mode==='signup'?fname.trim():'Ramesh Kumar');
  };
  const deptLogin=()=>{
    if(emp.trim().toUpperCase()!==dept.id||pwd!==DEMO_PWD){setErr(t.badCred);return}
    enter(dept.role,dept.view,dept.name);
  };
  const pickDept=k=>{setDk(k);setEmp(DEPTS.find(d=>d.k===k).id);setPwd('');setErr('')};

  const onDigit=(i,e)=>{
    const v=e.target.value.replace(/\D/g,'');setErr('');
    if(!v){setDg(d=>d.map((x,j)=>j===i?'':x));return}
    const next=[...dg];v.slice(0,6-i).split('').forEach((c,k)=>{next[i+k]=c});setDg(next);
    boxes.current[Math.min(i+v.length,5)]?.focus();
  };
  const onDigitKey=(i,e)=>{
    if(e.key==='Backspace'&&!dg[i]&&i>0){setDg(d=>d.map((x,j)=>j===i-1?'':x));boxes.current[i-1]?.focus()}
    if(e.key==='Enter'&&otp.length===6)verify();
  };

  const phoneField=id=>(
    <div className="ls-phone"><span className="ls-cc"><Flag/>+91</span>
      <input id={id} inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="98765 43210" value={phone}
        onChange={e=>{setPhone(e.target.value.replace(/\D/g,''));setErr('')}}
        onKeyDown={e=>e.key==='Enter'&&sendOtp()}/></div>);

  const otpStep=()=>(<>
    <div className="ls-ok">{t.sentTo} +91 {phone.slice(0,2)}XXXXXX{phone.slice(-2)} &nbsp;<b>(demo: {DEMO_OTP})</b></div>
    <label>{t.enterOtp}</label>
    <div className="ls-otpbox">{dg.map((d,i)=>
      <input key={i} ref={el=>boxes.current[i]=el} className={d?'filled':''} inputMode="numeric" autoFocus={i===0}
        aria-label={`Digit ${i+1}`} value={d} onChange={e=>onDigit(i,e)} onKeyDown={e=>onDigitKey(i,e)} onFocus={e=>e.target.select()}/>)}</div>
    {err&&<div className="ls-err" role="alert">{err}</div>}
    <button className="ls-btn saf" disabled={otp.length!==6} onClick={verify}><IcCheck/>{t.verify}</button>
    <div className="ls-links"><button className="ls-link" onClick={reset}>{t.change}</button><button className="ls-link" onClick={clearOtp}>{t.resend}</button></div>
  </>);

  return <div className="ls-page">
    <section className="ls-hero">
      <svg className="ls-grid" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {[[40,60,150,110],[200,60,120,110],[330,60,210,110],[40,190,180,150],[230,190,140,70],[230,270,140,70],[380,190,160,150],[40,360,130,120],[180,360,200,120],[390,360,150,120],[40,500,220,140],[270,500,270,140],[40,660,150,100],[200,660,340,100]]
          .map(([x,y,w,h],i)=><rect key={i} x={x} y={y} width={w} height={h} rx="4" fill={i%4===0?'rgba(220,238,221,.07)':'none'} stroke="rgba(220,238,221,.16)" strokeWidth="1.5"/>)}
        <circle cx="300" cy="420" r="6" fill="#C77C2E"/><circle cx="300" cy="420" r="22" fill="none" stroke="#C77C2E" strokeOpacity=".5"/>
      </svg>
      <div className="ls-brand"><span className="ls-mark"><IcBuilding width="22" height="22"/></span><span>Land<i>Stack</i></span></div>
      <div>
        <span className="ls-eyebrow"><IcShield width="15" height="15"/>{t.badge}</span>
        <h1>{t.hA}<br/><em>{t.hB}</em> {t.hC}</h1>
        <p className="lead">{t.lead}</p>
        <ul className="ls-feats">{[t.f1,t.f2,t.f3].map(f=><li key={f}><IcCheck width="18" height="18"/>{f}</li>)}</ul>
      </div>
      <div className="ls-stats"><div><b>1,284</b>{t.s1}</div><div><b>2</b>{t.s2}</div><div><b>99.9%</b>{t.s3}</div></div>
    </section>

    <section className="ls-panel">
      <div className="ls-top"><button className="ls-lang" onClick={()=>setLang(lang==='en'?'hi':'en')} aria-label="Change language"><IcGlobe width="16" height="16"/>{lang==='en'?'English':'हिन्दी'} <small>{lang==='en'?'EN':'HI'}</small></button></div>
      <div className="ls-wrap">
        <h2>{t.welcome}</h2><p className="ls-sub">{t.sub}</p>

        <div className="ls-roles" role="tablist">
          <button role="tab" aria-selected={tab==='citizen'} className={'ls-role'+(tab==='citizen'?' on':'')} onClick={()=>{setTab('citizen');reset()}}><span className="ic"><IcUser/></span><b>{t.tC}</b><span>{t.tCd}</span></button>
          <button role="tab" aria-selected={tab==='dept'} className={'ls-role'+(tab==='dept'?' on':'')} onClick={()=>{setTab('dept');setErr('')}}><span className="ic"><IcBank/></span><b>{t.tD}</b><span>{t.tDd}</span></button>
        </div>

        <div className="ls-card">
        {tab==='citizen'&&<>
          <div className="ls-utabs">
            <button className={mode==='login'?'on':''} onClick={()=>{setMode('login');reset()}}>{t.login}</button>
            <button className={mode==='signup'?'on':''} onClick={()=>{setMode('signup');reset()}}>{t.signup}</button>
          </div>

          {step==='otp'?otpStep():mode==='login'?<>
            <div className="ls-field"><label htmlFor="ls-ph">{t.mobile}</label>{phoneField('ls-ph')}</div>
            <p className="ls-hint">{t.otpNote}</p>
            {err&&<div className="ls-err" role="alert">{err}</div>}
            <button className="ls-btn" disabled={!phoneOk} onClick={sendOtp}><IcSend/>{t.getOtp}</button>
          </>:<>
            <div className="ls-field"><label htmlFor="ls-n">{t.name} <i>*</i></label><input id="ls-n" className="ls-in" placeholder={t.namePh} value={fname} onChange={e=>{setFname(e.target.value);setErr('')}}/></div>
            <div className="ls-field"><label htmlFor="ls-e">{t.email}</label><input id="ls-e" className="ls-in" type="email" placeholder={t.emailPh} value={email} onChange={e=>setEmail(e.target.value)}/></div>
            <div className="ls-row">
              <div className="ls-field"><label htmlFor="ls-d">{t.district}</label><input id="ls-d" className="ls-in" value={district} onChange={e=>setDistrict(e.target.value)}/></div>
              <div className="ls-field"><label htmlFor="ls-c">{t.circle}</label><input id="ls-c" className="ls-in" value={circle} onChange={e=>setCircle(e.target.value)}/></div>
            </div>
            <div className="ls-field"><label htmlFor="ls-m">{t.mauza}</label><input id="ls-m" className="ls-in" value={mauza} onChange={e=>setMauza(e.target.value)}/></div>
            <div className="ls-field"><label htmlFor="ls-ph2">{t.mobile} <i>*</i></label>{phoneField('ls-ph2')}</div>
            {err&&<div className="ls-err" role="alert">{err}</div>}
            <button className="ls-btn" disabled={!phoneOk||fname.trim().length<2} onClick={sendOtp}><IcSend/>{t.register}</button>
          </>}
        </>}

        {tab==='dept'&&<>
          <span className="ls-gov"><IcLock width="13" height="13"/>{t.gov}</span>
          <p className="ls-info">{t.govInfo}</p>
          <div className="ls-depts" role="radiogroup">{DEPTS.map(d=>
            <button key={d.k} role="radio" aria-checked={dk===d.k} className={'ls-dept'+(dk===d.k?' on':'')} onClick={()=>pickDept(d.k)}>
              <span className="code">{d.k}</span><span><b>{d.dn}</b><span className="s">{d.who}</span></span></button>)}</div>
          <div className="ls-field"><label htmlFor="ls-emp">{t.emp}</label>
            <input id="ls-emp" className="ls-in" value={emp} onChange={e=>{setEmp(e.target.value);setErr('')}} autoComplete="username"/></div>
          <div className="ls-field"><label htmlFor="ls-pw">{t.pwd}</label>
            <div className="ls-pw"><input id="ls-pw" className="ls-in" type={showPw?'text':'password'} value={pwd} onChange={e=>{setPwd(e.target.value);setErr('')}}
              onKeyDown={e=>e.key==='Enter'&&deptLogin()} autoComplete="current-password"/>
              <button type="button" onClick={()=>setShowPw(v=>!v)}>{showPw?t.hide:t.show}</button></div></div>
          {err&&<div className="ls-err" role="alert">{err}</div>}
          <button className="ls-btn" disabled={!emp||!pwd} onClick={deptLogin}><IcKey/>{t.secure}</button>
          <p className="ls-demo">{t.demoPwd}: <code>{DEMO_PWD}</code></p>
        </>}
        </div>
      </div>
    </section>
  </div>;
}
export default Login;