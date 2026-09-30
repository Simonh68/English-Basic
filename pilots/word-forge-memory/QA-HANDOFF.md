# Word Forge Memory Run — QA handoff

Continuation of the existing 0.1 pilot, 2026-09-30. Source baseline: `5e8b27403b7cc855b1ed945b37263f7f236cec7e`.

## Completed in this continuation

- 18 engine/DOM regressions passed: the original 12 engine/isolation checks (including 100 games and 750 item plans), plus six interaction/speech-lifecycle regressions.
- The separate DOM scenario completes all 15 words, refreshes safely, keeps the committed random choice, exercises hint/review/pause/resume, and leaves production-storage sentinel data unchanged.
- Source changes are confined to `pilots/word-forge-memory`. Scoring, content, caps, and production runtime are unchanged.
- Standalone build is reproducible with `node pilots/word-forge-memory/build.cjs`. No external assets, analytics, or production-progress access are added.

## Still open: actual browser, phone and audio

The available browser rejected navigation to the local preview with `net::ERR_BLOCKED_BY_CLIENT`. No rendered screenshot or real audible speech result is available. DOM simulations cannot establish typography, tap comfort, viewport behavior, voice quality or educational engagement.

Open the standalone HTML in a real browser and check:

1. On the phone, view portrait and landscape: the word, four answer choices, points, and six cards should be legible with no horizontal scrolling. Test desktop too.
2. Complete a short first-stage question. In stage 5, save six words and experience the lottery; the possible prize is 183. Answer incorrectly at least once, then complete review. Confirm the difference between possible prize and earned points is clear.
3. Scroll down to the action buttons, save another word, and confirm the new word comes into view. Open the stage picker: current-stage selection preserves the run; switching away explains the loss and can be cancelled.
4. Enable sound, listen to a few words including a longer word, press replay rapidly, mute, lock the phone/switch apps, and return. No speech should continue in the background or restart until the player acts. Verify the device voice is clear English; an American voice is preferred when installed.
5. Refresh during a question and after completion. The same question and earned points should remain. If the browser blocks file-based storage, a visible warning is expected; the game must still run.

Any issue should be reported with stage, action and screenshot where useful; no student names, recordings or typed answers are needed.

## Prepared release boundary — not published

After manual checks, publication still requires Simon's explicit instruction. Publish only the built standalone `dist/index.html` at an agreed detached destination. Do not merge the pilot into the existing site, edit its homepage/navigation/sitemap, reuse production progress keys, or change DNS. Retain `noindex,nofollow` and storage key `efn:wf-memory:pilot:v1`.

The exact hosting destination is not selected or provisioned in this task. A hosted-device smoke check will still be required after any authorized deployment. No promise of improved engagement or retention is supported without a student pilot.

## Guided interface follow-up

New user: try the cat example, choose a wrong letter, recover, then start the real stage. Existing user: resume the saved question directly, reopen the example from Help, and return to the same question.
After an actual wrong/hinted answer, use “ננסה שוב יחד”: the assisted correction must not change points or independent-success counts, and the word must still return in delayed review.
Check the simplified stage-1 action and the two strategy buttons in later stages on a physical phone. Eleven focused DOM regressions and the complete 15-word flow pass; rendered browser/phone and audible speech checks are still open.
