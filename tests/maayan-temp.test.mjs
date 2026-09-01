import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createMaayanPage } from '../scripts/sync-maayan-from-word-forge.mjs';

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('MAAYAN is generated from the canonical Word Forge code with only its name and route changed', async () => {
  const [wordForgeHtml, maayanHtml] = await Promise.all([
    source('word-forge/index.html'),
    source('temp/index.html')
  ]);
  const inlineScript = maayanHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1];

  assert.equal(maayanHtml, createMaayanPage(wordForgeHtml));
  assert.ok(inlineScript);
  assert.doesNotThrow(() => new Function(inlineScript));

  assert.match(maayanHtml, /<title>MAAYAN — English Basics<\/title>/);
  assert.match(maayanHtml, /rel="canonical" href="https:\/\/simonh68\.github\.io\/English-Basic\/temp\/"/);
  assert.match(maayanHtml, /ENGLISH BASICS · MAAYAN/);
  assert.match(maayanHtml, /<h1 id="introTitle"[^>]*><span>MAAYAN<\/span><\/h1>/);
  assert.match(maayanHtml, /MAAYAN COLLECTION/);
  assert.match(maayanHtml, /class="certificate-brand"[^>]*>MAAYAN<\/p>/);
  assert.match(inlineScript, /document\.title = `MAAYAN · Level/);
  assert.match(inlineScript, /href: `temp\/\?level=/);
  assert.doesNotMatch(maayanHtml, /WORD FORGE|Word Forge/);
  assert.doesNotMatch(maayanHtml, /WORD-FORGE-SHARING|word-forge-preview\.jpg/);

  assert.match(maayanHtml, /src="\.\.\/curriculum-data\.js\?v=2"/);
  assert.match(maayanHtml, /src="\.\.\/progress\.js\?v=3"/);
  assert.doesNotMatch(maayanHtml, /src="\.\/curriculum-data\.js|src="\.\/progress\.js|analytics-v2\.js/);
});

test('the canonical Word Forge page keeps its public branding and route', async () => {
  const html = await source('word-forge/index.html');

  assert.match(html, /ENGLISH BASICS · WORD FORGE/);
  assert.match(html, /href: `word-forge\/\?level=/);
  assert.match(html, /const challengeDurationMs = 10000/);
  assert.match(html, /const responseBonusByTier = \{ fast: 5, steady: 2, slow: 0, untimed: 0 \}/);
  assert.doesNotMatch(html, /ENGLISH BASICS · MAAYAN|English-Basic\/temp\//);
});
