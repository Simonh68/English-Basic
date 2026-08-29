import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const json = async path => JSON.parse(await read(path));

async function loadCommonApi() {
  const storage = new Map();
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
    fetch: async () => { throw new Error('not used'); }
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
    assert.match(html, /href="\.\.\/index\.html"/);
    assert.match(html, /name="robots" content="noindex,nofollow"/);
    assert.match(html, /analytics\.js/);
  }
  assert.match(landing, /<h1 id="pageTitle">מבחן<\/h1>/);
  assert.match(landing, /נתחיל באוצר מילים, ואחר כך נעבור להבנת הנקרא/);
  assert.match(landing, /id="startTest"/);
  assert.doesNotMatch(landing, /Core I|Core II|Band III|A · C · E · G|גרסת המאגר|כיסוי/);
  assert.doesNotMatch(vocabulary, /המשימות המומלצות שלך|פרופיל אוצר המילים|Core I|Core II|Band III/);
  assert.match(reading, /המשימות המומלצות שלך/);
});

test('the biweekly manifest implements the shortest reliable question policy', async () => {
  const manifest = await json('diagnostic/data/manifest.json');
  const released = new Date(`${manifest.released}T00:00:00Z`);
  const review = new Date(`${manifest.nextReview}T00:00:00Z`);
  const vocabularyQuestions = manifest.vocabulary.foundationalQuestions
    + (manifest.vocabulary.bands.length * manifest.vocabulary.questionsPerBand);

  assert.match(manifest.version, /^\d{4}\.\d{2}-[A-Z]$/);
  assert.equal((review - released) / 86400000, 14);
  assert.equal(manifest.vocabulary.foundationalQuestions, 3);
  assert.equal(manifest.vocabulary.questionsPerBand, 4);
  assert.equal(vocabularyQuestions, 15);
  assert.equal(manifest.reading.questionsPerPassage, 4);
  assert.equal(vocabularyQuestions + (2 * manifest.reading.questionsPerPassage), 23);
  assert.equal(vocabularyQuestions + (3 * manifest.reading.questionsPerPassage), 27);
  assert.deepEqual(manifest.reading.levels, ['A', 'C', 'E', 'G']);
});

test('the foundational gate uses three randomized reading distinctions', async () => {
  const bank = await json('diagnostic/data/foundational-reading.json');
  const families = [...new Set(bank.map(item => item.family))];

  assert.equal(bank.length, 9);
  assert.deepEqual(families, ['know-no', 'thought-taught', 'here-hear']);
  for (const family of families) assert.equal(bank.filter(item => item.family === family).length, 3);
  for (const item of bank) {
    assert.match(item.prompt, /___/);
    assert.equal(item.options.length, 4);
    assert.equal(new Set(item.options).size, 4);
    assert.ok(Number.isInteger(item.answer) && item.answer >= 0 && item.answer <= 3);
  }
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
      assert.equal(passage.questions.length, 4);
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

test('every answered question uses the eight-second, four-point scoring scale', async () => {
  const api = await loadCommonApi();
  assert.equal(api.TARGET_MS, 8000);
  assert.equal(api.BASE_POINTS, 4);
  assert.equal(api.scoreTimedAnswer(true, 3500), 5);
  assert.equal(api.scoreTimedAnswer(true, 8000), 4);
  assert.equal(api.scoreTimedAnswer(true, 9000), 3);
  assert.equal(api.scoreTimedAnswer(true, 13000), 2);
  assert.equal(api.scoreTimedAnswer(true, 17000), 1);
  assert.equal(api.scoreTimedAnswer(false, 2000), 0);

  const [vocabulary, reading] = await Promise.all([
    read('diagnostic/vocabulary.js'),
    read('diagnostic/reading.js')
  ]);
  for (const source of [vocabulary, reading]) {
    assert.match(source, /startQuestionClock/);
    assert.match(source, /scoreTimedAnswer/);
    assert.match(source, /elapsedMs/);
  }
});

test('the final placement weights the lower level 70 percent and the higher level 30 percent', async () => {
  const api = await loadCommonApi();
  assert.deepEqual(
    { ...api.combineLevels('A', 'G', true) },
    { level: 'C', weightedScore: 48 }
  );
  assert.deepEqual(
    { ...api.combineLevels('C', 'E', true) },
    { level: 'C', weightedScore: 58 }
  );
  assert.deepEqual(
    { ...api.combineLevels('G', 'G', true) },
    { level: 'G', weightedScore: 100 }
  );
  assert.equal(api.combineLevels('G', 'G', false).level, 'A');
});

test('scripts compile, avoid interim feedback, and continue automatically from vocabulary to reading', async () => {
  const files = ['diagnostic/common.js', 'diagnostic/landing.js', 'diagnostic/vocabulary.js', 'diagnostic/reading.js'];
  for (const file of files) {
    const source = await read(file);
    assert.doesNotThrow(() => new Function(source), file);
  }
  const [common, vocabulary, reading, vocabularyHtml] = await Promise.all([
    read('diagnostic/common.js'),
    read('diagnostic/vocabulary.js'),
    read('diagnostic/reading.js'),
    read('diagnostic/vocabulary.html')
  ]);
  assert.match(common, /function selectFresh/);
  assert.match(vocabulary, /selectFresh\(/);
  assert.match(vocabulary, /location\.href = `reading\.html/);
  assert.match(reading, /active-vocabulary/);
  assert.match(reading, /startPassage\('C'\)/);
  assert.match(reading, /last\.ratio >= 0\.68/);
  assert.doesNotMatch(vocabularyHtml, /נכון|שגוי|Correct|Incorrect|הסבר/);
});
