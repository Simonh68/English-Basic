# Audio production handoff — stage 1 remains incomplete

**Current route:** Simon instructed the assistant to generate audio, with no
user recording upload. Six synthetic candidates now exist. See
[SYNTHESIS.md](SYNTHESIS.md) for provenance, reproduction and the listening gate.
The original-recording instructions below are a fallback, not Simon's next task.

Development assets only. No game, learning engine or machine is implemented here.
DESIGN.md 1.1 remains unchanged. Adult listening review is production QA only;
it must never gate a child's progression or require an adult inside gameplay.

## Concrete sample obtained

`reference/short-a.ogg` is an unmodified human recording of [æ] attributed to
Denelson83, from Wikimedia Commons. It is a reference candidate, **not an
approved American-English pilot voice**. No actual listening review was possible
in this session. No accent or audible quality is inferred from file metadata.

- Source: https://commons.wikimedia.org/wiki/File:Near-open_front_unrounded_vowel.ogg
- Original bytes: https://upload.wikimedia.org/wikipedia/commons/c/c9/Near-open_front_unrounded_vowel.ogg
- License selected: CC BY-SA 3.0, https://creativecommons.org/licenses/by-sa/3.0/
- Credit: “Near-open front unrounded vowel” — Denelson83, Wikimedia Commons,
  CC BY-SA 3.0. No changes. No endorsement implied.
- Retrieved: 2026-09-30. Source describes a phonetic sample, not an identified
  American-English phonics narrator. Different source speakers cannot establish
  a consistent voice pack.
- SHA-256: `f95bf6b3f9ad1daba7c056d46e5fb1920885ddccb68cb4af19eb19ca36d033d7`
- Technical check: Ogg Vorbis, mono, 44,100 Hz, 0.706304 seconds, 14,961 bytes;
  ffprobe read and complete ffmpeg decode passed. This proves decodability only.

There is no TTS, no concatenation and no generated blend. This reference must
not be wired to runtime audio IDs before listening acceptance.

## One original recording to obtain

Ask one consenting speaker, preferably a native American-English speaker, for
one quiet recording of the following six cues, with about a second between cues:

| Cue | What to record | Reject if heard |
| --- | --- | --- |
| /m/ | A sustained /m/ with closed lips, about 0.8 seconds | “em”, “muh”, a vowel tail |
| /s/ | A sustained /s/, about 0.8 seconds | “ess”, “suh” |
| /æ/ | The short vowel in “cat”, about 0.8 seconds; do not say “cat” | “ay”, a different vowel, a spoken keyword |
| /t/ | One brief /t/ release, without prolonging it | “tee”, “tuh”, repeated releases |
| am, slowly connected | /æ/ flowing directly into /m/, about 1.5 seconds total, in ONE utterance | A pause or new onset between sounds; joined clips |
| am, naturally | One whole-word stressed /æm/ after a short pause | Letter names, “A.M.”, an unstressed schwa |

The notation “aaaammmm … am” is a **written recording cue**, not audio and not
text to feed to TTS. A single recording can later be split at cue boundaries;
the connected /æm/ must remain one original utterance, with its transition intact.
Do not add a vowel to /t/. No music, spoken lesson or extra example words.
Phone voice recorder is sufficient for a first take; send the original file.

## Permission needed with the original recording

The following is a proposed permission, **not consent already obtained**:

“I made this recording and hold the necessary recording rights. I consent to
English for Noar using my recorded voice, editing these clips, storing and
redistributing them in its repository and educational software, including future
commercial versions, worldwide without a usage fee. No voice cloning is allowed.
Credit me as: [agreed credit or anonymous].”

If the recordist and speaker are different people, obtain the necessary consent
from both. Keep personal contact details out of the public repository. Record
only the agreed public credit, permission scope/date and asset hashes there.

## Acceptance after receipt

1. Preserve the original take and document speaker/rights provenance.
2. Decode and inspect clipping, silence and format; trim cue boundaries only.
3. Actually listen to every cue and the complete am transition, then document
   reviewer, date, verdict and any correction. Waveforms/ASR are not listening.
4. Verify playback of the accepted delivery files on a phone. Report separately
   from pronunciation acceptance and from any future child trial.

Current status: technical inspection of one reference passed; actual listening,
four accepted phonemes, connected am plus natural am, and phone playback remain
open. Stage 2 must not start on the strength of this reference file.

## Other sources checked — do not repeat this search blindly

- Right Track Reading: https://www.righttrackreading.com/soundpronunciationrtr.html
  gives grouped m/t/a and s/d recordings for reference. No explicit incorporation
  permission was established. No bytes copied into the repository.
- Phonicademy: https://phonicademy.com/printables/phonics-audio-pack advertises
  pure-sound files. https://phonicademy.com/term does not establish permission to
  redistribute the downloadable pack in this game. No email or account submitted.
- Wikimedia /m/: https://commons.wikimedia.org/wiki/File:Bilabial_nasal.ogg
  credits Peter Isotalo and offers CC BY-SA 3.0. Not listened to; not imported.
- Wikimedia /s/: https://commons.wikimedia.org/wiki/File:Voiceless_alveolar_sibilant.ogg
  describes [sa asa], not a pure isolated /s/. Do not use untrimmed as /s/.
- Wikimedia /t/: https://commons.wikimedia.org/wiki/File:Voiceless_alveolar_plosive.ogg
  describes [ata], not a pure isolated /t/. Do not use untrimmed as /t/.
- FreeReading: https://freereading.org/wiki/Most_common_letter_sounds_(audio_clips).html
  exposes single-letter sound files. Its linked Terms of Use cover audio under
  CC BY-SA 3.0, with attribution, but also disallow automated access without
  written permission. After reading those terms, no further automated access or
  downloads were made. No blend asset or narrator identity was established.

Efficiency: obtain one original, permission-backed take for all six cues rather
than continuing a broad search or mixing voices and guessing transitions.
