import fs from 'node:fs';
const must = [
  ['src/data.js', 'parcels: [],'], ['src/api.js', 'decideClaim'],
  ['src/screens.jsx', 'decideConsent'], ['src/screens.jsx', 'submitRegistration'],
  ['src/services.jsx', 'downloadCertificate'], ['src/services.jsx', 'property-tax-query'],
  ['src/services.jsx', 'property-mutation'], ['src/i18n.js', 'HI_KEYS'],
  ['src/App.jsx', 'fetchParcels(null,S.st)'], ['src/data.js', "'conflicts'"],
  ['src/fraud.jsx', 'evidence'], ['src/ulpin.jsx', 'Malformed ULPIN'],
  ['src/admin.jsx', 'const builtIn=[]'],
  ['src/screens.jsx', "visibility:vis==='Verified buyers only'?'masked':'public'"],
  ['src/screens.jsx', 'myReqs']
];
const bad = [['src/data.js', 'mine: [1]'], ['src/profile.jsx', 'ramesh.kumar@example.com']];
for (const [file, text] of must) if (!fs.readFileSync(file, 'utf8').includes(text)) throw new Error(`${file} missing ${text}`);
for (const [file, text] of bad) if (fs.readFileSync(file, 'utf8').includes(text)) throw new Error(`${file} still contains ${text}`);
const screens = fs.readFileSync('src/screens.jsx', 'utf8');
if (screens.indexOf('const x=S.parcels.find(q=>String(q.id)') > screens.indexOf('useEffect(()=>{if(x')) throw new Error('Sell hook ordering regression');
console.log(`smoke: passed ${must.length + bad.length + 1} frontend contract checks`);
