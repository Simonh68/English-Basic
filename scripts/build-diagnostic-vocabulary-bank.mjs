import fs from 'node:fs';
import path from 'node:path';

const [bandTwoPath, bandThreePath] = process.argv.slice(2);

if (!bandTwoPath || !bandThreePath) {
  console.error('Usage: node scripts/build-diagnostic-vocabulary-bank.mjs <Band-II pedagogical-content.json> <Band-III vocabulary-master.json>');
  process.exit(1);
}

const readJson = file => JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const bandTwo = readJson(bandTwoPath).records
  .filter(record => ['Core I', 'Core II'].includes(record.core))
  .map(record => ({
    id: `b2-${record.core === 'Core I' ? 'c1' : 'c2'}-${record.serial}`,
    band: record.core,
    word: clean(record.entry),
    pos: clean(record.pos),
    example: clean(record.example),
    meaning: clean(record.translation)
  }));

const bandThreeSource = readJson(bandThreePath);
const bandThree = bandThreeSource.map((record, index) => ({
  id: `b3-${clean(record.source_entry_id) || index + 1}`,
  band: 'Band III',
  word: clean(record.en),
  pos: clean(record.pos || record.grammar),
  example: clean(record.ex_en),
  meaning: clean(record.mean_he),
  group: clean(record.group)
}));

const bank = [...bandTwo, ...bandThree].filter(item => item.word && item.example && item.meaning);
const output = path.resolve('diagnostic/data/vocabulary-bank.json');
fs.writeFileSync(output, `${JSON.stringify(bank, null, 2)}\n`);

const definitions = Object.fromEntries(bandThreeSource
  .map((record, index) => [
    `b3-${clean(record.source_entry_id) || index + 1}`,
    clean(record.support_text)
  ])
  .filter(([, definition]) => definition));
const definitionOutput = path.resolve('diagnostic/data/band3-definitions.json');
fs.writeFileSync(definitionOutput, `${JSON.stringify(definitions)}\n`);

const counts = bank.reduce((summary, item) => {
  summary[item.band] = (summary[item.band] || 0) + 1;
  return summary;
}, {});
console.log(JSON.stringify({
  output,
  definitionOutput,
  records: bank.length,
  definitions: Object.keys(definitions).length,
  counts
}, null, 2));
