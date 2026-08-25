import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(here, '../prototypes/word-forge/index.html'), 'utf8');
const reviewCopy = readFileSync(resolve(here, '../prototypes/word-forge/word-forge-v4.html'), 'utf8');
const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

assert.equal(reviewCopy, html, 'standalone V4 review copy matches the prototype source');
assert.ok(inlineScript, 'inline prototype script exists');
assert.doesNotThrow(() => new Function(inlineScript), 'inline prototype script compiles');

const shuffleSource = inlineScript.match(/function shuffleGroup\(group, previousGroup = \[\]\) \{[\s\S]*?return shuffled;\n\s*\}/)?.[0];
assert.ok(shuffleSource, 'group shuffle helper exists');
const shuffleGroup = new Function(`${shuffleSource}; return shuffleGroup;`)();
const sourceGroup = ['one', 'two', 'three', 'four'];
const originalRandom = Math.random;
let shuffledGroup;
try {
  Math.random = () => 0;
  shuffledGroup = shuffleGroup(sourceGroup);
} finally {
  Math.random = originalRandom;
}
assert.deepEqual(sourceGroup, ['one', 'two', 'three', 'four'], 'shuffle keeps the source group unchanged');
assert.deepEqual([...shuffledGroup].sort(), [...sourceGroup].sort(), 'shuffle preserves every word in the group');
assert.notDeepEqual(shuffledGroup, sourceGroup, 'shuffle can change the group order');

let visiblyShuffledGroup;
try {
  Math.random = () => .999;
  visiblyShuffledGroup = shuffleGroup(sourceGroup, sourceGroup);
} finally {
  Math.random = originalRandom;
}
assert.notEqual(visiblyShuffledGroup[0], sourceGroup[0], 'every new run visibly starts with a different word');

const checks = [
  ['Hebrew-first document', /<html lang="he" dir="rtl">/],
  ['ten source words', /const words = \[[\s\S]*important[\s\S]*class[\s\S]*\];/],
  ['fresh visible random order for every run', /function resetState\(\) \{[\s\S]*runWords = shuffleGroup\(words, runWords\)[\s\S]*function shuffleGroup\(group, previousGroup = \[\]\)[\s\S]*shuffled\[0\] === previousGroup\[0\]/],
  ['every word receives a focus check', /new Set\(words\.map\(\(_, wordIndex\) => wordIndex\)\)/],
  ['assessment follows every exposure', /showChallenge\(index, false\)/],
  ['Hebrew assessment hint', /class="hebrew-hint"[\s\S]*\$\{item\.translation\}/],
  ['US English pronunciation remains', /language = 'en-US'[\s\S]*utterance\.lang = language/],
  ['arcade question tones', /async function questionCue[\s\S]*type: 'square'[\s\S]*frequency: 659/],
  ['question pause', /await sleep\(360\)/],
  ['strong arcade success cue', /async function positiveAudio[\s\S]*frequency: 1047[\s\S]*type: 'triangle'/],
  ['distinct arcade retry cue', /async function retryAudio[\s\S]*frequency: 147[\s\S]*type: 'triangle'/],
  ['no Hebrew voice feedback', /async function positiveAudio[\s\S]*await speak\(item\.word[\s\S]*async function retryAudio/],
  ['explicit audio test', /id="soundTestButton"[\s\S]*runSoundCheck/],
  ['HTML audio fallback', /createToneWave[\s\S]*playMediaTones/],
  ['square-wave arcade timbre', /type === 'square'[\s\S]*Math\.sign\(Math\.sin\(phase\)\)/],
  ['single-screen compact opening', /min-height: calc\(100svh - 64px\)[\s\S]*min-height: calc\(100svh - 52px\)/],
  ['three compact mobile world buttons', /@media \(max-width: 620px\)[\s\S]*route-picker \{ grid-template-columns: repeat\(3/],
  ['maze-chase visual lane', /class="arcade-lane"[\s\S]*arcade-runner">ᗧ[\s\S]*arcade-chaser/],
  ['arcade progress runner', /\.progress-fill::after[\s\S]*content: "ᗧ"/],
  ['mobile compact build', /height: 106px;[\s\S]*grid-template-columns: 78px minmax\(0, 1fr\)/],
  ['speech timeout fallback', /setTimeout\(finish, Math\.max\(1800, text\.length \* 180\)\)/],
  ['answers locked until cue completes', /aria-label="האות \$\{option\.toUpperCase\(\)\}" disabled/],
  ['lowercase spelling on the exposure card', /map\(letter => `<span class="letter">\$\{letter\.toLowerCase\(\)\}<\/span>`\)/],
  ['uppercase missing-letter prompt', /missing-slot">_<\/span>' : letter\.toUpperCase\(\)/],
  ['uppercase missing-letter choices', /disabled>\$\{option\.toUpperCase\(\)\}<\/button>/],
  ['corrective spaced return', /dueAt: Math\.min\(runWords\.length, completedWords \+ 2\)/],
  ['no public leaderboard', /ללא דירוג/],
  ['graphic build rewards', /class="build-piece/],
  ['animated per-word feedback', /feedbackAnimation\('success'\)[\s\S]*feedbackAnimation\('retry'\)/],
  ['live feedback', /role="status" aria-live="polite"/],
  ['reduced motion support', /prefers-reduced-motion/],
  ['forced colors support', /forced-colors: active/],
  ['mobile 320 minimum', /min-width: 320px/]
];

for (const [label, pattern] of checks) {
  assert.match(html, pattern, label);
}

for (const forbidden of ['analytics.js', 'fetch(', 'XMLHttpRequest', 'WebSocket', 'localStorage', 'sessionStorage']) {
  assert.equal(html.includes(forbidden), false, `prototype must not contain ${forbidden}`);
}

for (const forbiddenSpeech of ['he-IL', 'speakHebrewOrEnglish', 'primeSpeech']) {
  assert.equal(html.includes(forbiddenSpeech), false, `prototype must not contain Hebrew voice feedback helper ${forbiddenSpeech}`);
}

assert.equal((html.match(/class="route-card"/g) || []).length, 3, 'exactly three build choices');
assert.equal((html.match(/\{ word:/g) || []).length, 10, 'exactly ten spelling words');

console.log(`Word Forge prototype checks passed: ${checks.length + 5}`);
