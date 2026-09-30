"""Build a self-contained development listening sheet with six embedded WAVs."""
import base64
import html
import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parent
manifest = json.loads((root / "synthetic-candidates/manifest.json").read_text())
labels = ["/m/", "/s/", "/æ/ — התנועה שבמילה cat", "/t/ קצר",
          "am — יצירה של המילה השלמה בקצב איטי", "am — קצב רגיל"]
rows = []
for label, asset in zip(labels, manifest["assets"], strict=True):
    payload = base64.b64encode((root / "synthetic-candidates" / asset["file"]).read_bytes()).decode()
    rows.append(f'<section><h2 dir="auto">{html.escape(label)}</h2>'
                f'<audio controls preload="none" aria-label="{html.escape(label)}" '
                f'src="data:audio/wav;base64,{payload}"></audio></section>')
page = '''<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Word Forge — דוגמת שמע לפיתוח</title>
<style>body{font:18px system-ui;max-width:680px;margin:auto;padding:22px;
background:#f1f5f9;color:#15283d}h1{font-size:27px}section{background:white;
border:1px solid #cbd5e1;border-radius:14px;padding:16px;margin:14px 0}
h2{font-size:20px;margin:0 0 12px}audio{width:100%}p{line-height:1.6}</style>
<h1>Word Forge — דוגמת שמע לפיתוח</h1>
<p>שישה קטעים שנוצרו בקול סינתטי אמריקאי (Kokoro, af_heart).
הוזנו פונמות ישירות. כל קטע am נוצר בשלמותו, ללא חיבור קובצי פונמות.
זו דוגמה לבדיקת איכות, לא משחק ולא הקלטת דובר אנושי.</p>
<p><strong>בדיקות קבצים עברו. ההגייה טרם נבדקה בהאזנה.</strong>
לחץ על נגן בכל שורה. בדוק שהצלילים אינם שמות אותיות ושאין תנועה אחרי /t/;
ב־am האיטי בדוק שהמעבר מהתנועה ל־m רציף.</p>
''' + "\n".join(rows) + '''
<p>הקבצים משולבים כאן ופועלים ללא חיבור לשירות חיצוני. אין הקלטת מיקרופון,
אנליטיקה או שמירת נתונים.</p>
<p>מקור: <a href="https://huggingface.co/hexgrad/Kokoro-82M">Kokoro-82M</a>
— משקולות ברישיון Apache 2.0; כלי kokoro-onnx ברישיון MIT.
דוגמת Wikimedia הקודמת אינה חלק מהקטעים האלה.</p>
<script>document.querySelectorAll('audio').forEach(a=>a.addEventListener('play',()=>{
document.querySelectorAll('audio').forEach(b=>{if(b!==a)b.pause()})}));</script>
</html>'''
destination = Path(sys.argv[1]).resolve()
destination.write_text(page, encoding="utf-8")
print(f"Created {destination.name}: {destination.stat().st_size} bytes; six embedded WAVs")
