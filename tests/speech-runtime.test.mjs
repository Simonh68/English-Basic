import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../speech-runtime.js', import.meta.url), 'utf8');

function createDocument() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type) {
      for (const listener of listeners.get(type) || []) listener();
    }
  };
}

function loadRuntime(windowOverrides = {}) {
  const document = createDocument();
  const window = {
    setTimeout,
    clearTimeout,
    ...windowOverrides
  };
  const context = { document, window };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { document, window, speech: window.EFN_SPEECH };
}

test('the speech layer stays safe when a mobile webview exposes no speech API', async () => {
  const { speech } = loadRuntime();

  assert.equal(speech.supported, false);
  assert.equal(speech.prime(), false);
  const result = await speech.speak('book');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'unsupported');
  assert.doesNotThrow(() => speech.cancel());
});

test('the first user gesture primes speech and late English voices are selected', async () => {
  const spoken = [];
  const listeners = new Map();
  let voices = [];
  class FakeUtterance {
    constructor(text) {
      this.text = text;
    }
  }
  const synthesis = {
    speaking: false,
    getVoices: () => voices,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    resume() {},
    cancel() {},
    speak(utterance) {
      spoken.push(utterance);
      setTimeout(() => {
        utterance.onstart?.();
        utterance.onend?.();
      }, 0);
    }
  };
  const { document, speech } = loadRuntime({
    speechSynthesis: synthesis,
    SpeechSynthesisUtterance: FakeUtterance
  });

  document.dispatch('pointerdown');
  setTimeout(() => {
    voices = [{ name: 'US English', lang: 'en-US', localService: true }];
    for (const listener of listeners.get('voiceschanged') || []) listener();
  }, 5);

  const result = await speech.speak('book', { voiceWaitMs: 100 });
  const wordUtterance = spoken.find(utterance => utterance.text === 'book');

  assert.equal(result.ok, true);
  assert.equal(result.reason, 'ended');
  assert.ok(spoken.some(utterance => utterance.text === '\u00a0'));
  assert.equal(wordUtterance.voice, voices[0]);
  assert.equal(wordUtterance.lang, 'en-US');
});

test('a mobile speech engine that never starts is resumed and retried once', async () => {
  const attempts = [];
  let cancellations = 0;
  class FakeUtterance {
    constructor(text) {
      this.text = text;
    }
  }
  const synthesis = {
    speaking: false,
    getVoices: () => [{ name: 'US English', lang: 'en-US' }],
    addEventListener() {},
    removeEventListener() {},
    resume() {},
    cancel() {
      cancellations += 1;
    },
    speak(utterance) {
      if (utterance.text !== 'book') return;
      attempts.push(utterance);
      if (attempts.length === 2) {
        setTimeout(() => {
          utterance.onstart?.();
          utterance.onend?.();
        }, 0);
      }
    }
  };
  const { speech } = loadRuntime({
    speechSynthesis: synthesis,
    SpeechSynthesisUtterance: FakeUtterance
  });

  const result = await speech.speak('book', {
    startWatchdogMs: 10,
    voiceWaitMs: 0,
    timeoutMs: 1000
  });

  assert.equal(result.ok, true);
  assert.equal(result.reason, 'ended');
  assert.equal(attempts.length, 2);
  assert.equal(cancellations, 1);
});

test('a silent utterance stuck ahead of the word is cleared before retrying', async () => {
  const attempts = [];
  class FakeUtterance {
    constructor(text) {
      this.text = text;
    }
  }
  const synthesis = {
    speaking: true,
    pending: true,
    getVoices: () => [{ name: 'US English', lang: 'en-US' }],
    addEventListener() {},
    removeEventListener() {},
    resume() {},
    cancel() {
      this.speaking = false;
      this.pending = false;
    },
    speak(utterance) {
      if (utterance.text !== 'book') return;
      attempts.push(utterance);
      if (attempts.length === 2) {
        setTimeout(() => {
          utterance.onstart?.();
          utterance.onend?.();
        }, 0);
      }
    }
  };
  const { speech } = loadRuntime({
    speechSynthesis: synthesis,
    SpeechSynthesisUtterance: FakeUtterance
  });

  const result = await speech.speak('book', {
    startWatchdogMs: 10,
    voiceWaitMs: 0,
    timeoutMs: 1000
  });

  assert.equal(result.ok, true);
  assert.equal(result.reason, 'ended');
  assert.equal(attempts.length, 2);
});
