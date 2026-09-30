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

The source provenance is in `source.json`. `build.cjs` extracts the current canonical chunk rules rather than recreating curriculum. The detached pilot is published at https://englishfornoar.co.il/word-forge-memory/; the production game is untouched. This is an unvalidated pilot for classroom engagement/retention; the scoring formula alone does not prevent guessing near the zero floor. A real two-session student trial is needed before any claim about learning benefit.

### Verification in this build

- 12 focused engine/isolation tests passed, including 100 complete simulated runs, 750 item/challenge checks, uniform draw intervals, score floors, hints, spacing and restoration.
- The repository's existing main-tree suite passed 64/64 without source changes.
- DOM interaction checks passed in jsdom: a complete 15-word stage, review, point settlement, reload, hints, navigation, pause/resume, storage denial and corrupt-state recovery. `dom-check.cjs` requires jsdom as a development-only dependency.
- Visual/browser QA has **not passed or been performed**. Playwright could not start because no browser binary was installed; the attempted browser downloads were invalid/truncated. `ui-check.cjs` is saved for the next environment with Playwright and Chromium. It is not evidence of completed visual checks. A physical phone and actual TTS output remain untested.
- Initial development was unpublished. Detached hosting was subsequently authorized and completed; see the current handoff below.

### QA continuation — 2026-09-30

- The current stage button now resumes the existing run. Switching away from an unfinished run requires an explicit confirmation and shows the points that will be lost; completed-stage points remain protected.
- Moving to the next word/question brings the main content into view if it was scrolled above the viewport. This behavior is checked with a DOM geometry stub; actual phone layout is still unverified.
- Speech failures now have a visible, accessible message. Repeated playback cancels the older request, stale failures are ignored, and speech exceptions are handled. Muting clears the message; lottery/summary screens do not announce a hidden word when sound is enabled.
- Six new DOM regression tests cover those behaviors and suspension. Run `node --test pilots/word-forge-memory/qa-regressions.test.cjs` with jsdom available. The existing DOM checks now account for the intentional stage-switch confirmation.
- The browser opening of the local pilot returned `net::ERR_BLOCKED_BY_CLIENT`. No bypass was attempted. This is an environment limitation, not a verified game defect; browser rendering, physical phones, and audible speech remain open.
- See [QA-HANDOFF.md](QA-HANDOFF.md) for the specific manual checks and detached release boundary. No publication is authorized by this QA step.

Copyright © 2026 שמעון הרצל הלוי גובני (Simon Halevi). All rights reserved; third-party material retains its original rights.

### Guided interface — 2026-09-30

- New players receive a three-step playable example (cat) with unlimited, unscored attempts; it can be skipped or reopened from Help. Existing saves resume directly, and opening/closing the example does not change the active game.
- Stage 1 has one primary action. Later stages explain the two choices at the moment they appear, including whether the displayed word joins the pool, the additional possible prize, and possible point deduction. No multiplier jargon is required.
- Wrong or hinted answers offer an optional guided correction. It does not award/deduct points or count as independent recall; the normal delayed review remains queued.
- Large labeled controls, stacked phone choices for the two strategies, shorter feedback, contextual instructions, and a concise expandable rules panel replace the dense introduction. The four answer choices remain in a single row.
- Scoring engine, caps, vocabulary, storage key, and existing state format are unchanged. Only the optional guideSeen preference is added.
- Eleven focused DOM regressions and the full 15-word DOM flow pass. Browser layout, physical phone interaction, audible TTS, and testing with a child remain open; no usability outcome is claimed from DOM tests.
