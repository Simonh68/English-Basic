# Stage 2 — isolated learning engine

Authorized by Simon for implementation and deterministic tests only. Based on
DESIGN.md 1.1, IMPLEMENTATION.md's small-conversation stage 2, and the unchanged
`learning-model.spec.json`. Baseline: `22faa0059f94c6e75136b351ef602b3b3eace4ea`.
This engine is not loaded by a game or a site. No machine, UI, reward, persistent
storage, merge or deployment is included. Audio manifests keep runtime disabled;
that flag describes game integration, not the completed listening approval.

## Scope and available evidence

| Activity | Evidence target | Limits |
| --- | --- | --- |
| Sound to letter / letter to audio choice | One specific m/s/a/t mapping | Recognition, not spoken production |
| Identical visual matching | None | Exposure/operation only |
| am blend to word / word to blend | Blending recognition | Only am has the approved moderate complete model; no oral-reading claim |
| am/mat/sat word to audio / missing letter | Known word recall | Prior exposure required; not novel decoding |
| Novel decoding | Unassessed | No approved held-out four-letter item |
| Word meaning | Unassessed | No reviewed semantic options |
| Sentence comprehension | Unassessed | No sentence tasks |

The adapter `learning-content.mjs` binds only eight already approved assets.
`at` lacks accepted whole-word audio and stays unavailable. n/i/p, all reserved
assessment forms and tan/pat stay unavailable. The original curriculum proposal
and all audio files/manifests remain unchanged. No new content approval or audio
generation is assumed. Third-party source/rights remain in audio/SYNTHESIS.md
and audio/licenses/; links there apply to the reused assets.

## API and integration contract

Import `LearningEngine` from `learning-engine.mjs`; pass the parsed unchanged
JSON specification and optionally a deterministic clock. No browser globals,
network, legacy module, filesystem or storage dependency exists in this engine.

1. `completeTeachingBlock(blockId, itemId, {learnerActed:true})` records active
   teaching and applies a transition once per block. Passive exposure uses
   `expose`. Introduce m/s/a/t in the specified order, one new mapping per block.
2. `availableActivities()` returns activities permitted now. Word teaching and
   word tasks require current M1 on every required mapping. All distractors must
   also be taught/eligible; callers cannot supply unreviewed transfer content.
3. `begin(activityId, {optionCount, optionItemIds})` allocates one local encounter
   and captures pre-presentation exposure and prediction. Every written option
   consumes its exposure, including distractors. No second encounter can open.
4. `playOption` plays an answer option in an audio-choice task without making it
   a hint. In other tasks it marks support. `support` must be called **before**
   showing a target solution, removing an option or reading the target through
   accessibility. Direct target `expose` during a prompt also marks support.
5. `respond(encounterId, correctBoolean)` accepts only a scored outcome, not
   answer text. The future controller compares the selection with the task's
   canonical target. Only the first response before help is independent. A first
   error remains evidence; all subsequent attempts are supported. A correct
   response settles the encounter; reuse of the ID fails. `abandon` queues review.
6. `report(target)` returns evidence-only q, the parameter-grid minimum qLow,
   readiness (practice advice only), coverage, current gates, historical
   milestones and window sensitivities. `inspect` returns a detached diagnostic
   copy of in-memory state. Neither API grants mastery by changing the returned
   object. Do not display q as calibrated certainty.
7. `nextPractice` returns advice: resume, correction after three other responses
   or a new session, due review, reduce to two choices after two component errors,
   next mapping teaching, or familiar practice/finish after three supported
   failures on one item. `newSession` marks a new local session; time alone does
   not create evidence. The future session controller owns screen transitions.

First diverse mapping/direction evidence has weight 1; repeated known material
has .25 maximum per item/family/session; a repeat after one day has .5. These
weights are fixed before correctness and deliberately cap same-template farming.
Assisted responses have zero weight and do not evict evidence. All word tasks
in this slice are already exposed, so none receive novel-word weight or flags.
Correction debt delays counted evidence until three responses on other items or
another session. Successful independent evidence schedules 1/3/7-day review;
errors reset that schedule. Timing values remain uncalibrated design assumptions.

Evidence windows retain up to 12 effective units, with fractional oldest-event
boundaries and 10/12/16 sensitivity outputs. Bayesian updates use weighted
log-odds; qLow is the minimum of the specified parameter grid, not a confidence
interval. Learning transitions affect readiness only. Gates use evidence-only
q and qLow plus within-window coverage. One mapping cannot cover another.

M2's six-unique-item requirement cannot be met by three exposed words or by one
mapping. M3 cannot pass without new transfer evidence; there is none here.
The engine does not lower these thresholds to manufacture mastery. Historical
milestones are retained if later evidence reduces a current gate. The unavailable
skill states explicitly remain unassessed, even when mapping performance is high.

Only local item/encounter counters, boolean results, support, exposure, timing,
model state and aggregate predictive Brier/bin sums are held in memory. No
answer text, learner identity, recording, analytics or remote export is added.
Persistence and recovery are stage 4 work; no refresh/resume claim is made here.

## Verification

Run from repository root:

```sh
node --test pilots/word-forge-reading-zero/learning-engine.test.mjs
```

18 tests cover documented Bayesian arithmetic, equal-weight errors, fractional
windows, prerequisite and distractor enforcement, teaching idempotence, hint
and correction farming, settled encounters, option/target audio distinction,
review spacing, repeated-item caps, visual matching, component isolation,
unassessed transfer/meaning/sentences, partial knowledge, pre-answer predictions,
parameter/window sensitivity, and deterministic guessing/side/hint simulations.
All eight accepted audio SHA256 hashes are checked. Simulations verify logic;
they do not demonstrate learning effectiveness, model calibration or the absence
of all possible false positive mapping gates. Phone, child and perceptual QA
are not part of stage 2. The assistant has not listened.

Next scoped task: IMPLEMENTATION.md stage 3, one machine and interface using this
engine and the accepted assets. Stage 2 does not authorize that task or publishing.
