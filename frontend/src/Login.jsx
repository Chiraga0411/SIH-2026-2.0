import Globe from './Globe.jsx';import TrackBox from './Track.jsx';
import {useState,useRef,useEffect} from 'react';
import * as API from './api.js';
import './Login.css';
import appLogo from './assets/landstack-logo.png';

/* ---------- text (English / Hindi) ---------- */
const TXT={
en:{badge:'National Land Record Authentication & RBAC Engine',hA:'One ULPIN.',hB:'The whole truth',hC:'about a plot.',
 lead:'Verified ownership, privacy you control, and AI that flags fraud before it costs anyone a home.',
 f1:'Verified land records with a live Trust Score',f2:'Your data is shared only with your consent',f3:'AI alerts for fraud, disputes and boundary mismatches',
 s1:'Active users',s2:'States live',s3:'Uptime',welcome:'Welcome to Land Stack',sub:'Choose how you want to sign in.',
 tC:'Citizen',tCd:'Owner, buyer or seller',tD:'Official',tDd:'Revenue, registry, planning, admin',
 login:'Log in',signup:'Create account',mobile:'Mobile number',otpNote:'Enter your password, then we will send you a 6-digit verification code.',
 getOtp:'Continue',signin:'Log in',ident:'Mobile number or email',identPh:'98765 43210 or name@example.com',cpw:'Password',newPw:'Create a password',pwHint:'At least 8 characters, with letters and numbers.',badEmail:'Enter a valid email address.',badPw:'Password must be at least 8 characters with letters and numbers.',badLogin:'Enter your mobile number or email, and your password.',netErr:'Cannot reach the server. Check your connection and try again.',wait:'Please wait...',name:'Full legal name',namePh:'e.g. Demo Owner',email:'Email',emailPh:'name@example.com',
 district:'District',circle:'Circle / Anchal',mauza:'Mauza / Village (optional)',register:'Create account & send code',
 gov:'GOVERNMENT OFFICIALS ONLY',govInfo:'Official accounts are pre-provisioned in the State Land Registry. Pick your department, then sign in with your Employee ID and the password issued to you.',
 emp:'Employee ID / Gov email',pwd:'Password',show:'Show',hide:'Hide',secure:'Sign in securely',
 enterOtp:'Enter the 6-digit code',sentTo:'Code sent to',verify:'Verify & continue',change:'Change number',resend:'Resend code',
 badPhone:'Enter a valid 10-digit Indian mobile number.',badName:'Please enter your full legal name.',badOtp:'Incorrect code. Please try again.',
 badCred:'Employee ID or password is incorrect.'},
hi:{badge:'राष्ट्रीय भूमि अभिलेख प्रमाणीकरण एवं RBAC इंजन',hA:'एक ULPIN।',hB:'पूरी सच्चाई',hC:'हर भूखंड की।',
 lead:'सत्यापित स्वामित्व, आपके नियंत्रण में गोपनीयता, और AI जो किसी का घर खोने से पहले धोखाधड़ी पकड़ ले।',
 f1:'सत्यापित भूमि अभिलेख और लाइव Trust Score',f2:'आपका डेटा केवल आपकी सहमति से साझा होता है',f3:'धोखाधड़ी, विवाद और सीमा-अंतर पर AI चेतावनी',
 s1:'सक्रिय उपयोगकर्ता',s2:'राज्य लाइव',s3:'अपटाइम',welcome:'लैंड स्टैक में स्वागत है',sub:'चुनें कि आप कैसे साइन इन करना चाहते हैं।',
 tC:'नागरिक',tCd:'मालिक, खरीदार या विक्रेता',tD:'अधिकारी',tDd:'राजस्व, पंजीकरण, योजना, प्रशासन',
 login:'लॉगिन',signup:'खाता बनाएँ',mobile:'मोबाइल नंबर',otpNote:'अपना पासवर्ड दर्ज करें, फिर हम आपको 6 अंकों का सत्यापन कोड भेजेंगे।',
 getOtp:'आगे बढ़ें',signin:'लॉगिन',ident:'मोबाइल नंबर या ईमेल',identPh:'98765 43210 या name@example.com',cpw:'पासवर्ड',newPw:'पासवर्ड बनाएँ',pwHint:'कम से कम 8 अक्षर, जिनमें अक्षर और अंक दोनों हों।',badEmail:'कृपया सही ईमेल दर्ज करें।',badPw:'पासवर्ड कम से कम 8 अक्षर का हो, जिसमें अक्षर और अंक दोनों हों।',badLogin:'अपना मोबाइल नंबर या ईमेल और पासवर्ड दर्ज करें।',netErr:'सर्वर से संपर्क नहीं हो पा रहा। कनेक्शन जाँचकर फिर प्रयास करें।',wait:'कृपया प्रतीक्षा करें...',name:'पूरा कानूनी नाम',namePh:'जैसे रमेश कुमार',email:'ईमेल',emailPh:'name@example.com',
 district:'जिला',circle:'अंचल',mauza:'मौजा / गाँव (वैकल्पिक)',register:'खाता बनाएँ और कोड भेजें',
 gov:'केवल सरकारी अधिकारी',govInfo:'आधिकारिक खाते राज्य भूमि रजिस्ट्री में पहले से बने होते हैं। अपना विभाग चुनें और कर्मचारी आईडी तथा आपको दिए गए पासवर्ड से साइन इन करें।',
 emp:'कर्मचारी आईडी / सरकारी ईमेल',pwd:'पासवर्ड',show:'दिखाएँ',hide:'छिपाएँ',secure:'सुरक्षित साइन इन',
 enterOtp:'6 अंकों का कोड दर्ज करें',sentTo:'कोड भेजा गया',verify:'सत्यापित करें और आगे बढ़ें',change:'नंबर बदलें',resend:'कोड फिर से भेजें',
 badPhone:'कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें।',badName:'कृपया अपना पूरा नाम लिखें।',badOtp:'कोड गलत है। फिर से प्रयास करें।',
 badCred:'कर्मचारी आईडी या पासवर्ड गलत है।'}
};

/* ---------- department list shown on the Official tab (authentication happens on the server) ---------- */
const DEPTS=[
 {k:'REV',dn:'Revenue & Land Records',who:'Vikram Singh \u00B7 Circle Officer, Basopatti',id:'REV-001',name:'Vikram Singh',role:'officer',view:'office'},
 {k:'REG',dn:'Registration Department',who:'Sunita Devi \u00B7 Sub-Registrar',id:'REG-001',name:'Sunita Devi',role:'officer',view:'reg'},
 {k:'PLN',dn:'Urban Planning',who:'Meera Singh \u00B7 Town Planner',id:'PLN-001',name:'Meera Singh',role:'officer',view:'plan'},
 {k:'TAX',dn:'Revenue / Tax Officer',who:'Karthik Raja \u00B7 Tax Officer',id:'TAX-001',name:'Karthik Raja',role:'officer',view:'office'},
 {k:'AUD',dn:'C&AG Audit',who:'Lakshmi Devi \u00B7 Auditor',id:'AUD-001',name:'Lakshmi Devi',role:'admin',view:'audit'},
 {k:'ADM',dn:'IT & System Administration',who:'Ops Admin \u00B7 Super Admin',id:'ADM-001',name:'Ops Admin',role:'admin',view:'adm'}
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
  const [ident,setIdent]=useState(''),[cpw,setCpw]=useState(''),[showCpw,setShowCpw]=useState(false),[purpose,setPurpose]=useState('login'),[masked,setMasked]=useState(''),[cool,setCool]=useState(0),[busy,setBusy]=useState(false);
  useEffect(()=>{if(cool<=0)return;const id=setTimeout(()=>setCool(c=>c-1),1000);return()=>clearTimeout(id)},[cool]);

  const phoneOk=/^[6-9]\d{9}$/.test(phone),emailOk=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()),pwOk=cpw.length>=8&&/[A-Za-z]/.test(cpw)&&/\d/.test(cpw);
  const reset=()=>{setStep('form');setDg(['','','','','','']);setErr('');setCool(0)};
  const enter=res=>{API.setToken(res.token);u(API.sessionFromUser(res.user))};
  const fail=e=>setErr(e instanceof API.ApiError&&e.message==='NETWORK'?t.netErr:e.message||t.netErr);
  const run=async fn=>{if(busy)return;setBusy(true);setErr('');try{await fn()}catch(e){fail(e)}finally{setBusy(false)}};
  const toOtp=(p,r)=>{setPurpose(p);setMasked(r.sentTo||'');setCool(r.resendAfter||30);setDg(['','','','','','']);setStep('otp')};

  const startLogin=()=>{
    if(!ident.trim()||!cpw){setErr(t.badLogin);return}
    run(async()=>{const r=await API.login(ident.trim(),cpw);if(r.token)enter(r);else toOtp('login',r)}); // server asks for a code only when LOGIN_OTP=always
  };
  const startSignup=()=>{
    if(fname.trim().length<2){setErr(t.badName);return}
    if(!emailOk){setErr(t.badEmail);return}
    if(!phoneOk){setErr(t.badPhone);return}
    if(!pwOk){setErr(t.badPw);return}
    run(async()=>toOtp('register',await API.register({name:fname.trim(),email:email.trim(),phone,password:cpw,district,circle,mauza})));
  };
  const verify=()=>{
    if(otp.length!==6)return;
    run(async()=>enter(purpose==='register'?await API.verifyRegister(phone,otp):await API.verifyLogin(ident.trim(),otp)));
  };
  const resend=()=>{
    if(cool>0)return;
    run(async()=>{const r=await API.resendOtp(purpose==='register'?phone:ident.trim(),purpose);setCool(r.resendAfter||30);setDg(['','','','','','']);boxes.current[0]?.focus()});
  };
  const deptLogin=()=>{
    if(!emp.trim()||!pwd){setErr(t.badCred);return}
    run(async()=>enter(await API.officialLogin(emp.trim(),pwd)));
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
        onKeyDown={e=>e.key==='Enter'&&mode==='signup'&&startSignup()}/></div>);

  const otpStep=()=>(<>
    <div className="ls-ok">{t.sentTo} {masked}</div>
    <label>{t.enterOtp}</label>
    <div className="ls-otpbox">{dg.map((d,i)=>
      <input key={i} ref={el=>boxes.current[i]=el} className={d?'filled':''} inputMode="numeric" autoFocus={i===0}
        aria-label={`Digit ${i+1}`} value={d} onChange={e=>onDigit(i,e)} onKeyDown={e=>onDigitKey(i,e)} onFocus={e=>e.target.select()}/>)}</div>
    {err&&<div className="ls-err" role="alert">{err}</div>}
    <button className="ls-btn saf" disabled={otp.length!==6||busy} onClick={verify}><IcCheck/>{t.verify}</button>
    <div className="ls-links"><button className="ls-link" onClick={reset}>{t.change}</button><button className="ls-link" disabled={cool>0||busy} onClick={resend}>{cool>0?`${t.resend} (${cool}s)`:t.resend}</button></div>
  </>);

  return <div className="ls-page">
    <section className="ls-hero">
      {/* 3D rotating globe */}
      <div className="ls-globe-bg"><Globe/></div>
      <svg className="ls-grid" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {[[40,60,150,110],[200,60,120,110],[330,60,210,110],[40,190,180,150],[230,190,140,70],[230,270,140,70],[380,190,160,150],[40,360,130,120],[180,360,200,120],[390,360,150,120],[40,500,220,140],[270,500,270,140],[40,660,150,100],[200,660,340,100]]
          .map(([x,y,w,h],i)=><rect key={i} x={x} y={y} width={w} height={h} rx="4" fill={i%4===0?'rgba(94,168,255,.07)':'none'} stroke="rgba(94,168,255,.14)" strokeWidth="1.5"/>)}
        <circle cx="300" cy="420" r="6" fill="#5EA8FF"/><circle cx="300" cy="420" r="22" fill="none" stroke="#5EA8FF" strokeOpacity=".5"/>
      </svg>
      <div className="ls-brand"><span className="ls-mark"><img src={appLogo} alt="" /></span><span>Land<i>Stack</i></span></div>
      <div>
        <span className="ls-eyebrow"><IcShield width="15" height="15"/>{t.badge}</span>
        <h1>{t.hA}<br/><em>{t.hB}</em> {t.hC}</h1>
        <p className="lead">{t.lead}</p>
        <ul className="ls-feats">{[t.f1,t.f2,t.f3].map(f=><li key={f}><IcCheck width="18" height="18"/>{f}</li>)}</ul>
      </div>
      <div className="ls-stats"><div><b>1,284</b>{t.s1}</div><div><b>2</b>{t.s2}</div><div><b>99.9%</b>{t.s3}</div></div>
    <TrackBox/>
    </section>

    <section className="ls-panel">
      <div className="ls-top"><button className="ls-lang" onClick={()=>setLang(lang==='en'?'hi':'en')} aria-label="Change language"><IcGlobe width="16" height="16"/>{lang==='en'?'English':'हिन्दी'} <small>{lang==='en'?'EN':'HI'}</small></button></div>
      <div className="ls-wrap">
        <h2>{t.welcome}</h2><p className="ls-sub">{t.sub}</p>

        <div className="ls-roles" role="tablist">
          <button role="tab" aria-selected={tab==='citizen'} className={'ls-role'+(tab==='citizen'?' on':'')} onClick={()=>{setTab('citizen');reset();setCpw('')}}><span className="ic"><IcUser/></span><b>{t.tC}</b><span>{t.tCd}</span></button>
          <button role="tab" aria-selected={tab==='dept'} className={'ls-role'+(tab==='dept'?' on':'')} onClick={()=>{setTab('dept');setErr('')}}><span className="ic"><IcBank/></span><b>{t.tD}</b><span>{t.tDd}</span></button>
        </div>

        <div className="ls-card">
        {tab==='citizen'&&<>
          <div className="ls-utabs">
            <button className={mode==='login'?'on':''} onClick={()=>{setMode('login');reset();setCpw('')}}>{t.login}</button>
            <button className={mode==='signup'?'on':''} onClick={()=>{setMode('signup');reset();setCpw('')}}>{t.signup}</button>
          </div>

          {step==='otp'?otpStep():mode==='login'?<>
            <div className="ls-field"><label htmlFor="ls-id">{t.ident}</label>
              <input id="ls-id" className="ls-in" placeholder={t.identPh} value={ident} autoComplete="username" onChange={e=>{setIdent(e.target.value);setErr('')}}/></div>
            <div className="ls-field"><label htmlFor="ls-cpw">{t.cpw}</label>
              <div className="ls-pw"><input id="ls-cpw" className="ls-in" type={showCpw?'text':'password'} value={cpw} autoComplete="current-password"
                onChange={e=>{setCpw(e.target.value);setErr('')}} onKeyDown={e=>e.key==='Enter'&&startLogin()}/>
                <button type="button" onClick={()=>setShowCpw(v=>!v)}>{showCpw?t.hide:t.show}</button></div></div>
            {err&&<div className="ls-err" role="alert">{err}</div>}
            <button className="ls-btn" disabled={!ident.trim()||!cpw||busy} onClick={startLogin}><IcSend/>{busy?t.wait:t.signin}</button>
          </>:<>
            <div className="ls-field"><label htmlFor="ls-n">{t.name} <i>*</i></label><input id="ls-n" className="ls-in" placeholder={t.namePh} value={fname} onChange={e=>{setFname(e.target.value);setErr('')}}/></div>
            <div className="ls-field"><label htmlFor="ls-e">{t.email} <i>*</i></label><input id="ls-e" className="ls-in" type="email" placeholder={t.emailPh} value={email} autoComplete="email" onChange={e=>{setEmail(e.target.value);setErr('')}}/></div>
            <div className="ls-row">
              <div className="ls-field"><label htmlFor="ls-d">{t.district}</label><input id="ls-d" className="ls-in" value={district} onChange={e=>setDistrict(e.target.value)}/></div>
              <div className="ls-field"><label htmlFor="ls-c">{t.circle}</label><input id="ls-c" className="ls-in" value={circle} onChange={e=>setCircle(e.target.value)}/></div>
            </div>
            <div className="ls-field"><label htmlFor="ls-m">{t.mauza}</label><input id="ls-m" className="ls-in" value={mauza} onChange={e=>setMauza(e.target.value)}/></div>
            <div className="ls-field"><label htmlFor="ls-ph2">{t.mobile} <i>*</i></label>{phoneField('ls-ph2')}</div>
            <div className="ls-field"><label htmlFor="ls-npw">{t.newPw} <i>*</i></label>
              <div className="ls-pw"><input id="ls-npw" className="ls-in" type={showCpw?'text':'password'} value={cpw} autoComplete="new-password"
                onChange={e=>{setCpw(e.target.value);setErr('')}} onKeyDown={e=>e.key==='Enter'&&startSignup()}/>
                <button type="button" onClick={()=>setShowCpw(v=>!v)}>{showCpw?t.hide:t.show}</button></div>
              <p className="ls-hint">{t.pwHint}</p></div>
            {err&&<div className="ls-err" role="alert">{err}</div>}
            <button className="ls-btn" disabled={fname.trim().length<2||!emailOk||!phoneOk||!pwOk||busy} onClick={startSignup}><IcSend/>{busy?t.wait:t.register}</button>
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
          <button className="ls-btn" disabled={!emp||!pwd||busy} onClick={deptLogin}><IcKey/>{busy?t.wait:t.secure}</button>
        </>}
        </div>
      </div>
    </section>
  </div>;
}
export default Login;