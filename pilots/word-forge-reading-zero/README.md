# Word Forge Reading Zero design

Current checkpoint: audio sample stage 1 and isolated learning-engine stage 2
are complete. See [ENGINE.md](ENGINE.md) for the tested engine and its limits.
The planning-only statements below describe the original design delivery.
Next is small-conversation stage 3 (one machine/interface), requiring its own
scope authorization. No playable game, persistent storage or deployment exists.

Planning-only deliverable authorized by Simon Halevi on 2026-09-30.

Read [DESIGN.md](DESIGN.md) for the full Hebrew game design, curriculum,
screen specification, reward and probabilistic learning models, staged implementation plan,
and small child pilot protocol.

The selected direction is a visible machine-building forge. Memory-risk cards
are an optional later activity. The proposed first slice teaches letter–sound
relationships and blending before testing unseen words. Touch responses are
not represented as direct measurement of spoken reading. Following Simon's
clarification, no adult participates in gameplay or validates progression.
Progression is inferred autonomously from diverse, spaced, unseen-item evidence
with explicit guess/slip assumptions, sensitivity checks and coverage gates.

## Contents

- `DESIGN.md`: complete design version 1.1 and seven primary/professional references.
- `curriculum-pilot.sample.json`: proposed content and assessment pools; not
  approved production curriculum. Audio identifiers are specifications, not
  existing recordings. Assessment forms still require balancing.
- `provenance.json`: verified commits, source hashes, live-content match and
  explicit QA limitations.
- `learning-model.spec.json`: planning specification for Bayesian evidence
  updates, parameter sensitivity and automatic progression gates; not a runtime.

## Isolation and next step

Branch: `codex/word-forge-reading-zero-20260930`.
Base: `5dcb8971780bd370de528277baf6d740e5bbb837` from the existing memory pilot.
Only this directory is added. No game runtime, hosting configuration, existing
curriculum, navigation or storage has been changed. No merge or deployment is
authorized by this planning step. No new playable URL exists.

Next, only after a further implementation instruction: review the small
`m/s/a/t` content and sound sample, then build one machine and one complete
learning loop. Do not expand all 50 legacy stages at once.

Existing memory-pilot physical-phone, audible-audio and child-comprehension QA
remains open. This document does not close it.

Copyright © 2026 Simon Halevi. Third-party sources retain their rights.
