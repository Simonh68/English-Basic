import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const json = async path => JSON.parse(await read(path));

async function loadCommonApi(initialStorage = {}, overrides = {}) {
  const storage = new Map(Object.entries(initialStorage));
  const context = {
    window: {},
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key)
    },
    location: { search: '' },
    URLSearchParams,
    crypto: webcrypto,
    performance: { now: () => 0 },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    fetch: async () => { throw new Error('not used'); },
    ...overrides
  };
  vm.runInNewContext(await read('diagnostic/common.js'), context);
  return context.window.EFN_DIAGNOSTIC;
}

test('the diagnostic stays hidden from the home page and presents one simple start flow', async () => {
  const [home, landing, vocabulary, reading] = await Promise.all([
    read('index.html'),
    read('diagnostic/index.html'),
    read('diagnostic/vocabulary.html'),
    read('diagnostic/reading.html')
  ]);

  assert.doesNotMatch(home, /diagnostic\//i);
  for (const html of [landing, vocabulary, reading]) {
    assert.match(html, /href="https:\/\/englishfornoar\.co\.il\/"/);
    assert.match(html, /name="robots" content="noindex,nofollow"/);
    assert.match(html, /analytics\.js/);
  }
  assert.match(landing, /<h1 id="pageTitle">בדיקת רמה אישית<\/h1>/);
  assert.match(landing, /נתחיל בקריאה בסיסית, נמשיך לאוצר מילים/);
  assert.match(landing, /id="startTest"/);
  assert.match(landing, /הכלי מיועד לתרגול ולהערכה ראשונית באתר בלבד/);
  assert.match(reading, /התוצאה אינה מחליפה הערכה או שיקול דעת של מורה מוסמך/);
  assert.match(reading, /id="paragraphProgress"/);
  assert.equal((reading.match(/class="paragraph-cube/g) || []).length, 4);
  assert.match(vocabulary, /id="vocabularyResultView"/);
  assert.match(vocabulary, /id="foundationRecommendationSection"[^>]*hidden/);
  assert.match(vocabulary, /id="vocabularyRecommendationList"/);
  assert.match(vocabulary, /id="transitionTitle">יכולת קריאה בסיסית/);
  assert.match(vocabulary, /id="transitionMark"[^>]*>01/);
  assert.match(vocabulary, /id="transitionButton"/);
  assert.doesNotMatch(vocabulary, /השלב הראשון הושלם|עברת|נכשלת/);
  assert.doesNotMatch(landing, /באיזו כיתה|בחרו כיתה|gradeSelect|gradeError/);
  assert.doesNotMatch(landing, /Core I|Core II|Band III|A · C · E · G|גרסת המאגר|כיסוי/);
  assert.doesNotMatch(vocabulary, /המשימות המומלצות שלך|פרופיל אוצר המילים|Core I|Core II|Band III/);
  assert.match(reading, /המשימות המומלצות שלך/);
  assert.doesNotMatch(`${landing}\n${vocabulary}\n${reading}`, />[^<]*(?:מבחן|שאלון בגרות)[^<]*</);
});

test('the biweekly manifest implements the shortest reliable question policy', async () => {
  const manifest = await json('diagnostic/data/manifest.json');
  const released = new Date(`${manifest.released}T00:00:00Z`);
  const review = new Date(`${manifest.nextReview}T00:00:00Z`);
  const vocabularyQuestions = manifest.vocabulary.foundationalQuestions
    + (manifest.vocabulary.bands.length * manifest.vocabulary.questionsPerBand);

  assert.match(manifest.version, /^\d{4}\.\d{2}-[A-Z]$/);
  assert.equal((review - released) / 86400000, 14);
  assert.equal(manifest.vocabulary.foundationalQuestions, 6);
  assert.equal(manifest.vocabulary.foundationalShortQuestions, 3);
  assert.equal(manifest.vocabulary.questionsPerBand, 4);
  assert.equal(vocabularyQuestions, 18);
  assert.equal(manifest.reading.questionsPerPassage, 4);
  assert.equal(vocabularyQuestions + manifest.reading.questionsPerPassage, 22);
  assert.equal(vocabularyQuestions + (3 * manifest.reading.questionsPerPassage), 30);
  assert.deepEqual(manifest.reading.levels, ['A', 'C', 'E', 'G']);
});

test('basic word recognition starts with bus cat and dog, then rotates longer words', async () => {
  const bank = await json('diagnostic/data/foundational-reading.json');
  const shortWords = bank.filter(item => item.tier === 'short');
  const longWords = bank.filter(item => item.tier === 'long');

  assert.equal(bank.length, 12);
  assert.equal(shortWords.length, 3);
  assert.equal(longWords.length, 9);
  assert.deepEqual(shortWords.map(item => item.wordHe), ['אוטובוס', 'חתול', 'כלב']);
  assert.deepEqual(shortWords.map(item => item.options[item.answer]), ['bus', 'cat', 'dog']);
  assert.deepEqual(bank.slice(0, 3).map(item => item.tier), ['short', 'short', 'short']);
  for (const item of bank) {
    assert.match(item.prompt, /^איך כותבים באנגלית את המילה „.+”\?$/);
    assert.equal(item.options.length, 4);
    assert.equal(new Set(item.options).size, 4);
    assert.ok(Number.isInteger(item.answer) && item.answer >= 0 && item.answer <= 3);
    assert.equal(item.answer, 0);
  }
});

test('random diagnostic answers never keep the same correct position twice', async () => {
  const api = await loadCommonApi();
  const values = ['correct', 'one', 'two', 'three'];
  let previousCorrectIndex = -1;

  for (let question = 0; question < 80; question += 1) {
    const arranged = api.shuffleAnswerOptions(values, 0, previousCorrectIndex);
    assert.equal(arranged.options[arranged.correctIndex], 'correct');
    if (previousCorrectIndex >= 0) assert.notEqual(arranged.correctIndex, previousCorrectIndex);
    previousCorrectIndex = arranged.correctIndex;
  }

  const [vocabulary, reading, styles] = await Promise.all([
    read('diagnostic/vocabulary.js'),
    read('diagnostic/reading.js'),
    read('diagnostic/styles.css')
  ]);
  assert.match(vocabulary, /shuffleAnswerOptions\(options, correctIndex, state\.previousCorrectIndex\)/);
  assert.match(reading, /shuffleAnswerOptions\(question\.options, question\.answer, state\.previousCorrectIndex\)/);
  assert.match(styles, /\.vocab-prompt h1\{[^}]*overflow-wrap:anywhere/);
  assert.match(styles, /\.answer-option\{[^}]*min-width:0;[^}]*overflow-wrap:anywhere/);
});

test('the vocabulary bank preserves source records and English Band III definitions', async () => {
  const [bank, definitions] = await Promise.all([
    json('diagnostic/data/vocabulary-bank.json'),
    json('diagnostic/data/band3-definitions.json')
  ]);
  const counts = bank.reduce((summary, item) => {
    summary[item.band] = (summary[item.band] || 0) + 1;
    return summary;
  }, {});
  const thirdBand = bank.filter(item => item.band === 'Band III');

  assert.equal(bank.length, 3158);
  assert.deepEqual(counts, { 'Core I': 1090, 'Core II': 1086, 'Band III': 982 });
  assert.equal(new Set(bank.map(item => item.id)).size, bank.length);
  for (const item of bank) {
    assert.ok(item.word.trim());
    assert.ok(item.meaning.trim());
    assert.ok(item.example.trim());
  }
  assert.equal(Object.keys(definitions).length, thirdBand.length);
  for (const item of thirdBand) {
    assert.ok(definitions[item.id].trim());
    assert.doesNotMatch(definitions[item.id], /[\u0590-\u05ff]/);
  }

  const builder = await read('scripts/build-diagnostic-vocabulary-bank.mjs');
  const runtime = await read('diagnostic/vocabulary.js');
  assert.match(builder, /clean\(record\.support_text\)/);
  assert.match(runtime, /definitionFile/);
  assert.match(runtime, /item\.band === 'Band III' \? 'definition' : 'meaning'/);
});

test('every reading level has parallel forms with balanced trap groups', async () => {
  const levels = ['A', 'C', 'E', 'G'];
  const averages = {};
  const passageIds = new Set();
  const questionIds = new Set();

  for (const level of levels) {
    const passages = await json(`diagnostic/data/reading-${level.toLowerCase()}.json`);
    assert.equal(passages.length, 4, `${level} has four parallel passages`);
    assert.equal(new Set(passages.map(passage => passage.domain)).size, passages.length);
    averages[level] = passages.reduce((sum, passage) => sum + passage.text.split(/\s+/).length, 0) / passages.length;

    for (const passage of passages) {
      assert.equal(passage.level, level);
      assert.ok(!passageIds.has(passage.id));
      passageIds.add(passage.id);
      assert.equal(passage.text.split(/\n\s*\n/).length, 3, `${passage.id} has three staged paragraphs`);
      assert.equal(passage.questions.length, 4);
      assert.deepEqual(passage.questions.map(question => question.scope), ['paragraph', 'paragraph', 'paragraph', 'whole-text']);
      assert.deepEqual([...passage.questions.map(question => question.group)].sort(), ['A', 'B', 'C', 'D']);
      assert.equal(new Set(passage.questions.map(question => question.trap)).size, 4);
      for (const question of passage.questions) {
        assert.ok(!questionIds.has(question.id));
        questionIds.add(question.id);
        assert.equal(question.options.length, 4);
        assert.equal(new Set(question.options).size, 4);
        assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer <= 3);
      }
    }
  }

  assert.ok(averages.A < averages.C);
  assert.ok(averages.C < averages.E);
  assert.ok(averages.E < averages.G);
});

test('simple questions use a hard thirty seconds and reading questions use a hard five minutes', async () => {
  const api = await loadCommonApi();
  assert.equal(api.TARGET_MS, 30000);
  assert.equal(api.READING_TARGET_MS, 300000);
  assert.equal(api.BASE_POINTS, 4);
  assert.equal(api.scoreTimedAnswer(true, 14000), 5);
  assert.equal(api.scoreTimedAnswer(true, 30000), 4);
  assert.equal(api.scoreTimedAnswer(true, 40000), 3);
  assert.equal(api.scoreTimedAnswer(true, 55000), 2);
  assert.equal(api.scoreTimedAnswer(true, 65000), 1);
  assert.equal(api.scoreTimedAnswer(false, 2000), 0);
  assert.equal(api.scoreTimedAnswer(true, 140000, api.READING_TARGET_MS), 5);
  assert.equal(api.scoreTimedAnswer(true, 300000, api.READING_TARGET_MS), 4);
  assert.equal(api.scoreTimedAnswer(true, 400000, api.READING_TARGET_MS), 3);
  assert.equal(api.scoreTimedAnswer(true, 500000, api.READING_TARGET_MS), 2);
  assert.equal(api.scoreTimedAnswer(true, 620000, api.READING_TARGET_MS), 1);
  const timerValue = { textContent: '' };
  const timerTrack = { style: {} };
  const timerWrapper = { classList: { toggle() {} } };
  api.startQuestionClock(timerValue, timerTrack, timerWrapper, api.READING_TARGET_MS);
  assert.equal(timerValue.textContent, '5:00');
  assert.equal(timerTrack.style.width, '100%');
  let now = 0;
  let nextFrame = null;
  let expired = 0;
  const timedApi = await loadCommonApi({}, {
    performance: { now: () => now },
    requestAnimationFrame: callback => { nextFrame = callback; return 7; },
    cancelAnimationFrame() {}
  });
  const simpleValue = { textContent: '' };
  timedApi.startQuestionClock(simpleValue, { style: {} }, timerWrapper, timedApi.TARGET_MS, () => { expired += 1; });
  now = timedApi.TARGET_MS;
  nextFrame();
  assert.equal(simpleValue.textContent, '0.0');
  assert.equal(expired, 1);
  nextFrame();
  assert.equal(expired, 1);
  const paragraphs = ['Paragraph one', 'Paragraph two', 'Paragraph three'];
  assert.deepEqual([...api.visibleReadingParagraphs(paragraphs, 0, 'paragraph')], ['Paragraph one']);
  assert.deepEqual([...api.visibleReadingParagraphs(paragraphs, 1, 'paragraph')], ['Paragraph two']);
  assert.deepEqual([...api.visibleReadingParagraphs(paragraphs, 2, 'paragraph')], ['Paragraph three']);
  assert.deepEqual([...api.visibleReadingParagraphs(paragraphs, 3, 'whole-text')], paragraphs);

  const [vocabulary, reading, vocabularyHtml, readingHtml] = await Promise.all([
    read('diagnostic/vocabulary.js'),
    read('diagnostic/reading.js'),
    read('diagnostic/vocabulary.html'),
    read('diagnostic/reading.html')
  ]);
  for (const source of [vocabulary, reading]) {
    assert.match(source, /startQuestionClock/);
    assert.match(source, /scoreTimedAnswer/);
    assert.match(source, /elapsedMs/);
    assert.match(source, /submit\(-1, true, true\)/);
    assert.match(source, /timedOut/);
  }
  assert.match(vocabularyHtml, />30\.0<\/strong>/);
  assert.match(readingHtml, />5:00<\/strong>/);
  assert.match(reading, /scoreTimedAnswer\(correct, elapsedMs, api\.READING_TARGET_MS\)/);
});

test('vocabulary gates the reading ladder and produces a terminal A C E or G level', async () => {
  const api = await loadCommonApi();
  const attempt = (level, passed) => ({
    level,
    correct: passed ? 3 : 1,
    ratio: passed ? 0.75 : 0.25
  });
  const step = (profile, attempts) => ({ ...api.nextReadingStep(profile, attempts) });

  assert.deepEqual(step('below-core1', []), { action: 'start', level: 'A' });
  assert.deepEqual(step('below-core1', [attempt('A', true)]), { action: 'finish', level: 'A' });

  assert.deepEqual(step('core1', []), { action: 'start', level: 'A' });
  assert.deepEqual(step('core1', [attempt('A', true)]), { action: 'start', level: 'C' });
  assert.deepEqual(step('core1', [attempt('A', true), attempt('C', true)]), { action: 'finish', level: 'C' });
  assert.deepEqual(step('core1', [attempt('A', true), attempt('C', false)]), { action: 'finish', level: 'A' });

  assert.deepEqual(step('core2', []), { action: 'start', level: 'C' });
  assert.deepEqual(step('core2', [attempt('C', true)]), { action: 'finish', level: 'C' });
  assert.deepEqual(step('core2', [attempt('C', false)]), { action: 'start', level: 'A' });
  assert.deepEqual(step('core2', [attempt('C', false), attempt('A', true)]), { action: 'finish', level: 'A' });

  assert.deepEqual(step('band3', []), { action: 'start', level: 'E' });
  assert.deepEqual(step('band3', [attempt('E', true)]), { action: 'start', level: 'G' });
  assert.deepEqual(step('band3', [attempt('E', true), attempt('G', true)]), { action: 'finish', level: 'G' });
  assert.deepEqual(step('band3', [attempt('E', true), attempt('G', false)]), { action: 'finish', level: 'E' });
  assert.deepEqual(step('band3', [attempt('E', false)]), { action: 'start', level: 'C' });
  assert.deepEqual(step('band3', [attempt('E', false), attempt('C', true)]), { action: 'finish', level: 'C' });
  assert.deepEqual(step('band3', [attempt('E', false), attempt('C', false)]), { action: 'start', level: 'A' });
  assert.deepEqual(step('band3', [attempt('E', false), attempt('C', false), attempt('A', true)]), { action: 'finish', level: 'A' });
});

test('vocabulary coverage selects the correlated reading start level', async () => {
  const api = await loadCommonApi();
  const score = (correct, ratio) => ({ correct, ratio });

  const belowCoreOne = {
    'Core I': score(1, 0.5),
    'Core II': score(4, 1),
    'Band III': score(4, 1)
  };
  const coreOne = {
    'Core I': score(4, 1),
    'Core II': score(1, 0.5),
    'Band III': score(4, 1)
  };
  const coreTwo = {
    'Core I': score(4, 1),
    'Core II': score(4, 1),
    'Band III': score(2, 0.6)
  };
  const bandThree = {
    'Core I': score(4, 1),
    'Core II': score(4, 1),
    'Band III': score(3, 0.75)
  };

  assert.equal(api.vocabularyProfile(belowCoreOne), 'below-core1');
  assert.equal(api.vocabularyLevel(belowCoreOne), 'A');
  assert.equal(api.vocabularyProfile(coreOne), 'core1');
  assert.equal(api.vocabularyLevel(coreOne), 'A');
  assert.equal(api.vocabularyProfile(coreTwo), 'core2');
  assert.equal(api.vocabularyLevel(coreTwo), 'C');
  assert.equal(api.vocabularyProfile(bandThree), 'band3');
  assert.equal(api.vocabularyLevel(bandThree), 'E');
});

test('reading opens only after 70 percent basic accuracy and 50 percent Core I accuracy', async () => {
  const api = await loadCommonApi();
  const foundation = (correct, total = 6) => ({ correct, total });
  const summary = (correct, total = 4) => ({
    'Core I': { correct, total },
    'Core II': { correct: 0, total: 4 },
    'Band III': { correct: 0, total: 4 }
  });

  assert.equal(api.canEnterReading(foundation(5), summary(2)), true);
  assert.equal(api.canEnterReading(foundation(4), summary(2)), false);
  assert.equal(api.canEnterReading(foundation(5), summary(1)), false);
  assert.equal(api.canEnterReading(foundation(6), summary(4)), true);
});

test('the diagnostic excludes sensitive content and weak advanced discriminators without changing the source bank', async () => {
  const [api, bank] = await Promise.all([
    loadCommonApi(),
    json('diagnostic/data/vocabulary-bank.json')
  ]);
  const filtered = [...api.filterDiagnosticVocabulary(bank)];
  const filteredIds = new Set(filtered.map(item => item.id));
  const lowerWords = new Set(filtered
    .filter(item => item.band === 'Core I' || item.band === 'Core II')
    .map(item => item.word.trim().toLowerCase()));
  const advanced = filtered.filter(item => item.band === 'Band III');

  assert.equal(bank.find(item => item.id === 'b2-c2-1575').word, 'gay');
  assert.equal(bank.find(item => item.id === 'b3-B3-017').word, 'to');
  assert.ok(!filteredIds.has('b2-c2-1575'));
  assert.ok(!filteredIds.has('b2-c1-845'));
  assert.ok(!filteredIds.has('b3-B3-017'));
  assert.ok(advanced.length > 700);
  for (const item of advanced) {
    const word = item.word.trim().toLowerCase();
    assert.ok(!lowerWords.has(word), `${item.id} duplicates a lower-band word`);
    if (!/[\s/–—-]/.test(word)) assert.ok(word.replace(/[^a-z]/g, '').length > 3, `${item.id} is too short`);
  }
});

test('reading-foundation, vocabulary, and reading recommendations stay separated', async () => {
  const completed = group => [String(group).padStart(2, '0'), { completedAt: '2026-08-29T00:00:00.000Z' }];
  const progress = JSON.stringify({ version: 1, groups: Object.fromEntries([completed(1), completed(2), completed(3)]) });
  const api = await loadCommonApi({ 'efn.band2.core1.progress.v1': progress });

  assert.equal(api.nextCoreIGroup(), 4);
  const foundations = api.foundationRecommendations();
  assert.equal(foundations.length, 1);
  assert.match(foundations[0].href, /word-forge\/\?level=1&lesson=1$/);

  const vocabularyOnly = api.vocabularyOnlyRecommendations('A', false);
  assert.equal(vocabularyOnly.length, 1);
  assert.match(vocabularyOnly[0].href, /lesson\.html\?level=1&lesson=1&mode=cards$/);

  const lowest = api.combinedRecommendations('A', false, 'A');
  assert.equal(lowest.length, 2);
  assert.doesNotMatch(lowest.map(item => item.href).join('\n'), /word-forge/);
  assert.match(lowest[0].href, /lesson\.html\?level=1&lesson=1&mode=cards$/);
  assert.match(lowest[1].href, /Read-Along\/reader\.html\?id=l1-a1-new-student$/);

  const coreOne = api.combinedRecommendations('A', true, 'A');
  assert.match(coreOne[0].href, /groups\/group-04\.html$/);

  const coreTwo = api.combinedRecommendations('C', true, 'C');
  assert.match(coreTwo[0].href, /groups\/group-21\.html$/);
  assert.match(coreTwo[1].href, /reader\.html\?id=l2-a1-wallet$/);

  const bandThree = api.combinedRecommendations('E', true, 'E');
  assert.match(bandThree[0].href, /module-e-vocab\/A1\.html$/);
  assert.match(bandThree[1].href, /reader\.html\?id=l3-a1-final-place$/);
});

test('scripts compile, gate reading after vocabulary, and use button-led transitions', async () => {
  const files = ['diagnostic/common.js', 'diagnostic/landing.js', 'diagnostic/vocabulary.js', 'diagnostic/reading.js'];
  for (const file of files) {
    const source = await read(file);
    assert.doesNotThrow(() => new Function(source), file);
  }
  const [common, landing, vocabulary, reading, vocabularyHtml, readingHtml] = await Promise.all([
    read('diagnostic/common.js'),
    read('diagnostic/landing.js'),
    read('diagnostic/vocabulary.js'),
    read('diagnostic/reading.js'),
    read('diagnostic/vocabulary.html'),
    read('diagnostic/reading.html')
  ]);
  assert.match(common, /function selectFresh/);
  assert.match(common, /function filterDiagnosticVocabulary/);
  assert.match(common, /function vocabularyProfile/);
  assert.match(common, /function canEnterReading/);
  assert.match(common, /function nextReadingStep/);
  assert.doesNotMatch(landing, /getGrade|setGrade|grade=/);
  assert.match(vocabulary, /selectFresh\(/);
  assert.match(vocabulary, /api\.filterDiagnosticVocabulary/);
  assert.match(vocabulary, /filter\(item => item\.tier === 'short'\)/);
  assert.match(vocabulary, /filter\(item => item\.tier === 'long'\)/);
  assert.match(vocabulary, /const passed = accuracy >= 0\.70/);
  assert.doesNotMatch(vocabulary, /foundationStop|stoppedAt/);
  assert.match(vocabulary, /api\.canEnterReading\(state\.foundation, summary\)/);
  assert.match(vocabulary, /showVocabularyOnlyResult\(result\)/);
  const basicTransition = vocabulary.indexOf("showTransition(1, 'יכולת קריאה בסיסית', 'מתחילים'");
  const vocabularyTransition = vocabulary.indexOf("showTransition(2, 'שליטה באוצר מילים', 'להמשך לבדיקת אוצר המילים'");
  const readingTransition = vocabulary.indexOf("showTransition(3, 'יכולת הבנת הנקרא', 'להמשך לבדיקת הבנת הנקרא'");
  assert.ok(basicTransition >= 0);
  assert.ok(vocabularyTransition >= 0);
  assert.ok(readingTransition >= 0);
  assert.ok(vocabularyTransition < readingTransition);
  assert.match(vocabulary, /location\.href = `reading\.html/);
  assert.doesNotMatch(vocabulary, /getGrade|grade=/);
  assert.match(reading, /active-vocabulary/);
  assert.match(reading, /api\.canEnterReading\(state\.vocabularyResult\.foundational, state\.vocabularyResult\.summary\)/);
  assert.match(reading, /api\.nextReadingStep\(state\.vocabularyProfile, state\.attempts\)/);
  assert.match(reading, /api\.nextReadingStep\(state\.vocabularyProfile, \[\]\)/);
  assert.match(reading, /startPassage\(state\.startLevel\)/);
  assert.match(reading, /הרמה המתאימה לך/);
  assert.match(reading, /question\.scope === 'whole-text'/);
  assert.match(reading, /api\.visibleReadingParagraphs\(state\.paragraphs, state\.questionIndex, question\.scope\)/);
  assert.match(reading, /replaceChildren\(\.\.\.paragraphNodes\)/);
  assert.match(reading, /cube\.classList\.toggle\('is-lit', index < progressStep\)/);
  assert.doesNotMatch(reading, /state\.paragraphs\.slice\(0, state\.questionIndex \+ 1\)/);
  assert.doesNotMatch(reading, /shuffle\(selected\.questions\)/);
  assert.doesNotMatch(`${common}\n${reading}\n${readingHtml}`, /יחידות|placementCopy|classComparison|השאלון המתאים|combineLevels/);
  assert.doesNotMatch(vocabularyHtml, /נכון|שגוי|Correct|Incorrect|הסבר/);
  assert.doesNotMatch(vocabularyHtml, /רמת האנגלית שלך|הרמה המתאימה לך/);
});
