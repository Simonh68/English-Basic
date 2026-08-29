import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function replaceOnce(value, from, to) {
  assert.equal(value.split(from).length - 1, 1, `expected one MAAYAN parity token: ${from}`);
  return value.replace(from, to);
}

function normalizeMaayanToPublic(html) {
  const replacements = [
    ['<title>MAAYAN — English Basics</title>', '<title>Word Forge — English Basics</title>'],
    ['<link rel="canonical" href="https://simonh68.github.io/English-Basic/temp/">', '<link rel="canonical" href="https://englishfornoar.co.il/word-forge/">'],
    ['<link rel="icon" type="image/svg+xml" href="../favicon.svg">', '<link rel="icon" type="image/svg+xml" href="/favicon.svg">'],
    ['<strong lang="en">ENGLISH BASICS · MAAYAN</strong>', '<strong lang="en">ENGLISH BASICS · WORD FORGE</strong>'],
    ['<h1 id="introTitle" lang="en"><span>MAAYAN</span></h1>', '<h1 id="introTitle" lang="en"><span>WORD FORGE</span></h1>'],
    ['<section class="game" id="game" aria-label="MAAYAN">', '<section class="game" id="game" aria-label="Word Forge">'],
    ['<span>MAAYAN</span>', '<span>English for Noar · English Basics · Word Forge</span>'],
    ['<a href="../copyright.html">הצהרת הזכויות המלאה</a>', '<a href="/copyright/">הצהרת הזכויות המלאה</a>'],
    ['<p class="stage-map-kicker" lang="en">MAAYAN COLLECTION</p>', '<p class="stage-map-kicker" lang="en">WORD FORGE COLLECTION</p>'],
    ['<p class="certificate-brand" lang="en">MAAYAN</p>', '<p class="certificate-brand" lang="en">WORD FORGE</p>'],
    ['<script src="./curriculum-data.js?v=2"></script>', '<script src="/curriculum-data.js?v=2"></script>'],
    ['<script src="./progress.js?v=3"></script>', '<script src="/progress.js?v=3"></script>'],
    ['<script src="./analytics-v2.js"></script>', '<script src="/analytics-v2.js"></script>'],
    ['document.title = `MAAYAN · Level ${courseLevel} · Stage ${courseLesson}`;', 'document.title = `Word Forge · Level ${courseLevel} · Stage ${courseLesson}`;'],
    ['progressApi?.setLastLocation({ href: `temp/?level=${courseLevel}&lesson=${courseLesson}`, label: `MAAYAN · שלב ${courseLesson}` });', 'progressApi?.setLastLocation({ href: `/word-forge/?level=${courseLevel}&lesson=${courseLesson}`, label: `Word Forge · שלב ${courseLesson}` });'],
    ["stageMapTitle.textContent = 'MAAYAN · 50';", "stageMapTitle.textContent = 'WORD FORGE · 50';"]
  ];

  return replacements.reduce((result, [from, to]) => replaceOnce(result, from, to), html);
}

test('the isolated MAAYAN edition matches the current public Word Forge source except for branding and hosting paths', async () => {
  const [html, curriculum, progress, analytics] = await Promise.all([
    source('temp/index.html'),
    source('temp/curriculum-data.js'),
    source('temp/progress.js'),
    source('temp/analytics-v2.js')
  ]);
  const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  const roundOverridesSource = inlineScript?.match(/const stageRoundOverrides = (\{[\s\S]*?\n\s*\});/)?.[1];

  assert.ok(inlineScript);
  assert.ok(roundOverridesSource);
  assert.doesNotThrow(() => new Function(inlineScript));

  assert.match(html, /<title>MAAYAN — English Basics<\/title>/);
  assert.match(html, /ENGLISH BASICS · MAAYAN/);
  assert.match(html, /<h1 id="introTitle"[^>]*><span>MAAYAN<\/span><\/h1>/);
  assert.match(html, /MAAYAN COLLECTION/);
  assert.match(html, /class="certificate-brand"[^>]*>MAAYAN<\/p>/);
  assert.match(inlineScript, /document\.title = `MAAYAN · Level/);
  assert.match(inlineScript, /href: `temp\/\?level=/);

  assert.match(inlineScript, /const challengeDurationMs = 10000/);
  assert.doesNotMatch(inlineScript, /const challengeDurationMs = 7000/);
  assert.match(inlineScript, /retryAudio\(feedbackId, correct, item, currentChallenge\.kind\)/);
  assert.doesNotMatch(inlineScript, /playCue: !timedOut/);
  assert.match(inlineScript, /const feedbackAdvanceDurationMs = 3000/);
  assert.match(inlineScript, /'4-1': \['ough'\]/);
  assert.deepEqual(new Function(`return ${roundOverridesSource};`)()['4-1'].map(round => round.words.length), [3, 5, 2, 2, 3]);
  assert.match(inlineScript, /patternBonus: Math\.min\(3, correctChunk\.length - 1\)/);
  assert.match(html, /aria-label="עשר שניות לבחירת תשובה"[^>]*aria-valuemax="10"[^>]*aria-valuenow="10"/);
  assert.equal((html.match(/class="coin-disc"/g) || []).length, 3);
  assert.match(html, /id="feedbackAdvanceTrack" role="progressbar"[^>]*aria-valuemax="3"/);
  assert.match(html, /\[hidden\] \{ display: none !important; \}/);
  assert.match(html, /src="\.\/curriculum-data\.js\?v=2"/);
  assert.match(html, /src="\.\/progress\.js\?v=3"/);
  assert.match(html, /src="\.\/analytics-v2\.js"/);

  assert.equal(sha256(curriculum), '7bdf2c2104375aeebfcc530a4ff63e1178cde577c17fe76374bc605d4a4bb90a');
  assert.equal(sha256(progress), '32324d5260511d557f51399954a9fdd9b8bc8aeb936a7226ea7c94ddff4dec7b');
  assert.equal(sha256(analytics), '3ffc6c4854aa487c8481b3079b45949a09dd263de34b4246faa88d66137cb364');
  assert.equal(sha256(normalizeMaayanToPublic(html)), '7d159b4baa2265ea520a9b89ffd1c84ea0ad1cd4b739d506839f590ad3b18e31');
});

test('the repository Word Forge edition keeps its public branding and ten-second speed rewards', async () => {
  const html = await source('word-forge/index.html');

  assert.match(html, /ENGLISH BASICS · WORD FORGE/);
  assert.match(html, /const challengeDurationMs = 10000/);
  assert.match(html, /const responseBonusByTier = \{ fast: 5, steady: 2, slow: 0, untimed: 0 \}/);
  assert.match(html, /aria-label="עשר שניות לבחירת תשובה"[^>]*aria-valuemax="10"[^>]*aria-valuenow="10"/);
  assert.match(html, /id="timePressureToggle"/);
  assert.doesNotMatch(html, /ENGLISH BASICS · MAAYAN/);
});
