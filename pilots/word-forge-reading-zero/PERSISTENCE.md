# Stage 4 — rewards and persistence

Completed on 2026-10-03 after Simon's scoped approval. DESIGN.md 1.1, the
approved learning engine, specification, content adapter and eight audio assets
remain unchanged. No merge, hosting deployment or navigation change.

Correct first independent mapping responses earn two coins; supported/corrected
responses and visual matching earn one. Settlement is keyed by engine outcome
ID and repeated actions cannot pay twice. Coins never update learning estimates.
Two parts cost four coins each: a rotating fan and a rocking paddle. Owned parts
can be selected again without payment. Finish retains the completed machine;
continue explicitly opens a new four-connection round in the other direction.

The sole storage key is `efn:wf-reading-zero:pilot:v1`. One versioned localStorage
write includes the engine operation journal, evidence, machine phase, coin ledger,
owned/selected parts and reduced-motion preference. Replaying the journal with
its original clocks reconstructs the unchanged engine. No learner account,
personal identifier, typed answer, selected answer or recording is stored.
Pending options and prior help/errors survive refresh; audio and uncommitted
selection do not resume automatically. Hidden pages pause. The saved journal
has a 20,000-operation validation limit and the envelope a 2 MB read limit; this
is a small pilot store, not indefinite learner tracking.

Invalid/future saves are retained and temporary play is clearly labelled.
Only an explicit two-step reset deletes the pilot key. Denied/quota storage
shows temporary progress. A changed save in another tab blocks stale actions and
offers loading the latest copy. Legacy keys are never read or written. Writes
are atomic for one tab; concurrent tabs use stale-copy detection rather than a
cross-tab transaction lock. Simultaneous writes in the same instant are not a
supported multi-user workflow. Manual edits to browser storage are not secure.

Verification: 39 tests passed (18 engine, 9 controller/audio, 11 persistence,
1 DOM integration). Focused Chromium touch-emulation checks passed for the four
connections, refresh, idempotent purchases, both visible parts, finish/reopen,
continue, saved support, two-tab conflict, corrupt-save preservation, two-step
reset, quota warning and legacy preservation. Widths 320/360/640/720 fit without
horizontal scroll; no JavaScript errors. Screenshot: qa/rewards-360.png.
Audio completion was simulated; no new audible, physical-phone or child review
is claimed. Existing audio acceptance remains valid. Stage 5 integrated
verification and handoff requires a separately scoped instruction.

Run code checks with Node and jsdom available:
`node --test learning-engine.test.mjs session-controller.test.mjs persistence.test.mjs machine-dom.test.mjs`.
The DOM test resolves jsdom via the environment (NODE_PATH may point to its
installation); it is a development-only dependency, not a runtime package.
