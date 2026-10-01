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

The assistant has not listened. Simon reported that the normal/fast pace sounded good,
but could not judge isolated phoneme clarity. This is limited feedback, not
phoneme acceptance. A dedicated whole-word review now provides am, mat and sat
at speed 1.0, each generated in one inference with the same af_heart voice.
See `whole-word-candidates/manifest.json`, `generate-whole-words.py` and
`build-whole-word-review.py`; run the latter with the destination HTML path.
These words use only the existing four sounds and are development samples.
Three files decoded successfully, have finite non-clipped PCM16 samples and
match the hashes of all three HTML embeddings. Whole-word clarity awaits review.

Actual phoneme acceptance has not been performed. Keep `runtime_enabled=false` and
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

## Whole-word listening acceptance — 2026-09-30

Simon listened to the am/mat/sat normal-speed sheet and reported "נשמע מעולה".
Whole words at speed 1.0 are accepted by Simon; the assistant has not listened.
The whole-word manifest records this scoped acceptance, with runtime disabled.
Isolated phonemes and slow am remain unaccepted. The new comparison sheet
plays each isolated sound followed by an accepted word as separate files.
Sequential comparison playback is not claimed as a continuous blended recording.
Run `python build-comparison-review.py /path/to/review.html` to reproduce it.
Existing candidate WAVs are reused without modification; ten embedded hashes
are checked against their manifests. Browser/physical-device playback is untested.

## Provisional slow-am revision — 2026-09-30

Simon reported a break and requested correction. The exact location was not
confirmed. Generated a fresh complete `ˈæm` at speed 0.8, replacing speed 0.5
as the next review candidate, without file concatenation or waveform editing.
The dedicated review has separate controls for revised am and accepted normal
am, avoiding the comparison between an isolated sound and a word.
This is a candidate correction, not a verified audible fix. Technical decode
passed; assistant listening and user acceptance remain open. Model, voice,
rights and method match the documented Kokoro route. See am-revision/manifest.json.

## Revised am acceptance — 2026-09-30 20:41 Asia/Jerusalem

Simon responded "Me wle, kitkedem." (understood as "מעולה, תתקדם") to
the revised am sheet. Revised complete am at speed 0.8 is accepted by Simon.
The earlier break is no longer an open defect for this replacement candidate.
The assistant has not listened. This approval does not cover isolated /m/,
/s/, /æ/, /t/. Stage 1 remains open for those four sounds, with runtime disabled.
Next conversation should finish that focused quality work, not build the engine.

## Focused phoneme QA — 2026-10-01

Read live Charter 1.8 / ACTIVE and remote branch at 41eebed3. Approved whole
words and moderate am remain byte-for-byte unchanged. No new inference was run.
The assistant has not listened: available tools provide file/signal analysis,
not an actual perceptual phoneme review. Transcription widgets require user
media selection and are not a pure-phoneme listening assessor.

`check-phonemes.py` verifies original candidate hashes, PCM and ffmpeg decode,
then screens 25 ms windows. `phoneme-qa.json` records reproducible measurements.
A concrete acoustic concern was found: original /s/ has median energy above
3 kHz of only 1.4%, and 60.8% of active windows cross the periodicity threshold;
original /t/ has 1.7% high-frequency energy and 48.1% periodic windows. These
are suspicious for pure unvoiced targets, not a diagnosis of a particular vowel
or letter name. Original /s/ and /t/ are held from selection pending review.
Original /m/ and /æ/ also remain unaccepted; input labels do not prove output.

Instead of repeatedly generating short utterances, `build-context-phonemes.py`
creates exact PCM crops from accepted af_heart words. Nothing is looped,
concatenated, stretched, faded or regenerated. These are context-derived
candidates, not naturally produced isolated phonemes or continuous blends:

| Target | Accepted source | Interval | New duration | Energy above 3 kHz |
| --- | --- | --- | --- | --- |
| /m/ | am | 300–395 ms | 95 ms | <0.1% |
| /s/ | sat | 35–105 ms | 70 ms | 97.6% |
| /æ/ | am | 60–240 ms | 180 ms | 2.2% |
| /t/ | mat | 340–445 ms | 105 ms | 99.1% |

The source boundaries are manually selected acoustic hypotheses. The /m/ crop
is word-final; /t/ is a word-final release and may include aspiration. Crops
are short and may have cut-edge artifacts. Word acceptance does not approve
these segments. Spectral differences motivate the alternative; they do not
prove articulatory identity, pure /æ/, accent or audible quality.

`context-candidates/manifest.json` preserves source hashes and exact samples.
`checks.json` records 4/4 decodes, non-clipped samples and 8/8 matching embedded
assets in `context-candidates/review.html`. The review has independent players
for each candidate and its already accepted source word. No original slow am
0.5 is offered and no previous approval is reopened. Browser/phone playback
and actual listening were not performed. Model and runtime rights/credits
remain the already documented Apache-2.0 / MIT route.

Stage 1 remains incomplete for actual phoneme acceptance. All new candidates
retain pronunciation_accepted=false / runtime_enabled=false. The next action
is one actual listening review of these four exact crops in a listening-capable
development environment, correcting only observed failures. Simon need not
record, upload or judge isolated phonemes; there is no required action from
him now. Do not enter the learning-engine stage or repeat approved words.

Efficiency: reuse accepted word sources and source hashes; do not restart
isolated synthesis or send Simon repeated isolated-sound approval requests.

## Stage 1 completed — Simon listening acceptance, 2026-10-01

Simon offered to listen personally and received context-candidates/review.html,
with instructions to check all four isolated crops and report cutoffs or extra
vowels. His response “Nişîma mewlê.” is interpreted as “נשמע מעולה”.
This records Simon's listening acceptance of those four exact assets, not an
assistant listening claim. Their manifest records the reviewer, response and
unchanged hashes. Earlier candidate/blocked entries above are historical.

Accepted pack: the four context-derived /m/, /s/, /æ/, /t/ crops; existing
normal am/mat/sat; existing complete moderate am at speed 0.8. Original isolated
synthesis candidates and slow am 0.5 are not promoted. Context crops remain
labelled as exact slices, not naturally synthesized isolated phonemes or joins.
No waveforms or approved words changed. Technical checks remain reusable for
identical hashes. runtime_enabled remains false because no learning runtime
is built or authorized in this conversation. Physical-phone behaviour,
child use and efficacy remain untested.

Stage 1's sample-and-listening gate is complete. Next: stage 2 learning engine
in a separate scoped development task; do not build a machine, merge or publish
as part of this acceptance record. No adult review belongs in child gameplay.
