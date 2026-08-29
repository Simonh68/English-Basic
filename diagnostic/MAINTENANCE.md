# English diagnostic maintenance

The diagnostic lives at `/diagnostic/` and is intentionally not linked from the public home page yet.

## Fixed-level policy

- The student sees one continuous flow: foundational reading, vocabulary, reading comprehension, and one final placement.
- The interface never exposes Core/Band coverage, intermediate levels, or item feedback.
- Every vocabulary item keeps its source band: Core I, Core II, or Band III.
- Core I and Core II use the reviewed Hebrew meanings. Band III uses the exact English `support_text` definition from the canonical database.
- Every reading passage and question keeps its reviewed level: A, C, E, or G.
- Runtime performance never changes an item's level. An unsuitable item is retired or replaced during editorial review.

## Short form and scoring

- Foundational reading: 3 items, one each from `know/no`, `thought/taught`, and `here/hear` families.
- Vocabulary: 4 items from each fixed band, 12 items total.
- Reading: two passages for most students and three only when the E/G boundary must be checked.
- Total length: 23 questions normally, 27 questions at the advanced boundary.
- Each correct answer is worth 4 points inside the 8-second target, 5 points up to 4 seconds, then 3/2/1 points as response time passes 8/12/16 seconds. Incorrect or skipped answers receive 0.
- Final placement gives 70% weight to the lower demonstrated skill level and 30% to the higher level. A failed foundational gate forces the foundational-reading recommendation.

## Biweekly release

1. Review flagged or ambiguous items.
2. Add or replace reading passages in the relevant `data/reading-a.json`, `reading-c.json`, `reading-e.json`, or `reading-g.json` file.
3. Refresh the vocabulary snapshot when the source databases change:

   `node scripts/build-diagnostic-vocabulary-bank.mjs ../E-Vocab-Band-II/data/pedagogical-content.json ../module-e-vocab/data/vocabulary-master.json`

4. Update `data/manifest.json`: `version`, `released`, `releasedHe`, and `nextReview`.
5. Run the repository tests before publication.

Past results retain the bank version used when the attempt was completed.
