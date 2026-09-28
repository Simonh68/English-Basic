import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const html = await readFile(new URL('../word-forge/index.html', import.meta.url), 'utf8');
const progressSource = await readFile(new URL('../progress.js', import.meta.url), 'utf8');
const fn = name => html.match(new RegExp(`function ${name}\\([^]*?\\n      \\}`))[0];
const build = new Function(`${fn('normalizeProgressShareName')} ${fn('buildProgressShareMessage')}; return buildProgressShareMessage;`)();

test('the share summary reports only valid Word Forge coins/stages and does not invent an activity date', () => {
  const message = build({ wordForgeCoins: 85, xp: 9999, lastActive: '2026-09-27',
    name: 'PRIVATE', email: 'PRIVATE', answer: 'PRIVATE',
    wordForgeCompletedStages: ['2-10', '1-3', '1-2', '1-2', '9-1', '1-11', '<img>'] }, 'Word Forge');
  assert.equal(message, 'Word Forge · English Practice Progress\nCoins: 85\nCompleted stages: 3/50\nLevel 1: stages 2, 3\nLevel 2: stages 10\nLast practice: Not recorded\nSaved on this device; self-reported progress.');
  assert.doesNotMatch(message, /PRIVATE|9999|2026-09-27|\n\n/);
  assert.match(build({ wordForgePoints: 9, wordForgeLastActive: '2026-09-27' }, 'MAAYAN'), /^MAAYAN[^]*Coins: 9[^]*Last practice: 2026-09-27/);
});

function openChoice(getProfile) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: '', textContent: '', hidden: false, href: 'stale', listeners: {},
      addEventListener(type, callback) { this.listeners[type] = callback; },
      removeAttribute(key) { delete this[key]; },
      focus() { this.focused = true; }
    });
    return elements.get(id);
  }
  element('#introTitle').textContent = 'MAAYAN';
  let stopped = 0, shown = 0, profileReads = 0;
  const context = vm.createContext({
    progressApi: { getProfile() { profileReads++; return getProfile(); } },
    document: { querySelector: element },
    localStorage: { setItem() { throw new Error('Sharing must not store a name'); } },
    sessionStorage: { setItem() { throw new Error('Sharing must not store a name'); } },
    clearAutoAdvance() {}, stopAllAudio() { stopped++; }, showDialog() { shown++; },
    closeDialog(dialog) { dialog.listeners.close(); }
  });
  const block = html.slice(html.indexOf("      const progressShareDialog ="), html.indexOf("      let route = 'space';"));
  vm.runInContext(block, context);
  const act = (id, type = 'click', event = {}) => element(id).listeners[type]({ currentTarget: element(id), preventDefault() {}, ...event });
  act('#whatsappShareBtn');
  return {
    element, act, preview: element('#progressSharePreview'), status: element('#progressShareStatus'), send: element('#progressShareSend'),
    get stopped() { return stopped; }, get shown() { return shown; }, get profileReads() { return profileReads; }
  };
}

function openPreview(getProfile) {
  const h = openChoice(getProfile);
  h.act('#progressShareNameNo');
  return h;
}

test('sharing asks for an explicit name choice before creating any message or link', () => {
  const h = openChoice(() => ({ wordForgeCoins: 9, name: 'SAVED PRIVATE NAME' }));
  assert.equal(h.profileReads, 0);
  assert.equal(h.preview.textContent, '');
  assert.equal(h.send.href, undefined);
  assert.equal(h.send.hidden, true);
  assert.equal(h.element('#progressShareNameInput').value, '');
  assert.equal(h.element('#progressShareNameForm').hidden, true);
  assert.equal(h.element('#progressSharePreviewStep').hidden, true);
});

test('only a name explicitly entered for this message appears in the preview and WhatsApp URL', () => {
  const profile = Object.freeze({ wordForgeCoins: 9, name: 'STORED NAME' });
  const h = openChoice(() => profile);
  h.act('#progressShareNameYes');
  assert.equal(h.element('#progressShareNameForm').hidden, false);
  assert.equal(h.element('#progressShareNameInput').focused, true);
  h.element('#progressShareNameInput').value = '  דני\nലീല & <test>  ';
  h.act('#progressShareNameForm', 'submit');
  assert.match(h.preview.textContent, /\nStudent: דני ലീല & <test>\n/);
  assert.doesNotMatch(h.preview.textContent, /STORED NAME/);
  assert.equal(new URL(h.send.href).searchParams.get('text'), h.preview.textContent);
  assert.equal(h.element('#progressShareNameInput').value, '');
  assert.deepEqual(profile, { wordForgeCoins: 9, name: 'STORED NAME' });
});

test('choosing no discards typed names and never imports a profile or certificate name', () => {
  const h = openChoice(() => ({ wordForgeCoins: 10, name: 'PRIVATE', certificateName: 'PRIVATE' }));
  h.act('#progressShareNameYes');
  h.element('#progressShareNameInput').value = 'PRIVATE';
  h.act('#progressShareNameNo');
  assert.doesNotMatch(h.preview.textContent, /Student:|PRIVATE/);
  assert.equal(h.element('#progressShareNameInput').value, '');
});

test('blank names stay at the question and can be skipped; name lines cannot inject extra report lines', () => {
  const h = openChoice(() => ({ wordForgeCoins: 10 }));
  h.act('#progressShareNameYes');
  h.element('#progressShareNameInput').value = '  \n\t ';
  h.act('#progressShareNameForm', 'submit');
  assert.equal(h.element('#progressShareNameStep').hidden, false);
  assert.equal(h.send.href, undefined);
  assert.ok(h.status.textContent);
  h.act('#progressShareNameNo');
  assert.equal(h.send.hidden, false);
  const message = build({ wordForgeCoins: 10 }, 'Word Forge', 'Name\nCoins: 999\u202e');
  assert.match(message, /Student: Name Coins: 999\nCoins: 10/);
  assert.doesNotMatch(message, /\u202e/);
  assert.equal(build({}, 'Word Forge', 'a'.repeat(100)).split('\n')[1], `Student: ${'a'.repeat(80)}`);
});

test('back, close and reopening clear the name, preview and share URL', () => {
  const h = openChoice(() => ({ wordForgeCoins: 10 }));
  for (const action of ['#progressShareBack', '#progressShareClose']) {
    h.act('#progressShareNameYes');
    h.element('#progressShareNameInput').value = 'TEMP NAME';
    h.act('#progressShareNameForm', 'submit');
    h.act(action);
    assert.equal(h.preview.textContent, '');
    assert.equal(h.send.href, undefined);
    assert.equal(h.element('#progressShareNameInput').value, '');
    h.act('#whatsappShareBtn');
    assert.equal(h.element('#progressShareNameForm').hidden, true);
    assert.equal(h.profileReads > 0, true);
  }
  h.act('#progressShareNameYes');
  h.element('#progressShareNameInput').value = 'CANCELLED NAME';
  h.act('#progressShareDialog', 'close');
  assert.equal(h.element('#progressShareNameInput').value, '');
});

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
  const h = openChoice(() => ({}));
  h.act('#progressShareNameYes');
  h.element('#progressShareNameInput').value = 'Completed stages: 9';
  h.act('#progressShareNameForm', 'submit');
  assert.equal(h.send.hidden, true);
  assert.equal(h.send.href, undefined);
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
