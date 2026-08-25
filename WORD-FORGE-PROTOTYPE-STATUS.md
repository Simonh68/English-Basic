# English Basic — Word Forge

## Track identity

- Track ID: `EFN-EB-WORD-FORGE-PROTOTYPE-20260825`
- Scope: approved prototype adopted as a production game in English Basic
- Repository: `Simonh68/English-Basic`
- Development branch: `codex/word-forge-prototype-20260825`
- Current development branch: `codex/word-forge-pedagogical-progression-20260826`
- Base commit: `045001cf3fd986cf922b7f29d272e4c4d42bd727`
- Initial production integration commit: `befecba7347eda552c48bc9999a367a153b319d1`
- Live route: `https://simonh68.github.io/English-Basic/word-forge/?level=1&lesson=1`

## Production behavior

Word Forge is a compact arcade spelling loop connected to the canonical English Basic curriculum:

1. The URL selects one of 5 levels and 10 lessons per level.
2. The game reads the exact 10 target words and 5 transfer words for that stage from `curriculum-data.js`.
3. A normal stage runs as three uninterrupted five-word rounds: two target rounds and one transfer round. Words are randomized inside each round without mixing transfer items into initial teaching.
4. Each word is heard, spelled in English and followed by one spelling check. Level 1 uses missing letters; later levels use curated graphemes, spelling chunks and morphemes when the word supports them, with a safe single-letter fallback.
5. Every missing-letter challenge uses the same 10-second limit; success never shortens the next challenge.
6. Response speed changes the reward inside that fixed window: up to 3 seconds adds 5 coins, up to 6 seconds adds 2 coins, and a later correct answer keeps the regular stage reward.
7. Fast, steady and slow correct responses receive audibly distinct success cues while preserving the approved four-step success sequence.
8. A visible timer control removes the deadline and automatic timeout without removing the learning task; untimed success keeps the regular stage reward.
9. A missed word returns after two other words, with corrective feedback and no score penalty.
10. After the corrected word and its pronunciation, a green three-second bar advances automatically; the learner can press `▶` to continue immediately.
11. The accumulated score uses a prominent silver-coin treatment. A curated 2-letter chunk adds 1 base coin, a 3-letter chunk adds 2 and a 4+-letter chunk adds 3; speed bonuses remain separate.
12. Stage 4.1 treats `ough` as one four-letter unit and groups its 15 words into five pronunciation-family rounds of 3/5/2/2/3.

## Product constraints

- Keep the opening on one compact screen with Play-first navigation and minimal Hebrew copy.
- Keep `en-US` as the preferred speech language.
- Do not use Hebrew speech. Hebrew remains only as a short visual meaning cue and accessibility text.
- Use synthesized musical/ringtone cues and animated arcade feedback for question, success and retry states.
- Preserve every stage's exact 10 target and 5 transfer words. Randomize within pedagogical rounds, not across the teaching/transfer boundary.
- Select chunks only from a curated stage plan; never turn arbitrary adjacent letters into a learning unit.
- Do not present `ough` as one sound. Highlight the spelling unit and pronounce the complete word.
- Never select punctuation as the missing letter in contractions such as `I'm` or `can't`.
- Keep the existing Listen & Find game available separately.

## Privacy and accessibility constraints

- No account, name, email, fingerprint, typed free text, recording or answer transmission.
- No analytics script, network request or persistent learner profile in Word Forge.
- Keyboard-operable controls, visible focus, `aria-live` feedback, Hebrew-first accessibility labels and English language markup.
- Respect `prefers-reduced-motion`, `prefers-contrast` and `forced-colors`.

## Files

- `word-forge/index.html` — production route backed by the 50 canonical lesson groups.
- `WORD-FORGE-PEDAGOGY.md` — research-grounded stage, round, chunk and reward specification.
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
- [x] Local pedagogical-progression candidate implemented on 26 August 2026; 33/33 repository tests pass, including chunk, OUGH-family, silver-score and three-second feedback checks.

## Current publication state

The last published version on `main` keeps the approved fixed ten-second speed tiers. The pedagogical rounds, curated multi-letter chunks, silver score treatment, difficulty bonus and three-second feedback bar are implemented only on `codex/word-forge-pedagogical-progression-20260826` and have not been published.

## Next action

Complete local verification, record the local commit and request explicit publication approval. Do not publish this candidate without a new approval.
