(() => {
  const synthesis = window.speechSynthesis;
  const Utterance = window.SpeechSynthesisUtterance;
  const supported = Boolean(synthesis && Utterance);
  const START_WATCHDOG_MS = 900;
  const RETRY_DELAY_MS = 120;
  let cachedVoices = [];
  let cancelGeneration = 0;
  let primed = false;
  let voiceWaitFinished = false;

  function refreshVoices() {
    if (!supported) return [];
    try {
      const voices = synthesis.getVoices();
      if (voices.length) {
        cachedVoices = voices;
        voiceWaitFinished = true;
      }
    } catch {
      // A late-loading mobile speech service can throw while it starts.
    }
    return cachedVoices;
  }

  function voiceFor(language = 'en-US') {
    const voices = refreshVoices();
    const baseLanguage = language.split('-')[0].toLowerCase();
    return voices.find(voice => voice.lang?.toLowerCase() === language.toLowerCase())
      || voices.find(voice => voice.lang?.toLowerCase().startsWith(`${baseLanguage}-`))
      || voices.find(voice => voice.lang?.toLowerCase() === baseLanguage)
      || null;
  }

  function resume() {
    if (!supported) return false;
    try {
      synthesis.resume();
      return true;
    } catch {
      return false;
    }
  }

  function prime() {
    if (!supported) return false;
    refreshVoices();
    resume();
    if (primed) return true;

    try {
      const utterance = new Utterance('\u00a0');
      utterance.lang = 'en-US';
      utterance.rate = 10;
      utterance.volume = 0;
      synthesis.speak(utterance);
      primed = true;
      return true;
    } catch {
      return false;
    }
  }

  function prepareVoices(waitMs = 350) {
    if (!supported) return Promise.resolve([]);
    const available = refreshVoices();
    if (available.length || voiceWaitFinished || waitMs <= 0 || typeof synthesis.addEventListener !== 'function') {
      return Promise.resolve(available);
    }

    return new Promise(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        voiceWaitFinished = true;
        synthesis.removeEventListener('voiceschanged', finish);
        resolve(refreshVoices());
      };
      synthesis.addEventListener('voiceschanged', finish, { once: true });
      window.setTimeout(finish, waitMs);
    });
  }

  function cancel() {
    cancelGeneration += 1;
    primed = false;
    if (!supported) return;
    try {
      synthesis.cancel();
    } catch {
      return;
    }
    window.setTimeout(resume, 0);
  }

  async function speak(text, options = {}) {
    const value = String(text ?? '').trim();
    if (!value) return { ok: false, reason: 'empty' };
    if (!supported) return { ok: false, reason: 'unsupported' };

    const language = options.language || 'en-US';
    const generation = cancelGeneration;
    const timeoutMs = options.timeoutMs
      || Math.min(30000, Math.max(2400, value.length * 220 + 1200));

    prime();
    resume();
    await prepareVoices(options.voiceWaitMs ?? 350);
    if (generation !== cancelGeneration) return { ok: false, reason: 'cancelled' };

    return new Promise(resolve => {
      let settled = false;
      let attempt = 0;
      let startTimer = 0;
      let hardTimer = 0;

      const finish = (ok, reason) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(startTimer);
        window.clearTimeout(hardTimer);
        resolve({ ok, reason });
      };

      const launch = () => {
        if (settled) return;
        if (generation !== cancelGeneration) {
          finish(false, 'cancelled');
          return;
        }

        attempt += 1;
        let started = false;
        const utterance = new Utterance(value);
        utterance.lang = language;
        utterance.rate = options.rate ?? 0.8;
        utterance.pitch = options.pitch ?? 1;
        utterance.volume = options.volume ?? 1;
        const selectedVoice = voiceFor(language);
        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.onstart = () => {
          started = true;
          window.clearTimeout(startTimer);
        };
        utterance.onend = () => finish(true, 'ended');
        utterance.onerror = event => {
          const reason = event?.error || 'error';
          if (generation !== cancelGeneration || reason === 'canceled' || reason === 'interrupted') {
            finish(false, 'cancelled');
            return;
          }
          if (!started && attempt < 2 && reason !== 'not-allowed') {
            window.clearTimeout(startTimer);
            utterance.onstart = null;
            utterance.onend = null;
            utterance.onerror = null;
            resume();
            window.setTimeout(launch, RETRY_DELAY_MS);
            return;
          }
          finish(false, reason);
        };

        resume();
        try {
          synthesis.speak(utterance);
        } catch {
          if (attempt < 2) {
            window.setTimeout(launch, RETRY_DELAY_MS);
          } else {
            finish(false, 'exception');
          }
          return;
        }

        startTimer = window.setTimeout(() => {
          if (settled || started || generation !== cancelGeneration) return;
          if (synthesis.speaking && !synthesis.pending) {
            started = true;
            return;
          }

          utterance.onstart = null;
          utterance.onend = null;
          utterance.onerror = null;
          try {
            synthesis.cancel();
          } catch {
            // The retry below is still safe if cancel is unavailable.
          }
          resume();
          if (attempt < 2) {
            window.setTimeout(launch, RETRY_DELAY_MS);
          } else {
            finish(false, 'not-started');
          }
        }, options.startWatchdogMs ?? START_WATCHDOG_MS);
      };

      hardTimer = window.setTimeout(() => finish(false, 'timeout'), timeoutMs);
      launch();
    });
  }

  if (supported) {
    refreshVoices();
    if (typeof synthesis.addEventListener === 'function') {
      synthesis.addEventListener('voiceschanged', refreshVoices);
    }
  }

  const primeFromGesture = () => {
    if (!prime()) return;
    document.removeEventListener('pointerdown', primeFromGesture, true);
    document.removeEventListener('touchstart', primeFromGesture, true);
    document.removeEventListener('mousedown', primeFromGesture, true);
    document.removeEventListener('keydown', primeFromGesture, true);
  };
  document.addEventListener('pointerdown', primeFromGesture, { capture: true, passive: true });
  document.addEventListener('touchstart', primeFromGesture, { capture: true, passive: true });
  document.addEventListener('mousedown', primeFromGesture, { capture: true, passive: true });
  document.addEventListener('keydown', primeFromGesture, true);

  window.EFN_SPEECH = Object.freeze({
    supported,
    cancel,
    prepareVoices,
    prime,
    refreshVoices,
    resume,
    speak,
    voiceFor
  });
})();
