# English diagnostic maintenance

The diagnostic lives at `/diagnostic/` and is intentionally not linked from the public home page yet.

## Fixed-level policy

- The student sees one continuous flow: foundational reading, vocabulary, reading comprehension, and one final placement.
- The test flow never exposes Core/Band coverage, intermediate levels, or item feedback. Direct group labels appear only in the final recommendations.
- The opening asks for no class or unit-track information. The result names only the recommended Bagrut questionnaire.
- Every vocabulary item keeps its source band: Core I, Core II, or Band III.
- Core I and Core II use the reviewed Hebrew meanings. Band III uses the exact English `support_text` definition from the canonical database.
- Every reading passage and question keeps its reviewed level: A, C, E, or G.
- Runtime performance never changes an item's level. An unsuitable item is retired or replaced during editorial review.

## Short form and scoring

- Foundational reading: 3 items, one each from `know/no`, `thought/taught`, and `here/hear` families.
- Vocabulary: 4 items from each fixed band, 12 items total.
- Reading: two passages for most students and three only when the E/G boundary must be checked.
- Total length: 23 questions normally, 27 questions at the advanced boundary.
- Vocabulary and foundational-reading questions have a hard 30-second limit. Reading-comprehension questions have a hard 5-minute limit.
- When either limit expires, the unanswered question receives 0 and the test advances automatically. Each correct answer is worth 4 points inside its limit and 5 points in the first half. Incorrect, skipped, or timed-out answers receive 0.
- The reading test starts from the vocabulary correlation: Band I or Band II Core I starts at A; Band II Core II starts at C; Band III starts at E.
- Every reading passage contains exactly three staged paragraphs. Questions 1–3 each show only their own paragraph; Question 4 shows all three paragraphs and asks about the whole text.
- Final placement gives 70% weight to the lower demonstrated skill level and 30% to the higher level. A failed foundational gate forces the foundational-reading recommendation.
- Recommendations link directly to the next Core I group saved on the device when that progress exists, otherwise to the first relevant vocabulary group. A reading-foundations game is added for the lowest profile, and every result includes one direct story link.

## Biweekly release

1. Review flagged or ambiguous items.
2. Add or replace reading passages in the relevant `data/reading-a.json`, `reading-c.json`, `reading-e.json`, or `reading-g.json` file.
3. Refresh the vocabulary snapshot when the source databases change:

   `node scripts/build-diagnostic-vocabulary-bank.mjs ../E-Vocab-Band-II/data/pedagogical-content.json ../module-e-vocab/data/vocabulary-master.json`

4. Update `data/manifest.json`: `version`, `released`, `releasedHe`, and `nextReview`.
5. Run the repository tests before publication.

Past results retain the bank version used when the attempt was completed.
