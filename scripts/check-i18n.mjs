import fs from 'node:fs';
const en=JSON.parse(fs.readFileSync('src/i18n/en.json','utf8'));
for (const lang of ['hi','ta']) { const d=JSON.parse(fs.readFileSync(`src/i18n/${lang}.json`,'utf8')); const missing=Object.keys(en).filter(k=>!(k in d)); if(missing.length) { console.error(`${lang}: missing ${missing.join(', ')}`); process.exitCode=1; } }
if(!process.exitCode) console.log(`i18n:check passed (${Object.keys(en).length} keys)`);
