# Word Forge — Memory Run (detached pilot 0.1)

An independent experiment authorized by Simon on 2026-09-30. No existing runtime, homepage, navigation, curriculum, analytics, or progress record is modified.

## Build and play

From the repository root:

```sh
node pilots/word-forge-memory/build.cjs
node --test pilots/word-forge-memory/engine.test.cjs
```

Open `pilots/word-forge-memory/dist/index.html` in a modern browser. This standalone file embeds the canonical curriculum and speech runtime. It has no external assets or analytics. Speech depends on device voices. If file URLs do not support local storage in the chosen browser, the app reports that progress cannot be saved.

## Rules

- All 50 canonical stages and all 15 words per stage are preserved, including the OUGH sound-family sequence and approved grapheme/morpheme plans.
- OUGH risk pools also stop at the end of each approved sound family, even when the six-word ceiling has not been reached.
- In the first five **chronological stages**, caps are 1, 3, 4, 5, 6. Later stages keep six. These refer to stages, not the five curriculum levels. Stage 1 is an introductory one-card challenge with no fake lottery and no deduction.
- Study a word, test immediately for 10, or add it to the memory pool. Previously deferred words stay face-down. When a pool exists, “challenge” draws only from that pool; the displayed next word joins only on an explicit defer action. On reaching the cap or end of the lesson, the challenge starts automatically.
- A uniformly selected word is committed before the short reveal animation. Reload cannot reroll it. Every question has four distinct options; the approved canonical missing-letter or missing-chunk rule is retained.
- Successful pool reward: `round(10*n*1.25**(n-1))`; maximum deduction on a wrong answer is `ceil(reward/2)`, limited to current-run points. Stored points from completed stages are protected. The same challenge can settle only once. Ordinary and review questions have no deduction. A reveal hint explicitly awards zero and schedules independent review.
- Nonselected words and errors enter the review queue. Corrective retries wait for two other question responses. At least one review is interleaved after each challenge when eligible; a large queue is drained more actively. Remaining words are covered before completion. A stage completes only when all 15 words have an independent correct answer and no review remains.
- The separate “two spaced successes” measure requires two independent correct responses separated by at least two responses to other items. This is a practice measure, not a long-term mastery claim. Replay offers further retrieval without redefining a random sample as mastery of the whole pool.
- Sound and reduced motion are optional. Questions have no timer. No automatically recurring reward loop, background music, names, recording, answer text, tracking, or network requests are added.
- Progress uses ONLY `efn:wf-memory:pilot:v1`. Existing Word Forge progress is neither read nor written. Stored state includes aggregate correctness and the open challenge, never the student's selected answer.

## Scope and remaining validation

The source provenance is in `source.json`. `build.cjs` extracts the current canonical chunk rules rather than recreating curriculum. The published sites are untouched. This is an unvalidated pilot for classroom engagement/retention; the scoring formula alone does not prevent guessing near the zero floor. A real two-session student trial is needed before any claim about learning benefit.

### Verification in this build

- 12 focused engine/isolation tests passed, including 100 complete simulated runs, 750 item/challenge checks, uniform draw intervals, score floors, hints, spacing and restoration.
- The repository's existing main-tree suite passed 64/64 without source changes.
- DOM interaction checks passed in jsdom: a complete 15-word stage, review, point settlement, reload, hints, navigation, pause/resume, storage denial and corrupt-state recovery. `dom-check.cjs` requires jsdom as a development-only dependency.
- Visual/browser QA has **not passed or been performed**. Playwright could not start because no browser binary was installed; the attempted browser downloads were invalid/truncated. `ui-check.cjs` is saved for the next environment with Playwright and Chromium. It is not evidence of completed visual checks. A physical phone and actual TTS output remain untested.
- No publication was performed. The next step is browser/phone verification of the standalone artifact, followed by explicitly authorized detached hosting if desired.

Copyright © 2026 שמעון הרצל הלוי גובני (Simon Halevi). All rights reserved; third-party material retains its original rights.
