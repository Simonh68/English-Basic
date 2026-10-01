"""Reproducible acoustic screening, never pronunciation/listening approval."""
import hashlib
import json
from pathlib import Path
import subprocess
import wave
import numpy as np
from scipy.signal import correlate

ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / 'synthetic-candidates/manifest.json').read_text())
results = []
for asset in manifest['assets'][:4]:
    path = ROOT / 'synthetic-candidates' / asset['file']
    assert hashlib.sha256(path.read_bytes()).hexdigest() == asset['sha256']
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'null', '-'], check=True)
    with wave.open(str(path)) as wav:
        assert wav.getnchannels() == 1 and wav.getsampwidth() == 2
        sr = wav.getframerate()
        x = np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2').astype(float) / 32768
    assert sr == 24000 and np.isfinite(x).all() and np.max(np.abs(x)) < 1
    size, hop = 600, 120  # 25 ms window, 5 ms hop
    frames = np.array([x[i:i+size] for i in range(0, len(x)-size+1, hop)])
    rms = np.sqrt(np.mean(frames**2, axis=1))
    active = rms > rms.max() * 0.1  # relative -20 dB RMS screen
    spectrum = np.abs(np.fft.rfft(frames * np.hanning(size), axis=1))**2
    freq = np.fft.rfftfreq(size, 1/sr)
    high = spectrum[:, freq >= 3000].sum(axis=1) / np.maximum(spectrum.sum(axis=1), 1e-20)
    low = spectrum[:, freq < 500].sum(axis=1) / np.maximum(spectrum.sum(axis=1), 1e-20)
    periodicity = []
    for frame in frames:
        frame = frame - frame.mean()
        ac = correlate(frame, frame, mode='full', method='fft')[size-1:]
        periodicity.append(float(ac[48:241].max() / max(ac[0], 1e-20)))
    periodicity = np.array(periodicity)
    voiced = active & (periodicity >= 0.6)
    indices = np.flatnonzero(active)
    voiced_indices = np.flatnonzero(voiced)
    row = {
        'file': asset['file'], 'sha256': asset['sha256'],
        'duration_ms': round(len(x)/sr*1000, 1),
        'peak': round(float(np.max(np.abs(x))), 5),
        'active_span_ms': int((indices[-1]-indices[0])*5+25),
        'active_start_ms': int(indices[0]*5),
        'active_end_ms': int(indices[-1]*5+25),
        'active_frame_count': int(active.sum()),
        'periodic_active_frame_fraction': round(float(voiced.sum()/active.sum()), 3),
        'median_high_frequency_energy_fraction': round(float(np.median(high[active])), 3),
        'median_low_frequency_energy_fraction': round(float(np.median(low[active])), 3),
        'periodic_frame_centres_ms': [round(float(i*5+12.5), 1) for i in voiced_indices],
        'decode_passed': True, 'manifest_hash_passed': True,
        'actual_listening_performed': False, 'pronunciation_accepted': False,
    }
    results.append(row)
report = {
    'method': 'PCM16 decode; 25 ms Hann spectra / 5 ms hop; relative -20 dB RMS activity; normalized autocorrelation lags 48..240 (100..500 Hz), periodic threshold 0.6.',
    'limitations': 'Heuristic acoustic screening only. Overlapping windows are not independent observations. Periodicity is not a phoneme classifier; no formant, schwa, accent or letter-name acceptance is claimed. No listening took place.',
    'runtime_enabled': False,
    'assets': results,
}
(ROOT / 'phoneme-qa.json').write_text(json.dumps(report, indent=2)+'\n')
for row in results:
    print(json.dumps({k:v for k,v in row.items() if k != 'periodic_frame_centres_ms'}))
