# Stage 1 — generated audio candidates

Simon explicitly instructed the assistant to create the audio using tools,
plugins or external services, rather than ask him to upload a recording. This
supersedes the previous original-recording handoff as the immediate next action.
It does not approve unreviewed pronunciation or extend scope beyond stage 1.

Six WAV candidates were generated locally with Kokoro v1.0 / `af_heart`:
four direct phonemes `m`, `s`, `æ`, `t`; `ˈæm` at speed 0.5; `ˈæm` at speed 1.0.
These are **synthetic samples, not human recordings**. The voice is listed by
the provider as American English; this is source metadata, not an actual
listening confirmation of accent or pronunciation.

## Method and rights

- Upstream: https://huggingface.co/hexgrad/Kokoro-82M (hexgrad and contributors).
- Voice list: https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md .
- Export: https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0 .
- Runtime: https://github.com/thewh1teagle/kokoro-onnx , MIT; pinned to 0.4.9.
- Model weights: Apache 2.0 according to the upstream model card and exporter.
  Full license texts are included in `licenses/`. These permit the local model
  use; no paid service or third-party human recording was used for these clips.
  This does not claim exclusive copyright in AI-generated output or provider
  endorsement. Retain these credits and provenance with the clips.
- The single /æ/ Commons reference remains separately licensed CC BY-SA 3.0;
  it was not used as input, mixed, modified or included in this generation.
- No voice cloning, personal data, account registration or API billing.
- Explicit `is_phonemes=True` bypasses text-to-phoneme conversion. Letter names
  were never submitted. Every phoneme was verified in the model vocabulary.
- Every file has one inference batch. Both am files are generated from the
  complete `ˈæm` sequence. Neither is a join of isolated m/a samples.
- Slow am uses model speed 0.5 on the whole sequence, not time-stretched or
  repeated waveform segments. Audibly continuous transition remains unverified.
- The source warns of weakness on very short utterances. The intended phoneme
  input cannot prove the output is pure: hallucinated vowels or letter names
  must still be rejected in a listening review.

## Reproduction and checks

Download the two v1.0 files from the export release, then run in an isolated
Python environment (recorded package versions and file hashes in manifest.json):

```
pip install kokoro-onnx==0.4.9 soundfile==0.14.0
python generate-sample.py /path/to/model-directory
python build-review.py /path/to/Word-Forge-Reading-Zero-Audio-Review.html
```

The large model/voice files and virtual environment are development inputs;
they are not committed or loaded by any game. The sample generator uses CPU,
explicit phonemes and a fixed voice. `synthetic-candidates/manifest.json` records
hashes, duration, input, speed, voice and acceptance flags for each output.

Technical checks passed: six nonempty finite mono arrays at 24 kHz, peak below
full scale, PCM16 encoding, complete ffmpeg decode of each file, and six embedded
WAVs matching the individual hashes in the offline review sheet. These checks
do not constitute listening, pronunciation approval, phone testing or a child
trial. No browser playback is claimed.

## Remaining acceptance

Actual listening has not been performed. Keep `runtime_enabled=false` and
`pronunciation_accepted=false`. One review sheet is ready for listening; Simon
need not record or upload anything. Listen for pure /m/, /s/, /æ/, a brief /t/
without schwa, and a continuous vowel-to-nasal transition in slow am followed
by a normal stressed am. Document observed defects before regenerating.
If the samples fail, consider a connected speech-generation service; Runway
was discovered but was not connected or used. Do not charge for generation
without explicit cost approval.

Stage 1 now has six generated candidates and a concrete listening artifact.
It is still incomplete until actual listening accepts the pronunciation.
No learning engine, machine, persistence, merge or publication was performed.
