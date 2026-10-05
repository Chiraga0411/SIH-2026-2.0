import {P as MOCK_PARCELS,GEO,SC,ST,CFG,RBAC} from './data.js';
import {toUiParcel} from './adapters.js';
const BASE=(import.meta.env.VITE_API_BASE||'').replace(/\/$/,'');
const DEMO=import.meta.env.VITE_DEMO_MOCK==='true';
const TOKEN_KEY='ls-token';
export const isMockMode=()=>DEMO; export const isDemoMode=()=>DEMO;
export const getToken=()=>{try{return localStorage.getItem(TOKEN_KEY)}catch{return null}};
export const setToken=t=>{try{localStorage.setItem(TOKEN_KEY,t)}catch{}};
export const clearToken=()=>{try{localStorage.removeItem(TOKEN_KEY)}catch{}};
export class ApiError extends Error{constructor(message,status=0,details){super(message);this.name='ApiError';this.status=status;this.details=details}}
export const setSandbox=on=>{try{localStorage.setItem('ls-sandbox',on?'1':'0')}catch{}};
export const isSandbox=()=>{try{return localStorage.getItem('ls-sandbox')==='1'}catch{return false}};
async function request(method,path,body,{auth=true,signal,raw=false}={}){
 if(method!=='GET'&&isSandbox())return {sandbox:true,body};
 const headers={Accept:'application/json'}; if(body!==undefined)headers['Content-Type']='application/json'; const token=auth?getToken():null; if(token)headers.Authorization=`Bearer ${token}`;
 let res; try{res=await fetch(`${BASE}/api${path}`,{method,headers,body:body!==undefined?JSON.stringify(body):undefined,signal})}catch(e){if(e.name==='AbortError')throw e;throw new ApiError('Unable to reach the Land Stack API.',0)}
 if(raw)return res; const data=await res.json().catch(()=>({}));
 if(res.status===401&&token&&!path.startsWith('/auth/')){clearToken();window.dispatchEvent(new Event('ls-unauthorized'))}
 if(!res.ok)throw new ApiError(data.message||`Request failed (${res.status})`,res.status,data); return data;
}
const unwrap=(d,k)=>Array.isArray(d)?d:(d?.[k]||[]); const mock=()=>MOCK_PARCELS.map(toUiParcel);
export const register=p=>request('POST','/auth/register',p,{auth:false});
export const verifyRegister=(phone,otp)=>request('POST','/auth/register/verify',{phone,otp},{auth:false});
export const login=(identifier,password)=>request('POST','/auth/login',{identifier,password},{auth:false});
export const verifyLogin=(identifier,otp)=>request('POST','/auth/login/verify',{identifier,otp},{auth:false});
export const resendOtp=(identifier,purpose)=>request('POST','/auth/resend-otp',{identifier,purpose},{auth:false});
export const officialLogin=(employeeId,password)=>request('POST','/auth/official-login',{employeeId,password},{auth:false});
export const me=()=>request('GET','/auth/me');
const UI_ROLE={citizen:'citizen',buyer:'citizen',officer:'officer',registrar:'officer',planner:'officer',auditor:'admin',admin:'admin'};
const LANDING={REG:'reg',PLN:'plan',AUD:'audit',ADM:'adm'};
export function sessionFromUser(user){const role=UI_ROLE[user.role]||'citizen';const view=role==='citizen'?'map':(LANDING[(user.employeeId||'').split('-')[0]]||(role==='admin'?'adm':'office'));return {role,view,name:user.name,user};}
export async function fetchParcels(bbox,state,signal){if(DEMO)return {count:mock().length,truncated:false,parcels:mock()};const q=new URLSearchParams();if(bbox)q.set('bbox',bbox.join(','));if(state)q.set('state',state);q.set('limit','500');const d=await request('GET',`/parcels?${q}`,undefined,{signal});return {...d,parcels:(d.parcels||[]).map(toUiParcel)};}
export async function fetchParcel(ulpin){if(DEMO)return mock().find(p=>p.u===ulpin||String(p.id)===String(ulpin));try{return toUiParcel(await request('GET',`/parcels/${encodeURIComponent(ulpin)}`))}catch(e){if(e.status===404){const rows=await searchParcels(ulpin);return rows[0]}throw e;}}
export async function fetchFullReport(ulpin){if(DEMO)return fetchParcel(ulpin);return toUiParcel(await request('GET',`/parcels/${encodeURIComponent(ulpin)}/full`));}
export async function searchParcels(q){if(DEMO){const s=q.toLowerCase();return mock().filter(p=>(p.u||'').toLowerCase().includes(s)||(p.n||'').toLowerCase().includes(s)||(p.o||'').toLowerCase().includes(s)).slice(0,20)}const d=await request('GET',`/parcels/search?q=${encodeURIComponent(q)}`);return unwrap(d,'parcels').map(toUiParcel)}
export const claim=ulpin=>request('POST','/claims',{ulpin});
export const myProperties=async()=>DEMO?mock().slice(0,1):unwrap(await request('GET','/claims/my-properties'),'properties').map(toUiParcel);
export const claimsQueue=async(status='Pending')=>DEMO?[]:unwrap(await request('GET',`/claims?status=${encodeURIComponent(status)}`),'claims');
export const decideClaim=(id,status,note)=>request('PATCH',`/claims/${id}`,{status,note});
export const listings=async(filters={})=>{if(DEMO)return mock().filter(p=>p.s==='sale').map(p=>({...p,listingId:String(p.id)}));const q=new URLSearchParams(Object.entries(filters).filter(([,v])=>v!==''&&v!=null));const rows=unwrap(await request('GET',`/listings?${q}`),'listings');return rows.map(l=>({...toUiParcel(l.parcel||{}),listingId:l.id||l._id,useType:l.useType,visibility:l.visibility,zoningWarning:l.zoningWarning,listingStatus:l.status,price:l.price||l.parcel?.price}));};
export const listing=id=>request('GET',`/listings/${id}`); export const eligibility=ulpin=>request('GET',`/listings/eligibility/${encodeURIComponent(ulpin)}`); export const createListing=payload=>request('POST','/listings',payload); export const inquiry=(id,message='')=>request('POST',`/listings/${id}/inquiry`,{message});
export const consents=async as=>DEMO?[]:unwrap(await request('GET',`/consents?as=${as}`),'requests'); export const requestConsent=(ulpin,purpose)=>request('POST','/consents',{ulpin,purpose}); export const decideConsent=(id,status)=>request('PATCH',`/consents/${id}`,{status});
export const getPrivacy=ulpin=>request('GET',`/privacy/${encodeURIComponent(ulpin)}`); export const putPrivacy=(ulpin,values)=>request('PUT',`/privacy/${encodeURIComponent(ulpin)}`,values);
export const registrations=mine=>request('GET',`/registrations${mine?'?mine=1':''}`); export const submitRegistration=listingId=>request('POST','/registrations',{listingId}); export const decideRegistration=(id,status)=>request('PATCH',`/registrations/${id}`,{status});
export const services=async()=>DEMO?{services:[]}:request('GET','/services'); export const serviceResult=(id,ulpin)=>request('GET',`/services/${encodeURIComponent(id)}?ulpin=${encodeURIComponent(ulpin)}`); export const serviceRequests=async()=>DEMO?{requests:[]}:request('GET','/service-requests'); export const createServiceRequest=payload=>request('POST','/service-requests',payload); export const advanceService=(id,action='advance',reason)=>request('PATCH',`/service-requests/${id}`,{action,...(reason?{reason}: {})});
export const trackApplication=ref=>request('GET',`/service-requests/track?ref=${encodeURIComponent(ref)}`,undefined,{auth:false});
export const downloadCertificate=async id=>{const r=await request('GET',`/service-requests/${id}/certificate`,undefined,{raw:true});if(!r.ok)throw new ApiError('Certificate download failed',r.status);return r.blob()};
export const alerts=async()=>DEMO?[]:unwrap(await request('GET','/alerts'),'alerts'); export const conflicts=async()=>DEMO?[]:unwrap(await request('GET','/conflicts'),'conflicts'); export const fetchAuditLog=filters=>DEMO?{total:0,page:1,logs:[]}:request('GET',`/audit-log?${new URLSearchParams(filters)}`); export const fetchThreats=async()=>[]; export const fetchTrustScore=async ulpin=>DEMO?null:request('GET',`/score?ulpin=${encodeURIComponent(ulpin)}`); export const dues=async()=>DEMO?[]:unwrap(await request('GET','/dues'),'items'); export const payDue=id=>request('POST',`/dues/${id}/pay`); export const askAssistant=(question,lang,ulpin)=>request('POST','/assistant/ask',{question,lang,...(ulpin?{ulpin}:{})});
export const fetchStateConfig=async state=>DEMO?CFG[state]||null:null; export const normalizeStateData=async()=>null; export {GEO,SC,ST,CFG,RBAC};
export const submitApplication=createServiceRequest; export const advanceApplication=advanceService; export const rejectApplication=(id,reason)=>advanceService(id,'reject',reason); export const fetchConflicts=conflicts; export const fetchThreatsFromApi=fetchThreats;
