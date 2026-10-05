import {useState} from 'react';
export const normalizeUlpin=v=>String(v||'').toUpperCase().replace(/[^0-9A-Z]/g,'');
export const isUlpin=v=>/^[0-9A-Z]{14}$/.test(normalizeUlpin(v));
export const formatUlpin=v=>{const s=normalizeUlpin(v);return s.length===14?s.replace(/^(.{2})(.{2})(.{3})(.{3})(.{4})$/,'$1-$2-$3-$4-$5'):String(v||'—')};
export function Ulpin({value,copy=true}){const [done,setDone]=useState(false);const text=formatUlpin(value),valid=isUlpin(value),legacy=String(value||'').toUpperCase().startsWith('CH-');return <span className="ulpin-wrap"><span className="mono">{text}</span>{!valid&&!legacy&&<span className="badge no" title="Expected a 14-character ULPIN">Malformed ULPIN</span>}{legacy&&<span className="badge nu">Legacy ID</span>}{copy&&<button className="chip" aria-label="Copy ULPIN" onClick={()=>{navigator.clipboard?.writeText(text);setDone(true);setTimeout(()=>setDone(false),1200)}}>{done?'Copied':'Copy'}</button>}</span>}
