# Stage 3 — one machine/interface

Baseline b64e7db3d77b70cc5d773a4cc53177fc0c42dced; DESIGN.md 1.1.
Implementation confined to this directory. No rewards, persistence, account,
analytics, legacy modules, merge, navigation changes or deployment.

## Behavior

`index.html` loads an isolated module interface. `session-controller.mjs` owns
one four-connection machine and uses the unchanged stage-2 LearningEngine.
Introduce m then s before a controlled two-choice task; introduce a/t separately
before their tasks. Completing teaching requires a learner-initiated approved
clip to finish. Silent/failed/cancelled playback cannot advance sound evidence.
Four completed tasks install four visible connections; assisted completion also
builds, without granting independent evidence. Machine completion never grants
M1/M2/M3. The wheel can be activated after completion, without evidence/reward.

First errors remain evidence. Help is marked before the answer is highlighted.
Correction stays supported; a later independent review changes task direction
(sound-to-letter to letter-to-sound), waits for three responses on other items,
and shuffles controlled choices. Audio-choice options are anonymous, listened
to separately, then confirmed with a separate button. Selecting requires both
options to have finished. Pending correction at round end gets at most eight
additional practice tasks; unresolved debt remains in the in-memory engine.
Three failed supported retries offer familiar visual matching or stopping,
so this UI does not force an endless correction loop. Visual matching is never
scored as phonological knowledge. No countdown or automatic next activity.

Sound only comes from the four accepted context phonemes. The unchanged adapter
still includes eight accepted assets; whole words/blending remain subject to
engine gates. This four-task first round cannot establish M1 prerequisites for
words, so it does not introduce am/mat/sat or manufacture a blending claim.

Native buttons support touch, mouse and keyboard activation; no gesture is
required. Touch targets are >=56px. English is LTR within Hebrew chrome.
Motion demo, four construction indicators, reduced motion and explicit pause
are present. Audio is serial, stopped on screen transition/pause/page hide;
hiding the tab pauses without autoplay on return. Failed playback has a visible
alert and a retry control. No teaching labels claim an audio option is correct.
The interface shows no probability or mastery percentage.

## Reproduce

Serve the repository locally, e.g. `python -m http.server 8765`, then open
`http://localhost:8765/pilots/word-forge-reading-zero/index.html`.
No hosting registration or publication is needed. Opening HTML directly via
file:// is not supported because modules/spec use local HTTP.

```sh
node --test pilots/word-forge-reading-zero/learning-engine.test.mjs pilots/word-forge-reading-zero/session-controller.test.mjs
# jsdom is development-only; install outside the repo, then:
RZ_DOM_MODULE=/absolute/path/to/node_modules/jsdom node --test pilots/word-forge-reading-zero/machine-dom.test.mjs
```

Verification: 18 unchanged engine tests, nine controller/audio tests and one
DOM integration test passed (28 total). DOM test uses simulated audio events,
checks full round, failed/cancelled teaching, pause/resume, first error and
correction, delayed opposite-direction review, reduced-motion control, accessible
button labels and absence of local-storage writes. Engine tests verify all eight
accepted asset hashes. No source audio, manifests or learning engine changed.

## Stage 3 acceptance — completed

A rendered Chromium local preview completed the four-connection loop using
simulated audio completion events. A second rendered pass exercised first error,
correction, touch emulation, native Enter activation, pause/resume and visible
focus. Screenshots were inspected for entry, prompt, error, corrected prompt,
completion and 200% zoom. At widths 320, 360, 640 and 720 CSS pixels the document
width matched the viewport; the 320px prompt also fit without horizontal scroll.
At desktop width 1280 and CSS zoom 2 the document width remained 1280.
All observed icon buttons were at least 56x56px. No page JavaScript errors.
Evidence screenshots: qa/entry-360.png and qa/complete-360.png.

Chromium was obtained as an npm development package containing a browser binary,
extracted locally without ownership changes and run with CPU rendering. The
original browser downloader remained unavailable; no site was deployed.
The first real-media pass did not advance teaching in this headless environment;
the successful visual pass explicitly simulated Audio events. This verifies
rendered interaction/layout, not audible playback. Existing approved assets and
listening acceptance remain unchanged. Physical phone and child tests, audible
runtime verification and empirical model calibration remain open for integrated
verification; no new perceptual approval is claimed.

Stage 3's complete local learning/building preview is now accepted. The next
scoped task is IMPLEMENTATION.md stage 4, rewards/persistence, only on Simon's
explicit instruction. No stage 4 implementation is included. Reuse the 28 tests
for the unchanged implementation; this checkpoint changes documentation and
captures only, with no runtime/audio/model changes.
