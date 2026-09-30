"""Build a development comparison sheet; playback order is not a blended recording."""
import base64
import hashlib
import json
from pathlib import Path
import sys
root = Path(__file__).resolve().parent
pairs = [
    ("/m/ ואז mat", "synthetic-candidates/phoneme-m.wav", "whole-word-candidates/mat.wav"),
    ("/s/ ואז sat", "synthetic-candidates/phoneme-s.wav", "whole-word-candidates/sat.wav"),
    ("/æ/ ואז am", "synthetic-candidates/phoneme-short-a.wav", "whole-word-candidates/am.wav"),
    ("/t/ ואז mat", "synthetic-candidates/phoneme-t.wav", "whole-word-candidates/mat.wav"),
    ("am איטי ואז am רגיל", "synthetic-candidates/am-connected-slow.wav", "whole-word-candidates/am.wav"),
]
rows=[]
for i,(label,first,second) in enumerate(pairs):
    players=[]
    for j,filename in enumerate((first,second)):
        data=(root/filename).read_bytes()
        manifest=json.loads((root/Path(filename).parent/'manifest.json').read_text())
        record=next(a for a in manifest['assets'] if a['file']==Path(filename).name)
        assert hashlib.sha256(data).hexdigest()==record['sha256']
        payload=base64.b64encode(data).decode()
        players.append(f'<audio id="a{i}_{j}" controls preload="none" src="data:audio/wav;base64,{payload}"></audio>')
    rows.append(f'<section><h2>{label}</h2><button data-pair="{i}">השמע את הזוג</button>'+''.join(players)+'</section>')
page='<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Word Forge — השוואת שמע</title><style>body{font:18px system-ui;max-width:680px;margin:auto;padding:20px;background:#f1f5f9;color:#15283d}section{background:white;padding:16px;border-radius:14px;margin:15px 0}audio{display:block;width:100%;margin-top:12px}button{font:inherit;padding:12px}h2{font-size:22px}p{line-height:1.6}</style><h1>השוואת צליל למילה</h1><p>המילים בקצב רגיל כבר נשמעו ואושרו על ידך. כל כפתור משמיע צליל בנפרד ואחריו מילה להשוואה. זו השמעה של שני קבצים נפרדים, לא חיבור טבעי ביניהם. קטע am האיטי עצמו נוצר כמילה שלמה.</p><p>הקש על חמשת כפתורי ההשמעה ודווח אם אתה שומע תנועה מיותרת או נתק ב־am האיטי.</p><p id="message" role="status"></p>'+''.join(rows)+"<p>שמע סינתטי: Kokoro af_heart אמריקאי; מודל Apache 2.0 וכלי MIT. בדיקת פיתוח בלבד. אין מיקרופון או שמירת נתונים.</p><script>\nlet generation=0;\nfunction stop(){generation++;document.querySelectorAll('audio').forEach(a=>{a.pause();a.currentTime=0;a.onended=null});}\ndocument.querySelectorAll('button').forEach(b=>b.addEventListener('click',async()=>{\nstop();const current=generation;const first=document.getElementById('a'+b.dataset.pair+'_0');const second=document.getElementById('a'+b.dataset.pair+'_1');\nfirst.onended=async()=>{if(current!==generation)return;try{await second.play()}catch(e){document.getElementById('message').textContent='לחץ ישירות על הנגן השני להמשך.'}};\ntry{await first.play()}catch(e){document.getElementById('message').textContent='לחץ ישירות על נגן השמע.'}\n}));\n</script></html>"
Path(sys.argv[1]).resolve().write_text(page,encoding='utf-8')
print('Built five comparison pairs; all ten embedded hashes checked')
