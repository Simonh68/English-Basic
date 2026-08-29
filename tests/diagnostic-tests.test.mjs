import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const json = async path => JSON.parse(await read(path));

test('the diagnostic remains hidden from the public home page but always links back home', async () => {
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
  assert.match(vocabulary, /המשימות המומלצות שלך/);
  assert.match(reading, /המשימות המומלצות שלך/);
});

test('the biweekly manifest points to separate, versioned test banks', async () => {
  const manifest = await json('diagnostic/data/manifest.json');
  const released = new Date(`${manifest.released}T00:00:00Z`);
  const review = new Date(`${manifest.nextReview}T00:00:00Z`);

  assert.match(manifest.version, /^\d{4}\.\d{2}-[AB]$/);
  assert.equal((review - released) / 86400000, 14);
  assert.deepEqual(manifest.vocabulary.bands, ['Core I', 'Core II', 'Band III']);
  assert.equal(manifest.vocabulary.questionsPerBand, 12);
  assert.deepEqual(manifest.reading.levels, ['A', 'C', 'E', 'G']);
  assert.equal(new Set(Object.values(manifest.reading.files)).size, 4);
});

test('the vocabulary bank preserves every canonical source record', async () => {
  const bank = await json('diagnostic/data/vocabulary-bank.json');
  const counts = bank.reduce((summary, item) => {
    summary[item.band] = (summary[item.band] || 0) + 1;
    return summary;
  }, {});

  assert.equal(bank.length, 3158);
  assert.deepEqual(counts, { 'Core I': 1090, 'Core II': 1086, 'Band III': 982 });
  assert.equal(new Set(bank.map(item => item.id)).size, bank.length);
  for (const item of bank) {
    assert.ok(item.word.trim());
    assert.ok(item.meaning.trim());
    assert.ok(item.example.trim());
    assert.ok(['Core I', 'Core II', 'Band III'].includes(item.band));
  }
});

test('every reading level has parallel forms with balanced trap groups', async () => {
  const levels = ['A', 'C', 'E', 'G'];
  const averages = {};
  const passageIds = new Set();
  const questionIds = new Set();

  for (const level of levels) {
    const passages = await json(`diagnostic/data/reading-${level.toLowerCase()}.json`);
    assert.equal(passages.length, 4, `${level} has four parallel passages`);
    assert.equal(new Set(passages.map(passage => passage.domain)).size, passages.length, `${level} domains are varied`);
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

test('diagnostic scripts compile and implement fresh-form history', async () => {
  const files = ['diagnostic/common.js', 'diagnostic/landing.js', 'diagnostic/vocabulary.js', 'diagnostic/reading.js'];
  for (const file of files) {
    const source = await read(file);
    assert.doesNotThrow(() => new Function(source), file);
  }
  const common = await read('diagnostic/common.js');
  const vocabulary = await read('diagnostic/vocabulary.js');
  const reading = await read('diagnostic/reading.js');
  assert.match(common, /function selectFresh/);
  assert.match(common, /history\.slice/);
  assert.match(vocabulary, /selectFresh\(bandItems/);
  assert.match(reading, /selectFresh\(pool/);
  assert.match(reading, /startPassage\('C'\)/);
  assert.match(reading, /last\.correct >= 3 \? startPassage\('G'\)/);
});
