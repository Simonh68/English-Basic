import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const wordForgePath = new URL('../word-forge/index.html', import.meta.url);
const maayanPath = new URL('../temp/index.html', import.meta.url);

function replaceExactlyOnce(value, from, to) {
  const occurrences = value.split(from).length - 1;
  assert.equal(occurrences, 1, `expected exactly one Word Forge route token: ${from}`);
  return value.replace(from, to);
}

export function createMaayanPage(wordForgeHtml) {
  assert.match(wordForgeHtml, /<title>Word Forge — English Basics<\/title>/);
  assert.doesNotMatch(wordForgeHtml, /English-Basic\/temp\//);

  const wordForgeOnlySharing = /\n  <!-- WORD-FORGE-SHARING-START -->[\s\S]*?  <!-- WORD-FORGE-SHARING-END -->/;
  assert.match(wordForgeHtml, wordForgeOnlySharing);
  const sharedGameHtml = wordForgeHtml.replace(wordForgeOnlySharing, '');

  let maayanHtml = replaceExactlyOnce(
    sharedGameHtml,
    '  <title>Word Forge — English Basics</title>',
    '  <title>Word Forge — English Basics</title>\n  <link rel="canonical" href="https://simonh68.github.io/English-Basic/temp/">'
  );

  maayanHtml = maayanHtml
    .replaceAll('WORD FORGE', 'MAAYAN')
    .replaceAll('Word Forge', 'MAAYAN');

  maayanHtml = replaceExactlyOnce(
    maayanHtml,
    'href: `word-forge/?level=${courseLevel}&lesson=${courseLesson}`',
    'href: `temp/?level=${courseLevel}&lesson=${courseLesson}`'
  );

  assert.doesNotMatch(maayanHtml, /WORD FORGE|Word Forge/);
  assert.match(maayanHtml, /<title>MAAYAN — English Basics<\/title>/);
  assert.match(maayanHtml, /ENGLISH BASICS · MAAYAN/);
  assert.match(maayanHtml, /href: `temp\/\?level=/);
  return maayanHtml;
}

async function main() {
  const wordForgeHtml = await readFile(wordForgePath, 'utf8');
  await writeFile(maayanPath, createMaayanPage(wordForgeHtml), 'utf8');
  process.stdout.write(`Synced ${fileURLToPath(maayanPath)} from ${fileURLToPath(wordForgePath)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
