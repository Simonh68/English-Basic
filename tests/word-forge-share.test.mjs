import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const html = await readFile(new URL('../word-forge/index.html', import.meta.url), 'utf8');
const progressSource = await readFile(new URL('../progress.js', import.meta.url), 'utf8');
const fn = name => html.match(new RegExp(`function ${name}\\([^]*?\\n      \\}`))[0];
const build = new Function(`${fn('buildProgressShareMessage')}; return buildProgressShareMessage;`)();

test('the share summary reports only valid Word Forge coins/stages and does not invent an activity date', () => {
  const message = build({ wordForgeCoins: 85, xp: 9999, lastActive: '2026-09-27',
    name: 'PRIVATE', email: 'PRIVATE', answer: 'PRIVATE',
    wordForgeCompletedStages: ['2-10', '1-3', '1-2', '1-2', '9-1', '1-11', '<img>'] }, 'Word Forge');
  assert.equal(message, 'Word Forge · English Practice Progress\nCoins: 85\nCompleted stages: 3/50\nLevel 1: stages 2, 3\nLevel 2: stages 10\nLast practice: Not recorded\nSaved on this device; self-reported progress.');
  assert.doesNotMatch(message, /PRIVATE|9999|2026-09-27|\n\n/);
  assert.match(build({ wordForgePoints: 9, wordForgeLastActive: '2026-09-27' }, 'MAAYAN'), /^MAAYAN[^]*Coins: 9[^]*Last practice: 2026-09-27/);
});

function openPreview(getProfile) {
  const preview = {}, status = {}, send = { hidden: false, href: 'stale', removeAttribute(k) { delete this[k]; } };
  let stopped = 0, shown = 0;
  const context = vm.createContext({
    progressApi: { getProfile }, progressSharePreview: preview, progressShareStatus: status, progressShareSend: send,
    progressShareDialog: {}, document: { querySelector: id => id === '#introTitle' ? { textContent: 'MAAYAN' } : { focus() {} } },
    clearAutoAdvance() {}, stopAllAudio() { stopped++; }, showDialog() { shown++; }
  });
  vm.runInContext(`let progressShareTrigger; ${fn('buildProgressShareMessage')} ${fn('openProgressShare')}; openProgressShare({ currentTarget: {} });`, context);
  return { preview, status, send, stopped, shown };
}

test('preview and WhatsApp payload match exactly, with no recipient or automatic send', () => {
  const h = openPreview(() => ({ wordForgeCoins: 123, wordForgeCompletedStages: ['1-1'] }));
  assert.equal(h.shown, 1);
  assert.equal(h.stopped, 1);
  assert.equal(h.send.hidden, false);
  const url = new URL(h.send.href);
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/');
  assert.equal(url.searchParams.get('text'), h.preview.textContent);
  assert.equal([...url.searchParams].length, 1);
});

test('empty or inaccessible local data cannot send a misleading zero-progress report', () => {
  for (const getProfile of [() => ({}), () => { throw new Error('storage denied'); }]) {
    const h = openPreview(getProfile);
    assert.equal(h.send.hidden, true);
    assert.equal(h.send.href, undefined);
    assert.ok(h.status.textContent);
  }
});

test('Word Forge date is stored only for its activity; viewing a report does not create practice', () => {
  const items = new Map();
  const context = vm.createContext({ window: { dispatchEvent() {} }, CustomEvent: class {},
    localStorage: { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value) } });
  vm.runInContext(progressSource, context);
  const api = context.window.EBR_PROGRESS;
  assert.equal(api.getProfile().wordForgeLastActive, null);
  api.recordPractice('cards');
  api.startGameSession({ game: 'another_game' });
  api.recordGame(true, 9, { game: 'another_game' });
  assert.equal(api.getProfile().wordForgeLastActive, null);
  api.recordGame(true, 5, { game: 'word_forge', xp: 5 });
  api.completeWordForgeStage(2, 3);
  const result = api.getProfile();
  assert.equal(result.wordForgeLastActive, api.dateKey());
  assert.equal(result.wordForgeCoins, 5);
  assert.deepEqual(Array.from(result.wordForgeCompletedStages), ['2-3']);
});
