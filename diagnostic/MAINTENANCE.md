# English diagnostic maintenance

The diagnostic lives at `/diagnostic/` and is intentionally not linked from the public home page yet.

## Fixed-level policy

- Every vocabulary item keeps its source band: Core I, Core II, or Band III.
- Every reading passage and question keeps its reviewed level: A, C, E, or G.
- Runtime performance never changes an item's level. An unsuitable item is retired or replaced during editorial review.

## Biweekly release

1. Review flagged or ambiguous items.
2. Add or replace reading passages in the relevant `data/reading-a.json`, `reading-c.json`, `reading-e.json`, or `reading-g.json` file.
3. Refresh the vocabulary snapshot when the source databases change:

   `node scripts/build-diagnostic-vocabulary-bank.mjs ../E-Vocab-Band-II/data/pedagogical-content.json ../module-e-vocab/data/vocabulary-master.json`

4. Update `data/manifest.json`: `version`, `released`, `releasedHe`, and `nextReview`.
5. Run the repository tests before publication.

Past results retain the bank version used when the attempt was completed.
