# English diagnostic maintenance

The diagnostic lives at `/diagnostic/` and is intentionally not linked from the public home page yet.

## Fixed-level policy

- The student sees a level-check flow: basic spelling/reading, vocabulary, reading comprehension, and one final A/C/E/G level.
- The level check never exposes Core/Band coverage, intermediate levels, or item feedback. Direct group labels appear only in the final recommendations.
- The opening asks for no class or unit-track information. The result never identifies the level as a Bagrut questionnaire.
- Every vocabulary item keeps its source band: Core I, Core II, or Band III.
- Core I and Core II use the reviewed Hebrew meanings. Band III uses the exact English `support_text` definition from the canonical database.
- Every reading passage and question keeps its reviewed level: A, C, E, or G.
- Runtime performance never changes an item's level. An unsuitable item is retired or replaced during editorial review.

## Short form and scoring

- Basic spelling/reading: 6 items. Israel, doctor, ambulance, and Google always appear; two additional familiar cross-language words rotate from the bank.
- Vocabulary: 4 items from each fixed band, 12 items total.
- A student must answer at least 5 of 6 basic items correctly. A lower result stops the check immediately and links directly to Word Forge.
- Reading: one passage at each level needed by the vocabulary-guided route, with up to three passages total.
- Total length after passing the first stage: 22–30 questions, depending on the reading route.
- Vocabulary and foundational-reading questions have a hard 30-second limit. Reading-comprehension questions have a hard 5-minute limit.
- When either limit expires, the unanswered question receives 0 and the level check advances automatically. Each correct answer is worth 4 points inside its limit and 5 points in the first half. Incorrect, skipped, or timed-out answers receive 0.
- The reading route starts from vocabulary coverage: below Core I starts and ends at A; Core I starts at A and may advance to C; Core II starts at C but never advances to E; Band III starts at E and may move to G, C, or A according to reading performance.
- Every reading passage contains exactly three staged paragraphs. Questions 1–3 each show only their own paragraph; Question 4 shows all three paragraphs and asks about the whole text.
- The final A/C/E/G level is the terminal level of that vocabulary-gated reading route.
- Recommendations link directly to the next Core I group saved on the device when that progress exists, otherwise to the first relevant vocabulary group. A reading-foundations game is added for the lowest profile, and every result includes one direct story link.

## Biweekly release

1. Review flagged or ambiguous items.
2. Add or replace reading passages in the relevant `data/reading-a.json`, `reading-c.json`, `reading-e.json`, or `reading-g.json` file.
3. Refresh the vocabulary snapshot when the source databases change:

   `node scripts/build-diagnostic-vocabulary-bank.mjs ../E-Vocab-Band-II/data/pedagogical-content.json ../module-e-vocab/data/vocabulary-master.json`

4. Update `data/manifest.json`: `version`, `released`, `releasedHe`, and `nextReview`.
5. Run the repository tests before publication.

Past results retain the bank version used when the attempt was completed.
