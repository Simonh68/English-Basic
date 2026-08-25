import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('the temporary Maayan edition is branded separately and uses seven seconds', async () => {
  const html = await source('temp/index.html');
  const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

  assert.ok(inlineScript);
  assert.doesNotThrow(() => new Function(inlineScript));
  assert.match(html, /<title>Maayan — English Basic<\/title>/);
  assert.match(html, /ENGLISH BASIC · MAAYAN/);
  assert.match(html, /<h1 id="introTitle"[^>]*><span>MAAYAN<\/span><\/h1>/);
  assert.match(html, /MAAYAN COLLECTION/);
  assert.match(html, /class="certificate-brand"[^>]*>MAAYAN<\/p>/);
  assert.match(inlineScript, /document\.title = `Maayan · Level/);
  assert.match(inlineScript, /href: `temp\/\?level=/);
  assert.match(inlineScript, /const challengeDurationMs = 7000/);
  assert.match(html, /aria-label="שבע שניות לבחירת תשובה"[^>]*aria-valuemax="7"[^>]*aria-valuenow="7"/);
  assert.match(html, /src="\.\.\/curriculum-data\.js\?v=2"/);
  assert.match(html, /src="\.\.\/progress\.js\?v=3"/);
});

test('the production Word Forge edition remains unchanged at five seconds', async () => {
  const html = await source('word-forge/index.html');

  assert.match(html, /ENGLISH BASIC · WORD FORGE/);
  assert.match(html, /const challengeDurationMs = 5000/);
  assert.match(html, /aria-label="חמש שניות לבחירת תשובה"[^>]*aria-valuemax="5"[^>]*aria-valuenow="5"/);
  assert.doesNotMatch(html, /ENGLISH BASIC · MAAYAN/);
});
