import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('the temporary Maayan edition is branded separately and uses a silent seven-second timer', async () => {
  const html = await source('temp/index.html');
  const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  const roundOverridesSource = inlineScript?.match(/const stageRoundOverrides = (\{[\s\S]*?\n\s*\});/)?.[1];

  assert.ok(inlineScript);
  assert.ok(roundOverridesSource);
  assert.doesNotThrow(() => new Function(inlineScript));
  assert.match(html, /<title>Maayan — English Basic<\/title>/);
  assert.match(html, /ENGLISH BASIC · MAAYAN/);
  assert.match(html, /<h1 id="introTitle"[^>]*><span>MAAYAN<\/span><\/h1>/);
  assert.match(html, /MAAYAN COLLECTION/);
  assert.match(html, /class="certificate-brand"[^>]*>MAAYAN<\/p>/);
  assert.match(inlineScript, /document\.title = `Maayan · Level/);
  assert.match(inlineScript, /href: `temp\/\?level=/);
  assert.match(inlineScript, /const challengeDurationMs = 7000/);
  assert.match(inlineScript, /retryAudio\(feedbackId, correct, item, currentChallenge\.kind, \{ playCue: !timedOut \}\)/);
  assert.match(inlineScript, /if \(playCue\) \{\s*await playTones\(/);
  assert.match(inlineScript, /const feedbackAdvanceDurationMs = 3000/);
  assert.match(inlineScript, /'4-1': \['ough'\]/);
  assert.deepEqual(new Function(`return ${roundOverridesSource};`)()['4-1'].map(round => round.words.length), [3, 5, 2, 2, 3]);
  assert.match(inlineScript, /patternBonus: Math\.min\(3, correctChunk\.length - 1\)/);
  assert.match(html, /aria-label="שבע שניות לבחירת תשובה"[^>]*aria-valuemax="7"[^>]*aria-valuenow="7"/);
  assert.equal((html.match(/class="coin-disc"/g) || []).length, 3);
  assert.match(html, /id="feedbackAdvanceTrack" role="progressbar"[^>]*aria-valuemax="3"/);
  assert.match(html, /src="\.\.\/curriculum-data\.js\?v=2"/);
  assert.match(html, /src="\.\.\/progress\.js\?v=3"/);
  assert.doesNotMatch(html, /WORD FORGE|Word Forge/);
});

test('the production Word Forge edition uses fixed ten-second speed rewards without Maayan branding', async () => {
  const html = await source('word-forge/index.html');

  assert.match(html, /ENGLISH BASICS · WORD FORGE/);
  assert.match(html, /const challengeDurationMs = 10000/);
  assert.match(html, /const responseBonusByTier = \{ fast: 5, steady: 2, slow: 0, untimed: 0 \}/);
  assert.match(html, /aria-label="עשר שניות לבחירת תשובה"[^>]*aria-valuemax="10"[^>]*aria-valuenow="10"/);
  assert.match(html, /id="timePressureToggle"/);
  assert.doesNotMatch(html, /ENGLISH BASIC · MAAYAN/);
});
