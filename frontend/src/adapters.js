const STATUS={none:'none',sale:'sale',mort:'mort',disp:'disp'};
const zone=z=>({R:'R',C:'C',A:'A',I:'I',G:'G'}[z]||'R');
function ringToPts(g){const r=g?.coordinates?.[0]||[];return r.map(([lng,lat])=>`${lng},${lat}`).join(' ')}
export function toUiParcel(p={}){const ulpin=p.ulpin||p.id||'';return {id:ulpin,u:ulpin,n:p.name||p.address||p.surveyNo||ulpin,a:p.area||'',z:zone(p.zoning),s:STATUS[p.status]||'none',t:Number(p.trustScore??0),pr:p.price||'Not listed',o:p.ownerName||p.maskedOwner||'',geometry:p.geometry,pts:ringToPts(p.geometry),flags:p.risks||null,legacyId:p.legacyId,surveyNo:p.surveyNo,hidden:p.hidden||[],viewer:p.viewer,ownerName:p.ownerName,phone:p.phone,address:p.address,st:p.state||'Chandigarh',apiId:p.id,raw:p};}
export const toUiParcels=rows=>(rows||[]).map(toUiParcel);
