const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const canonical=fs.readFileSync(path.join(root,'word-forge/index.html'),'utf8');
function extract(start,end,name){
 const a=canonical.indexOf(start),b=canonical.indexOf(end,a);
 if(a<0||b<0)throw Error('Canonical pattern missing: '+name);
 return vm.runInNewContext('('+canonical.slice(a+start.length,b).trim().replace(/;$/,'')+')');
}
const plans={
 chunks:extract('const stageChunkPlans =','const wordChunkOverrides =','chunks'),
 overrides:extract('const wordChunkOverrides =','const stageRoundOverrides =','overrides'),
 rounds:extract('const stageRoundOverrides =','const chunkChoicePools =','rounds'),
 pools:extract('const chunkChoicePools =','const stagePlanKey =','pools')
};
fs.writeFileSync(path.join(__dirname,'plans.json'),JSON.stringify(plans,null,2)+'\n');
const sourceFiles=['curriculum-data.js','speech-runtime.js','word-forge/index.html'];
const provenance={baseCommit:'a0210b709c86d910e505db7f3ea1c94f0cd166c1',source:'Simonh68/English-Basic',files:Object.fromEntries(sourceFiles.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]))};
fs.writeFileSync(path.join(__dirname,'source.json'),JSON.stringify(provenance,null,2)+'\n');
let html=fs.readFileSync(path.join(__dirname,'template.html'),'utf8');
const scripts=[fs.readFileSync(path.join(root,'curriculum-data.js'),'utf8'),`window.MEMORY_PLANS=${JSON.stringify(plans)};`,
 fs.readFileSync(path.join(root,'speech-runtime.js'),'utf8'),fs.readFileSync(path.join(__dirname,'engine.js'),'utf8'),fs.readFileSync(path.join(__dirname,'app.js'),'utf8')].join('\n');
html=html.replace('/* INLINE_STYLE */',()=>fs.readFileSync(path.join(__dirname,'style.css'),'utf8')).replace('/* INLINE_SCRIPT */',()=>scripts.replace(/<\/script/gi,'<\\/script'));
fs.mkdirSync(path.join(__dirname,'dist'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'dist/index.html'),html);
console.log('Built standalone pilot from canonical curriculum: '+Buffer.byteLength(html)+' bytes');
