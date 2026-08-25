# English Basic — Word Forge

## Track identity

- Track ID: `EFN-EB-WORD-FORGE-PROTOTYPE-20260825`
- Scope: approved prototype adopted as a production game in English Basic
- Repository: `Simonh68/English-Basic`
- Development branch: `codex/word-forge-prototype-20260825`
- Base commit: `045001cf3fd986cf922b7f29d272e4c4d42bd727`
- Initial production integration commit: `befecba7347eda552c48bc9999a367a153b319d1`
- Live route: `https://simonh68.github.io/English-Basic/word-forge/?level=1&lesson=1`

## Production behavior

Word Forge is a compact arcade spelling loop connected to the canonical English Basic curriculum:

1. The URL selects one of 5 levels and 10 lessons per level.
2. The game reads the exact ten-word group for that lesson from `curriculum-data.js`.
3. Every Play uses Fisher–Yates randomization on a copy of the group and guarantees a visibly different first word from the previous run.
4. Each word is heard, spelled in English and followed by one missing-letter check.
5. Every missing-letter challenge uses the same 10-second limit; success never shortens the next challenge.
6. Response speed changes the reward inside that fixed window: up to 3 seconds adds 5 coins, up to 6 seconds adds 2 coins, and a later correct answer keeps the regular stage reward.
7. Fast, steady and slow correct responses receive audibly distinct success cues while preserving the approved four-step success sequence.
8. A visible timer control removes the deadline and automatic timeout without removing the learning task; untimed success keeps the regular stage reward.
9. A missed word returns after two other words, with corrective feedback and no score penalty.

## Product constraints

- Keep the opening on one compact screen with Play-first navigation and minimal Hebrew copy.
- Keep `en-US` as the preferred speech language.
- Do not use Hebrew speech. Hebrew remains only as a short visual meaning cue and accessibility text.
- Use synthesized musical/ringtone cues and animated arcade feedback for question, success and retry states.
- Preserve every lesson's exact ten words while randomizing their order for each run.
- Never select punctuation as the missing letter in contractions such as `I'm` or `can't`.
- Keep the existing Listen & Find game available separately.

## Privacy and accessibility constraints

- No account, name, email, fingerprint, typed free text, recording or answer transmission.
- No analytics script, network request or persistent learner profile in Word Forge.
- Keyboard-operable controls, visible focus, `aria-live` feedback, Hebrew-first accessibility labels and English language markup.
- Respect `prefers-reduced-motion`, `prefers-contrast` and `forced-colors`.

## Files

- `word-forge/index.html` — production route backed by the 50 canonical lesson groups.
- `prototypes/word-forge/index.html` — approved standalone prototype.
- `prototypes/word-forge/word-forge-v4.html` — stable standalone review copy.
- `tests/word-forge-integration.test.mjs` — production curriculum, navigation, punctuation and privacy checks.
- `tests/word-forge-prototype.test.mjs` — prototype structure, audio, randomization and privacy checks.

## Milestones

- [x] Functional standalone prototype implemented.
- [x] One-screen V5 arcade opening and nonverbal musical feedback approved by Simon.
- [x] Visible per-run word randomization implemented and verified.
- [x] Production route connected to all 50 lesson groups.
- [x] Lesson and home navigation integrated while preserving Listen & Find.
- [x] Automated test suite passed: 16/16 tests, including 35 prototype assertions.
- [x] Live browser flow verified for opening layout, Play, randomized lesson data and lesson-to-game navigation.
- [x] Simon explicitly approved integration and publication.
- [x] Production published to `main` and verified on GitHub Pages on 25 August 2026.

## Current publication state

Live and verified. Word Forge is available from the home hero and from the opening and completion cards of every lesson. The live game receives `level` and `lesson` URL parameters, loads that lesson's ten words, and returns to the same lesson.

## Next action

Collect classroom feedback. No implementation or publication blocker remains.
