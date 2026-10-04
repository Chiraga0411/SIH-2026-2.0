import fs from 'node:fs';
const must = [
  ['src/data.js', 'parcels: [],'], ['src/api.js', 'decideClaim'],
  ['src/screens.jsx', 'decideConsent'], ['src/screens.jsx', 'submitRegistration'],
  ['src/services.jsx', 'downloadCertificate'], ['src/services.jsx', 'property-tax-query'],
  ['src/services.jsx', 'property-mutation'], ['src/i18n.js', 'HI_KEYS'],
  ['src/App.jsx', 'fetchParcels(null,S.st)'], ['src/data.js', "'conflicts'"],
  ['src/fraud.jsx', 'evidence'], ['src/ulpin.jsx', 'Malformed ULPIN'],
  ['src/screens.jsx', "visibility:vis==='Verified buyers only'?'masked':'public'"],
  ['src/report.jsx', 'myReqs'],
  ['src/screens.jsx', '<MyRequests'], ['src/report.jsx', 'Consent required or expired'],
  ['src/admin.jsx', 'deriveThreats'], ['src/admin.jsx', 'aria-label="Audit role"'], ['src/admin.jsx', 'aria-label="From date"'],
  ['src/AvatarMenu.jsx', 'Expected 14'], ['src/Map3D.jsx', 'Popup'],
  ['src/data.js', "phone: 'Hidden', price: 'Public', address: 'On consent'"]
];
const bad = [['src/data.js', 'mine: [1]'], ['src/profile.jsx', 'ramesh.kumar@example.com'], ['src/admin.jsx', 'resourceType:resource'], ['src/screens.jsx', 'onClick={()=>open(r)}'], ['src/data.js', "mortgage: 'On consent' }"]];
for (const [file, text] of must) if (!fs.readFileSync(file, 'utf8').includes(text)) throw new Error(`${file} missing ${text}`);
for (const [file, text] of bad) if (fs.readFileSync(file, 'utf8').includes(text)) throw new Error(`${file} still contains ${text}`);
const screens = fs.readFileSync('src/screens.jsx', 'utf8');
if (screens.indexOf('const x=S.parcels.find(q=>String(q.id)') > screens.indexOf('useEffect(()=>{if(x')) throw new Error('Sell hook ordering regression');
const sellBody=screens.slice(screens.indexOf('export function Sell'),screens.indexOf('export function Listings'));
const early=sellBody.indexOf('if(!x)return'),lastHook=Math.max(sellBody.lastIndexOf('useState('),sellBody.lastIndexOf('useEffect('));
if(lastHook>early) throw new Error('Sell has a hook after the early return');
console.log(`smoke: passed ${must.length + bad.length + 1} frontend contract checks`);
