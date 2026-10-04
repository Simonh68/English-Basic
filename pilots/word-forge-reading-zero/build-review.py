"""Reproducible offline review; embed existing files, never synthesize audio."""
from pathlib import Path
import re, json, base64, hashlib, sys
root=Path(__file__).resolve().parent
out=Path(sys.argv[1]) if len(sys.argv)>1 else root/'review'/'Word-Forge-Reading-Zero.html'
modules=['learning-content','learning-engine','recorded-learning','rewards','session-controller','storage','audio-player','complex-demo','machine-app']
paths=[f'audio/context-candidates/{p}.wav' for p in ['phoneme-m','phoneme-s','phoneme-short-a','phoneme-t']]+[f'audio/whole-word-candidates/{p}.wav' for p in ['am','mat','sat']]+['audio/am-revision/am-connected-moderate.wav','audio/complex-word/thought.wav']
audio={p:'data:audio/wav;base64,'+base64.b64encode((root/p).read_bytes()).decode() for p in paths}
spec=json.loads((root/'learning-model.spec.json').read_text())
js='const reviewModules={};\nconst embeddedAudio='+json.dumps(audio)+';\n'
for name in modules:
    source=(root/(name+'.mjs')).read_text()
    exports=re.findall(r'export\s+(?:const|class|function)\s+(\w+)',source)
    source=re.sub(r"import\s+\{([^}]+)\}\s+from\s+'\./([^']+)\.mjs';",lambda m:'const {'+m[1]+'}=reviewModules['+json.dumps(m[2])+'];',source)
    source=re.sub(r'\bexport\s+(?=const|class|function)','',source)
    if name in ['audio-player','complex-demo']:source=source.replace('new Audio(path)','new Audio(embeddedAudio[path])')
    if name=='machine-app':source='const fetch=async()=>({ok:true,json:async()=>('+json.dumps(spec)+')});\n'+source
    js+='reviewModules['+json.dumps(name)+']=(()=>{\n'+source+'\nreturn {'+','.join(exports)+'};})();\n'
html=(root/'index.html').read_text().replace('<link rel="stylesheet" href="machine.css">','<style>'+(root/'machine.css').read_text()+'</style>')
html=html.replace('<script type="module" src="machine-app.mjs"></script>','<script>'+js.replace('</script','<\\/script')+'</script>')
out.parent.mkdir(parents=True,exist_ok=True);out.write_text(html)
print(json.dumps({'file':str(out),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'embedded_audio_sha256':{p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in paths}},indent=2))
