"""Generate development candidates from explicit phonemes, never letter names.

Usage: python generate-sample.py /path/to/model-directory
Requires kokoro-onnx==0.4.9 and soundfile==0.14.0.
No external request is made during synthesis. Model files are not in the repo.
"""
import hashlib
import importlib.metadata
import json
from pathlib import Path
import sys

import numpy as np
import onnxruntime as ort
import soundfile as sf
from kokoro_onnx import Kokoro


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


model_dir = Path(sys.argv[1]).resolve()
output = Path(__file__).resolve().parent / "synthetic-candidates"
output.mkdir(exist_ok=True)
options = ort.SessionOptions()
options.intra_op_num_threads = 2
options.inter_op_num_threads = 1
session = ort.InferenceSession(str(model_dir / "kokoro-v1.0.onnx"), options,
                              providers=["CPUExecutionProvider"])
model = Kokoro.from_session(session, str(model_dir / "voices-v1.0.bin"))
voice = "af_heart"
cues = [
    ("phoneme-m", "m", 0.5),
    ("phoneme-s", "s", 0.5),
    ("phoneme-short-a", "æ", 0.5),
    ("phoneme-t", "t", 1.0),
    ("am-connected-slow", "ˈæm", 0.5),
    ("am-whole-word", "ˈæm", 1.0),
]
manifest = {
    "status": "generated-candidates-awaiting-actual-listening",
    "kind": "synthetic-audio-not-a-human-recording",
    "voice": voice,
    "voice_locale_from_provider": "American English",
    "actual_listening_performed": False,
    "pronunciation_accepted": False,
    "physical_phone_tested": False,
    "runtime_enabled": False,
    "method": "Explicit phoneme input; one model batch and inference per file. No joins inside am.",
    "model_source": "https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0",
    "upstream_model": "https://huggingface.co/hexgrad/Kokoro-82M",
    "model_license": "Apache-2.0",
    "implementation_license": "MIT",
    "model_sha256": digest(model_dir / "kokoro-v1.0.onnx"),
    "voices_sha256": digest(model_dir / "voices-v1.0.bin"),
    "packages": {p: importlib.metadata.version(p)
                 for p in ["kokoro-onnx", "onnxruntime", "numpy", "soundfile"]},
    "assets": [],
}
for name, phonemes, speed in cues:
    assert all(p in model.tokenizer.vocab for p in phonemes)
    assert len(model._split_phonemes(phonemes)) == 1
    samples, rate = model.create(phonemes, voice=voice, speed=speed,
                                 lang="en-us", is_phonemes=True, trim=True)
    assert samples.ndim == 1 and len(samples) > 0
    assert np.isfinite(samples).all()
    assert 0 < np.max(np.abs(samples)) < 1
    path = output / (name + ".wav")
    sf.write(path, samples, rate, subtype="PCM_16")
    asset = {"file": path.name, "phonemes": phonemes, "speed": speed,
             "inference_batches": 1, "sample_rate": rate,
             "duration_seconds": len(samples) / rate,
             "peak": float(np.max(np.abs(samples))), "sha256": digest(path)}
    manifest["assets"].append(asset)
    print(json.dumps(asset, ensure_ascii=False), flush=True)
(output / "manifest.json").write_text(
    json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
