# Small implementation conversations

Simon authorized one isolated machine pilot on 2026-09-30, then requested small
conversations rather than one long implementation session. DESIGN.md 1.1 remains
the design authority. This document records execution scope, not a redesign.

## 1. Audio sample — current, incomplete

Deliverable: four phoneme samples /m/, /s/, /æ/, /t/ and one complete
continuous-blending sample for `am`, followed by its natural whole-word form.
Simon subsequently requested tool-generated audio rather than a user recording.
Generated samples must be labelled synthetic, not human recordings.
Use one identified American-English speaker where possible. Letter names must
remain separate and are not required for this pilot. Do not stretch /t/ or add
a vowel after consonants. Do not concatenate isolated sounds and call the result
continuous blending. No word beyond these prerequisites is introduced.

The existing sample curriculum contains proposed audio IDs only. One licensed,
unmodified /æ/ reference candidate is now stored at `audio/reference/short-a.ogg`.
Its complete decode passed; it has not been listened to and is not approved for
runtime. Six additional Kokoro synthetic candidates were generated from explicit
phonemes in `audio/synthetic-candidates/`, with one complete inference per am
file. Provenance, rights, reproduction and listening limitations are documented
in `audio/SYNTHESIS.md`. No accepted four-phoneme pack or connected `am` asset
exists yet: actual listening remains open.
No audible playback, pronunciation review, physical-phone test or child trial
has been performed. Local generation was established using an isolated open
model runtime; there is no human-recording capability. Earlier checked sources and an original-recording
handoff are in [audio/README.md](audio/README.md).

Candidate references inspected:

- https://www.righttrackreading.com/soundpronunciationrtr.html
  links to `https://righttrackreading.com/sounds4mta.wav` (m, t, a) and
  `https://righttrackreading.com/sounds4sd.wav` (s, d). The provider describes
  these as pronunciation resources. These are grouped reference recordings,
  not verified isolated pilot assets or an `am` blending demonstration.
- https://phonicademy.com/printables/phonics-audio-pack
  describes native-voice pure phoneme recordings; its downloadable pack requires
  email submission. No email was submitted, account created or assets copied.
  https://phonicademy.com/phonemes is available for reference listening.

These descriptions do not establish speaker/accent, actual audible suitability
or permission to incorporate the recordings in this repository. No third-party
recordings from those two providers were committed and no external audio
dependency was added to a game. The separate Commons /æ/ reference above is
licensed CC BY-SA 3.0 with its credit and source documented.

Exit condition: a usable, rights-cleared sample with provenance and an actual
listening review of sounds and the complete blend. This production review is
outside gameplay: it must never become adult approval of a child's progression.

Immediate next action: listen to the generated six-cue review sheet and document
pronunciation acceptance or defects. Simon need not record/upload audio. Until then this gate
remains open; there is no playable reading pilot. Avoid repeating the source
search already documented in that handoff.

## 2. Learning engine

Implement m/s/a/t prerequisites and separate evidence types using
learning-model.spec.json: first independent response, hint/correction, known
item recall, visual matching and protected unseen transfer. Coin events never
update skill estimates. Parameters remain uncalibrated design assumptions.

The current transfer words require n/i/p and cannot run in this four-letter
slice. Do not relax prerequisites or silently label practiced words as novel.
Select a reviewed four-letter transfer item only after the audio/content gate;
otherwise report novel decoding as unassessed. No sentence mastery claims.

Exit condition: focused deterministic evidence, exposure and prerequisite tests.

## 3. One machine and interface

Implement four connections, immediate visible construction, touch/audio/motion
demonstration, success/error/help/correction and a different independent retry.
Large accessible icon buttons; tapping and keyboard alternative to sliding.
No long spoken guide, questionnaire, map or memory-run challenge.

Exit condition: one complete learning/building loop in a local preview.

## 4. Rewards and persistence

Implement coins, two visibly different selectable parts, a dedicated new storage
key, refresh/resume, atomic reward settlement and an explicit finish/continue
choice. Do not read or write legacy keys. No accounts or personal data.

Exit condition: focused double-action, refresh, resume and end-of-round tests.

## 5. Integrated verification and handoff

Check the complete loop, feedback, prerequisites, rewards, storage errors,
refresh, touch emulation and audio lifecycle. Report separately simulated tests,
actual audible review, physical Android/iPhone checks and child experience.
Commit only to codex/word-forge-reading-zero-20260930. Update ACTIVE and LOG,
release the lock and present a local/offline review artifact without deployment.

Each conversation starts from live ACTIVE and the remote branch, records its own
lock, preserves earlier work and ends with a checked commit and a released lock.
No merge, publication or navigation changes are authorized.

## Latest audio review feedback — 2026-09-30

Simon found normal/fast pace good but could not judge isolated sounds.
Created whole-word am, mat, sat samples at speed 1.0 for development listening.
Source and rights remain Kokoro/af_heart, Apache 2.0 model and MIT runtime.
The assistant performed technical checks only; whole-word clarity and isolated
phoneme acceptance remain open. No runtime or learning stage was enabled.

Simon subsequently listened to normal-speed am/mat/sat and reported "נשמע מעולה".
This accepts those whole words only. Isolated sounds and slow am still require
quality review; the comparison sheet pairs them with accepted words.
Stage 1 remains incomplete and no learning engine is authorized here.

After Simon reported a break, a complete am candidate at speed 0.8 was generated
for review instead of speed 0.5. Break location and audible correction remain
unconfirmed. No stage progression or runtime enablement.
