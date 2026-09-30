/* Demo JWT kept in memory only (never localStorage). It is UNSIGNED (alg none) and exists so the UI can be role-guarded.
   Real flow: POST /auth/login returns a signed JWT; replace issue() with that response and send it with authFetch(). */
const b=o=>btoa(JSON.stringify(o)).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
let tok=null;
export const issue=(role,name)=>{const n=Math.floor(Date.now()/1e3);tok=[b({alg:'none',typ:'JWT'}),b({sub:name,role,iat:n,exp:n+3600,demo:true}),''].join('.');return tok};
export const clear=()=>{tok=null};
export const claims=()=>{if(!tok)return null;try{const c=JSON.parse(atob(tok.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return c.exp>Date.now()/1e3?c:null}catch{return null}};
export const can=roles=>{const c=claims();return !!c&&roles.includes(c.role)};
export const authFetch=(url,o={})=>fetch(url,{...o,headers:{...o.headers,Authorization:'Bearer '+tok}});
