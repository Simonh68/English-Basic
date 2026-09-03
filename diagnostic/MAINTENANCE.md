# English diagnostic maintenance

The diagnostic lives at `/diagnostic/` and is intentionally not linked from the public home page yet.

## Fixed-level policy

- The student sees a level-check flow: basic word recognition, vocabulary, and—only when the entry threshold is met—reading comprehension and one final A/C/E/G level.
- The level check never exposes Core/Band coverage, intermediate levels, or item feedback. Direct group labels appear only in the final recommendations.
- The opening asks for no class or unit-track information. The result never identifies the level as a Bagrut questionnaire.
- Every vocabulary item keeps its source band: Core I, Core II, or Band III.
- Core I and Core II use the reviewed Hebrew meanings. Band III uses the exact English `support_text` definition from the canonical database.
- The level check excludes gender/sexuality content from every band. Band III sampling also excludes short single words and entries duplicated in Core I/II, because those items do not distinguish an advanced vocabulary level reliably.
- Every reading passage and question keeps its reviewed level: A, C, E, or G.
- Runtime performance never changes an item's level. An unsuitable item is retired or replaced during editorial review.

## Short form and scoring

- Basic word recognition: 6 items. Bus, cat, and dog always appear first; three longer familiar words then rotate from the bank.
- Vocabulary: 4 items from each fixed band, 12 items total.
- The vocabulary stage always follows through an explicit continue button; the first stage never announces pass/fail.
- Reading opens only when the student answers at least 70% of the basic items and at least 50% of the Band II Core I vocabulary items correctly.
- Below that threshold, the result contains no A/C/E/G rating and recommends vocabulary work only. If basic word recognition also needs work, Word Forge appears in its own separate section.
- Reading: one passage at each level needed by the vocabulary-guided route, with up to three passages total.
- Total length is 18 questions without reading, or 22–30 questions when reading opens, depending on the reading route.
- Vocabulary and foundational-reading questions have a hard 30-second limit. Reading-comprehension questions have a hard 5-minute limit.
- When either limit expires, the unanswered question receives 0 and the level check advances automatically. Each correct answer is worth 4 points inside its limit and 5 points in the first half. Incorrect, skipped, or timed-out answers receive 0.
- The reading route starts from vocabulary coverage: below Core I starts and ends at A; Core I starts at A and may advance to C; Core II starts at C but never advances to E; Band III starts at E and may move to G, C, or A according to reading performance.
- Every reading passage contains exactly three staged paragraphs. Questions 1–3 each show only their own paragraph; Question 4 shows all three paragraphs and asks about the whole text.
- The final A/C/E/G level is shown only after a vocabulary-gated reading route is completed.
- Recommendations link directly to the next Core I group saved on the device when that progress exists, otherwise to the first relevant vocabulary group. Word Forge is never mixed into the vocabulary/reading recommendation list, and a story link appears only after reading was assessed.

## Biweekly release

1. Review flagged or ambiguous items.
2. Add or replace reading passages in the relevant `data/reading-a.json`, `reading-c.json`, `reading-e.json`, or `reading-g.json` file.
3. Refresh the vocabulary snapshot when the source databases change:

   `node scripts/build-diagnostic-vocabulary-bank.mjs ../E-Vocab-Band-II/data/pedagogical-content.json ../module-e-vocab/data/vocabulary-master.json`

4. Update `data/manifest.json`: `version`, `released`, `releasedHe`, and `nextReview`.
5. Run the repository tests before publication.

Past results retain the bank version used when the attempt was completed.
