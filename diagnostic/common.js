(() => {
  'use strict';

  const STORAGE_PREFIX = 'efn-diagnostic-v2';
  const TARGET_MS = 10000;
  const READING_TARGET_MS = 20000;
  const BASE_POINTS = 4;
  const letters = ['A', 'B', 'C', 'D'];
  const levelValues = { A: 25, C: 50, E: 75, G: 100 };
  const CORE_I_PROGRESS_KEY = 'efn.band2.core1.progress.v1';
  const BAND_II_BASE = 'https://simonh68.github.io/E-Vocab-Band-II/';
  const BAND_III_BASE = 'https://simonh68.github.io/module-e-vocab/';
  const READ_ALONG_BASE = `${BAND_II_BASE}Read-Along/reader.html?id=`;

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try { localStorage.setItem(`${STORAGE_PREFIX}:${key}`, JSON.stringify(value)); } catch {}
  }

  function removeStorage(key) {
    try { localStorage.removeItem(`${STORAGE_PREFIX}:${key}`); } catch {}
  }

  function getSessionId() {
    return new URLSearchParams(location.search).get('session') || '';
  }

  function createSession() {
    const random = crypto.getRandomValues(new Uint32Array(2));
    const id = `${Date.now().toString(36)}-${random[0].toString(36)}${random[1].toString(36)}`;
    const session = { id, startedAt: new Date().toISOString() };
    writeStorage('active-session', session);
    removeStorage('active-vocabulary');
    return session;
  }

  function validSession(sessionId) {
    const session = readStorage('active-session', null);
    return Boolean(sessionId && session?.id === sessionId) ? session : null;
  }

  async function loadJson(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Unable to load ${path}`);
    return response.json();
  }

  async function loadManifest() {
    return loadJson('data/manifest.json');
  }

  function shuffle(values) {
    const copy = [...values];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const random = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
      const target = Math.floor(random * (index + 1));
      [copy[index], copy[target]] = [copy[target], copy[index]];
    }
    return copy;
  }

  function selectFresh(items, count, historyKey, version, key = item => item.id) {
    const storageKey = `history:${version}:${historyKey}`;
    const history = readStorage(storageKey, []);
    const recent = new Set(history.slice(-Math.max(count * 5, 40)));
    let pool = items.filter(item => !recent.has(key(item)));
    if (pool.length < count) pool = items;
    const selected = shuffle(pool).slice(0, count);
    const updated = [...history, ...selected.map(key)].slice(-300);
    writeStorage(storageKey, updated);
    return selected;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function startQuestionClock(valueElement, trackElement, wrapperElement, targetMs = TARGET_MS) {
    const startedAt = performance.now();
    let frame = 0;
    let stopped = false;

    function paint() {
      if (stopped) return;
      const elapsed = performance.now() - startedAt;
      const remaining = Math.max(0, targetMs - elapsed);
      const overtime = elapsed > targetMs;
      wrapperElement?.classList.toggle('is-overtime', overtime);
      if (valueElement) {
        valueElement.textContent = overtime
          ? `+${((elapsed - targetMs) / 1000).toFixed(1)}`
          : (remaining / 1000).toFixed(1);
      }
      if (trackElement) trackElement.style.width = `${Math.max(0, (remaining / targetMs) * 100)}%`;
      frame = requestAnimationFrame(paint);
    }

    paint();
    return {
      stop() {
        if (!stopped) {
          stopped = true;
          cancelAnimationFrame(frame);
        }
        return Math.max(0, performance.now() - startedAt);
      }
    };
  }

  function scoreTimedAnswer(correct, elapsedMs, targetMs = TARGET_MS) {
    if (!correct) return 0;
    if (elapsedMs <= targetMs / 2) return 5;
    if (elapsedMs <= targetMs) return BASE_POINTS;
    if (elapsedMs <= targetMs * 1.5) return 3;
    if (elapsedMs <= targetMs * 2) return 2;
    return 1;
  }

  function scoreRatio(answers) {
    if (!answers.length) return 0;
    const points = answers.reduce((sum, answer) => sum + Number(answer.points || 0), 0);
    return Math.min(1, points / (answers.length * BASE_POINTS));
  }

  function visibleReadingParagraphs(paragraphs, questionIndex, scope) {
    const list = Array.isArray(paragraphs) ? paragraphs : [];
    if (scope === 'whole-text') return [...list];
    const paragraph = list[Number(questionIndex)];
    return typeof paragraph === 'string' ? [paragraph] : [];
  }

  function vocabularyLevel(summary) {
    const first = summary['Core I'];
    const second = summary['Core II'];
    const third = summary['Band III'];
    if (!first || first.correct < 2 || first.ratio < 0.55) return 'A';
    if (!second || second.correct < 2 || second.ratio < 0.60) return 'A';
    if (!third || third.correct < 3 || third.ratio < 0.65) return 'C';
    return 'E';
  }

  function combineLevels(firstLevel, secondLevel, foundationalPassed) {
    const first = levelValues[firstLevel] || levelValues.A;
    const second = levelValues[secondLevel] || levelValues.A;
    const lower = Math.min(first, second);
    const higher = Math.max(first, second);
    let weightedScore = Math.round((lower * 0.70) + (higher * 0.30));
    let level = weightedScore < 38 ? 'A' : weightedScore < 63 ? 'C' : weightedScore < 88 ? 'E' : 'G';
    if (!foundationalPassed) {
      weightedScore = Math.min(weightedScore, levelValues.A);
      level = 'A';
    }
    return { level, weightedScore };
  }

  function recommendation(icon, title, detail, href) {
    return { icon, title, detail, href };
  }

  function nextCoreIGroup() {
    try {
      const progress = JSON.parse(localStorage.getItem(CORE_I_PROGRESS_KEY) || 'null');
      if (!progress || progress.version !== 1 || !progress.groups) return 1;
      for (let group = 1; group <= 20; group += 1) {
        const key = String(group).padStart(2, '0');
        if (!progress.groups[key]?.completedAt) return group;
      }
      return 21;
    } catch {
      return 1;
    }
  }

  function groupHref(group) {
    return `${BAND_II_BASE}groups/group-${String(group).padStart(2, '0')}.html`;
  }

  function vocabularyRecommendation(vocabularyLevel, foundationalPassed) {
    if (!foundationalPassed) {
      return recommendation(
        'Aa',
        'אוצר מילים בסיסי',
        'Band I · קבוצה 01',
        '../lesson.html?level=1&lesson=1&mode=cards'
      );
    }
    if (vocabularyLevel === 'A') {
      const group = nextCoreIGroup();
      const core = group <= 20 ? 'Core I' : 'Core II';
      const displayedGroup = group <= 20 ? group : group - 20;
      return recommendation(
        'Aa',
        'קבוצת אוצר המילים הבאה',
        `${core} · קבוצה ${String(displayedGroup).padStart(2, '0')}`,
        groupHref(group)
      );
    }
    if (vocabularyLevel === 'C') {
      return recommendation('Aa', 'קבוצת אוצר המילים הבאה', 'Core II · קבוצה 01', groupHref(21));
    }
    return recommendation('Aa', 'קבוצת אוצר המילים הבאה', 'Band III · קבוצה A1', `${BAND_III_BASE}A1.html`);
  }

  function storyRecommendation(level, foundationalPassed) {
    const storyId = !foundationalPassed || level === 'A'
      ? 'l1-a1-new-student'
      : level === 'C'
        ? 'l2-a1-wallet'
        : level === 'G'
          ? 'l3-a2-anonymous-account'
          : 'l3-a1-final-place';
    return recommendation('R', 'סיפור קריאה מתאים', 'פתיחת סיפור ישירות ברמת הקריאה המתאימה.', `${READ_ALONG_BASE}${storyId}`);
  }

  function combinedRecommendations(level, foundationalPassed, vocabularyLevel = level) {
    const items = [];
    if (!foundationalPassed) {
      items.push(recommendation('▶', 'משחק יסודות הקריאה', 'תרגול זיהוי אותיות, מילים ודיוק בקריאה.', '../word-forge/?level=1&lesson=1'));
    }
    items.push(vocabularyRecommendation(vocabularyLevel, foundationalPassed));
    items.push(storyRecommendation(level, foundationalPassed));
    return items;
  }

  function renderRecommendations(container, items) {
    container.innerHTML = items.map(item => `<a class="recommendation-item" href="${escapeHtml(item.href)}">
      <span class="recommendation-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>
      <span class="recommendation-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></span>
      <span class="recommendation-arrow" aria-hidden="true">←</span>
    </a>`).join('');
  }

  window.EFN_DIAGNOSTIC = {
    TARGET_MS,
    READING_TARGET_MS,
    BASE_POINTS,
    letters,
    readStorage,
    writeStorage,
    removeStorage,
    getSessionId,
    createSession,
    validSession,
    loadJson,
    loadManifest,
    shuffle,
    selectFresh,
    escapeHtml,
    startQuestionClock,
    scoreTimedAnswer,
    scoreRatio,
    visibleReadingParagraphs,
    vocabularyLevel,
    combineLevels,
    nextCoreIGroup,
    combinedRecommendations,
    renderRecommendations
  };
})();
