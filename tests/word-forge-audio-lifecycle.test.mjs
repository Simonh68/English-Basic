import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const html = await readFile(new URL('../word-forge/index.html', import.meta.url), 'utf8');
const fn = name => html.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n      \\}`))[0];

function harness({ rejectMedia = false } = {}) {
  const events = new Map(), timers = new Map(), audios = [], nodes = [];
  let seq = 0, cancels = 0, resumes = 0;
  const listen = (name, callback) => events.set(name, callback);
  const document = { hidden: false, addEventListener: listen };
  class Audio {
    paused = true;
    currentTime = 0;
    playCount = 0;
    constructor() { audios.push(this); }
    play() { this.paused = false; this.playCount++; return rejectMedia ? Promise.reject(new Error('blocked')) : Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const audioContext = {
    state: 'running', currentTime: 0, destination: {},
    suspend() { this.state = 'suspended'; return Promise.resolve(); },
    resume() { this.state = 'running'; resumes++; return Promise.resolve(); },
    createOscillator() {
      const node = { stopped: false, disconnected: false, frequency: { setValueAtTime() {} },
        connect(gain) { return gain; }, start() {}, stop(at) { if (at === undefined) this.stopped = true; },
        disconnect() { this.disconnected = true; } };
      nodes.push(node); return node;
    },
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  };
  const context = vm.createContext({
    document, Audio, URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    window: { Audio, URL: {}, addEventListener: listen, AudioContext: class {} },
    speech: { cancel() { cancels++; } }, audioContext,
    setTimeout(callback) { const id = ++seq; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    createToneWave: () => ({}), pauseFeedbackAdvance() {}, clearAutoAdvance() {},
    resumeFeedbackAdvance() {}, stageMap: { open: false },
    game: { classList: { contains: () => true } }, finishStage: { hidden: true }, challengeStage: { hidden: true }
  });
  const lifecycle = html.slice(html.indexOf('      // A hidden/locked page'), html.indexOf('      for (let i = 0; i < words.length;', html.indexOf('      // A hidden/locked page')));
  vm.runInContext(`
    let soundOn = true, pageAudioPaused = false, audioGeneration = 0, cancelMediaPlayback = null;
    let mediaAudio = null, mediaAudioUrl = null, backgroundAudio = null, backgroundAudioUrl = null;
    let backgroundDuckDepth = 0, runId = 1, gameFinished = false;
    const activeToneNodes = new Set(), appleTouchSpeechMode = false;
    const backgroundVolume = .36, backgroundDuckVolume = .05, backgroundTonePattern = [];
    ${['pauseBackgroundMusic', 'playMediaTones', 'ensureBackgroundAudio', 'startBackgroundMusic', 'ensureAudioContext', 'playTones', 'duckBackground', 'restoreBackground'].map(fn).join('\n')}
    ${lifecycle}
  `, context);
  return { context, document, audios, nodes, timers, audioContext,
    fire(name, event = {}) { events.get(name)(event); },
    run(source) { return vm.runInContext(source, context); },
    get cancels() { return cancels; }, get resumes() { return resumes; } };
}

test('locking stops the loop, finish cue, speech, and pending media callbacks', async () => {
  const h = harness();
  await h.run('startBackgroundMusic()');
  const cue = h.run('playTones([{ frequency: 440, duration: 1 }])');
  await Promise.resolve();
  assert.equal(h.audios.filter(a => !a.paused).length, 2);
  h.document.hidden = true;
  h.fire('visibilitychange');
  await cue;
  assert.ok(h.audios.every(a => a.paused && a.currentTime === 0));
  assert.equal(h.audioContext.state, 'suspended');
  assert.equal(h.cancels, 1);
  assert.equal(h.timers.size, 0);
  assert.equal(h.nodes.length, 0, 'cancelled media must not fall back to Web Audio');
});

test('returning alone stays silent; an explicit gesture permits new audio', async () => {
  const h = harness();
  h.fire('pagehide');
  h.fire('visibilitychange');
  assert.equal(await h.run('startBackgroundMusic()'), false);
  await h.run('playTones([{ frequency: 440 }])');
  assert.equal(h.audios.length, 0);
  h.fire('pointerdown', { isTrusted: true });
  assert.equal(await h.run('startBackgroundMusic()'), true);
  assert.equal(h.audios[0].playCount, 1);
});

test('hidden pages cannot be unblocked by delayed or synthetic events', async () => {
  const h = harness();
  h.document.hidden = true;
  h.fire('freeze');
  h.fire('click', { isTrusted: true });
  assert.equal(await h.run('startBackgroundMusic()'), false);
  h.document.hidden = false;
  h.fire('click', { isTrusted: false });
  assert.equal(await h.run('startBackgroundMusic()'), false);
});

test('freezing stops and disconnects queued Web Audio notes so they cannot replay', async () => {
  const h = harness({ rejectMedia: true });
  const cue = h.run('playTones([{ frequency: 440 }, { frequency: 660 }])');
  for (let i = 0; i < 8; i++) await Promise.resolve();
  assert.equal(h.nodes.length, 2);
  h.fire('freeze');
  assert.ok(h.nodes.every(n => n.stopped && n.disconnected));
  h.fire('keydown', { isTrusted: true });
  h.run('ensureAudioContext()');
  assert.equal(h.resumes, 1);
  assert.ok(h.nodes.every(n => n.stopped));
  for (const callback of h.timers.values()) callback();
  await cue;
});

test('a media watchdog stops its cue without playing it a second time as fallback', async () => {
  const h = harness();
  const cue = h.run('playTones([{ frequency: 440 }])');
  await Promise.resolve();
  for (const callback of [...h.timers.values()]) callback();
  await cue;
  assert.equal(h.audios[0].paused, true);
  assert.equal(h.nodes.length, 0);
});
