"""Extract development candidates from accepted words; no joins or synthesis."""
import base64
import hashlib
import json
from pathlib import Path
import wave

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'context-candidates'
OUT.mkdir(exist_ok=True)
# Manual acoustic-screen boundaries, not forced alignment or listening labels.
# m is taken from the nasal end of am; t from the release at the end of mat.
CUES = [('m', 'am', .300, .395), ('s', 'sat', .035, .105),
        ('short-a', 'am', .060, .240), ('t', 'mat', .340, .445)]
source_manifest = json.loads((ROOT/'whole-word-candidates/manifest.json').read_text())
assets, rows = [], []
for cue, word, start, end in CUES:
    source = ROOT/'whole-word-candidates'/f'{word}.wav'
    record = next(a for a in source_manifest['assets'] if a['file'] == source.name)
    assert hashlib.sha256(source.read_bytes()).hexdigest() == record['sha256']
    with wave.open(str(source)) as wav:
        sr = wav.getframerate()
        assert wav.getsampwidth() == 2 and wav.getnchannels() == 1
        raw = wav.readframes(wav.getnframes())
    first, last = round(start*sr), round(end*sr)
    dest = OUT/f'phoneme-{cue}.wav'
    with wave.open(str(dest), 'wb') as wav:
        wav.setparams((1, 2, sr, 0, 'NONE', 'not compressed'))
        wav.writeframes(raw[first*2:last*2])
    assets.append({'file':dest.name, 'source_file':str(source.relative_to(ROOT)),
        'source_sha256':record['sha256'], 'start_sample':first, 'end_sample':last,
        'sample_rate':sr, 'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),
        'method':'Exact PCM slice; no fades, loops, stretching, joining or regeneration.',
        'pronunciation_accepted':False, 'actual_listening_performed':False})
    encoded = base64.b64encode(dest.read_bytes()).decode()
    original = base64.b64encode(source.read_bytes()).decode()
    label = '/æ/' if cue == 'short-a' else f'/{cue}/'
    rows.append(f'<section><h2>{label}</h2><p>קטע שחולץ מן המילה {word}; מועמד בלבד.</p><audio controls preload="none" src="data:audio/wav;base64,{encoded}"></audio><p>המילה השלמה שאושרה:</p><audio controls preload="none" src="data:audio/wav;base64,{original}"></audio></section>')
(OUT/'manifest.json').write_text(json.dumps({'voice':'af_heart',
    'status':'context-extractions-awaiting-listening', 'runtime_enabled':False,
    'model_license':'Apache-2.0', 'runtime_license':'MIT',
    'limitations':'Word acceptance does not accept cropped phonemes. Boundaries are acoustic hypotheses; short samples and cut edges require listening. No natural blend is assembled.',
    'assets':assets},indent=2)+'\n')
page = '''<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Word Forge — מועמדי צלילים מתוך מילים</title><style>body{font:18px system-ui;max-width:680px;margin:auto;padding:20px;background:#f1f5f9;color:#15283d}section{background:white;padding:16px;border-radius:14px;margin:15px 0}audio{display:block;width:100%}p{line-height:1.6}</style><h1>ארבעה צלילים מתוך מילים שאושרו</h1><p>בדיקת פיתוח בלבד. המילים נוצרו בקול האמריקאי af_heart וכבר אושרו על ידי שמעון. הקטעים המבודדים חולצו מהן לפי ניתוח אקוסטי, וטרם אושרו בהאזנה. העוזר לא האזין.</p><p>כל נגן נפרד. אין כאן חיבור טבעי בין קבצים, ואין שמות אותיות. אין צורך בהקלטה או בהעלאה.</p>''' + ''.join(rows) + '''<p>מקור: Kokoro; מודל Apache 2.0, כלי MIT. קטעים קצרים עלולים לכלול גבולות חיתוך לא טבעיים; אישור המילים אינו אישור הצלילים.</p><script>document.querySelectorAll('audio').forEach(a=>a.addEventListener('play',()=>document.querySelectorAll('audio').forEach(b=>{if(a!==b)b.pause()})));</script></html>'''
(OUT/'review.html').write_text(page,encoding='utf-8')
print('Built 4 exact PCM slices and 8 embedded audio controls; source hashes verified.')
