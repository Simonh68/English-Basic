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

## Still open — stage 3 acceptance

No rendered browser preview was possible: Chromium is absent and its download
returned invalid ZIP bytes. The DOM preview proves transitions, not layout,
contrast, native keyboard behavior, audible playback or touch behavior. No
browser-policy bypass was attempted. Verify one local rendered loop at 320px,
360x640, landscape and enlarged text, visible focus, touch and pause/audio
lifecycle before closing stage 3. Physical phone/child/perceptual tests remain
separate and have not been performed. Prior listening approval is preserved.

Next action: rendered local preview of this same version in a browser-capable
execution environment. Stage 4 remains unauthorized. Efficiency: reuse the
existing engine/audio tests and add only controller/DOM coverage for this slice.
