# English Basic — Word Forge prototype track

## Track identity

- Track ID: `EFN-EB-WORD-FORGE-PROTOTYPE-20260825`
- Scope: local, isolated prototype for the existing spelling reader
- Repository: `Simonh68/English-Basic`
- Branch: `codex/word-forge-prototype-20260825`
- Base commit: `045001cf3fd986cf922b7f29d272e4c4d42bd727`
- Primary project status document: unchanged
- Public `main` and live GitHub Pages site: unchanged

## Product hypothesis

The current word → letter-by-letter spelling → word routine is pedagogically valuable but passive and repetitive. A lightweight game layer should increase attention without replacing the routine or rewarding empty swiping.

The prototype tests a single reward system, **Word Forge**:

1. Every demonstrated spelling success powers one visible forge segment.
2. Every word is followed by one short focus check with a large Hebrew meaning cue.
3. A correct focus check awards a precision spark, advances a session-only chain and triggers strong visual and audio confirmation.
4. A missed word returns after two other words, with immediate corrective feedback and no punishment.
5. The final reward is a completed learner-chosen build, not coins, a leaderboard, random loot, or a daily-loss streak.

## Pedagogical constraints

- Preserve the spoken word → spoken letters → spoken word sequence.
- Keep `en-US` as the preferred speech language.
- Use retrieval with corrective feedback only after initial exposure.
- Tie rewards to attention, correction and mastery rather than time-on-screen.
- Keep the full routine bounded: ten words and ten brief checks, one immediately after each exposure.
- Do not introduce public ranking or comparison between students.
- Use a stable cue rhythm: three rising tones, a short pause, a spoken Hebrew hint and then an enabled response.
- Reinforce every answer with an unmistakable success or retry sound, short Hebrew speech and the English word.
- Prefer large icons, build pieces and animation over explanatory text for learners who struggle with Hebrew reading.

## Privacy and accessibility constraints

- No account, name, email, fingerprint, typed free text, recording or answer transmission.
- No analytics script in the prototype.
- No persistent learner profile in this local prototype.
- Keyboard-operable controls, visible focus, `aria-live` feedback, Hebrew-first instructions and English language markup.
- Respect `prefers-reduced-motion`, `prefers-contrast` and `forced-colors`.

## Files in this track

- `prototypes/word-forge/index.html` — standalone interactive prototype.
- `prototypes/word-forge/word-forge-v4.html` — standalone cache-busting review copy of the latest mobile/audio revision.
- `tests/word-forge-prototype.test.mjs` — structural and privacy regression checks.
- `WORD-FORGE-PROTOTYPE-STATUS.md` — this secondary tracking file.

## Milestones

- [x] Isolated branch created from the verified live `main` commit.
- [x] Secondary tracking file created.
- [x] Functional prototype implemented.
- [x] Static checks passed.
- [x] Second iteration adds Hebrew assessment cues, per-word testing, audio signatures and animated feedback.
- [x] Third iteration adds an explicit sound check, HTML-audio tone fallback and speech timeout recovery for embedded mobile previews.
- [x] Fourth iteration makes game cues substantially louder, falls back to working English speech when a Hebrew device voice is unavailable, and compresses the mobile forge into a 106px reward strip.
- [ ] Desktop and mobile primary flow checked in a browser.
- [ ] Simon review completed.
- [ ] Decision made whether to adapt the mechanism to the production spelling reader.

## Current publication state

Local only. No push, merge, checkpoint or public deployment is authorized or completed.

## Next action

Present the revised local prototype to Simon for review. The second iteration follows his hands-on feedback: Hebrew meaning during assessment, rising pre-question tones, strong positive and corrective audio, more animation after every word, and less instructional copy. Code and structural checks are rerun after this iteration; interactive browser QA remains open because the cloud browser cannot open local or data-URL content. Any upload, merge or publication requires a separate explicit instruction.
