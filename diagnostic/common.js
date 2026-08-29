(() => {
  'use strict';

  const STORAGE_PREFIX = 'efn-diagnostic-v2';
  const TARGET_MS = 8000;
  const BASE_POINTS = 4;
  const letters = ['A', 'B', 'C', 'D'];
  const levelValues = { A: 25, C: 50, E: 75, G: 100 };

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

  function getGrade() {
    const params = new URLSearchParams(location.search);
    const queryGrade = Number(params.get('grade'));
    if (queryGrade >= 7 && queryGrade <= 12) {
      writeStorage('grade', queryGrade);
      return queryGrade;
    }
    const stored = Number(readStorage('grade', 0));
    return stored >= 7 && stored <= 12 ? stored : null;
  }

  function setGrade(grade) {
    const value = Number(grade);
    if (value >= 7 && value <= 12) writeStorage('grade', value);
  }

  function getSessionId() {
    return new URLSearchParams(location.search).get('session') || '';
  }

  function createSession(grade) {
    const random = crypto.getRandomValues(new Uint32Array(2));
    const id = `${Date.now().toString(36)}-${random[0].toString(36)}${random[1].toString(36)}`;
    const session = { id, grade: Number(grade), startedAt: new Date().toISOString() };
    writeStorage('active-session', session);
    removeStorage('active-vocabulary');
    return session;
  }

  function validSession(sessionId) {
    const session = readStorage('active-session', null);
    return Boolean(sessionId && session?.id === sessionId) ? session : null;
  }

  function gradeLabel(grade) {
    return ({ 7: 'ז׳', 8: 'ח׳', 9: 'ט׳', 10: 'י׳', 11: 'י״א', 12: 'י״ב' })[grade] || 'לא צוינה';
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

  function startQuestionClock(valueElement, trackElement, wrapperElement) {
    const startedAt = performance.now();
    let frame = 0;
    let stopped = false;

    function paint() {
      if (stopped) return;
      const elapsed = performance.now() - startedAt;
      const remaining = Math.max(0, TARGET_MS - elapsed);
      const overtime = elapsed > TARGET_MS;
      wrapperElement?.classList.toggle('is-overtime', overtime);
      if (valueElement) {
        valueElement.textContent = overtime
          ? `+${((elapsed - TARGET_MS) / 1000).toFixed(1)}`
          : (remaining / 1000).toFixed(1);
      }
      if (trackElement) trackElement.style.width = `${Math.max(0, (remaining / TARGET_MS) * 100)}%`;
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

  function scoreTimedAnswer(correct, elapsedMs) {
    if (!correct) return 0;
    if (elapsedMs <= 4000) return 5;
    if (elapsedMs <= TARGET_MS) return BASE_POINTS;
    if (elapsedMs <= 12000) return 3;
    if (elapsedMs <= 16000) return 2;
    return 1;
  }

  function scoreRatio(answers) {
    if (!answers.length) return 0;
    const points = answers.reduce((sum, answer) => sum + Number(answer.points || 0), 0);
    return Math.min(1, points / (answers.length * BASE_POINTS));
  }

  function vocabularyLevel(summary) {
    const first = summary['Core I'];
    const second = summary['Core II'];
    const third = summary['Band III'];
    if (!first || first.correct < 2 || first.ratio < 0.55) return 'A';
    if (!second || second.correct < 2 || second.ratio < 0.60) return 'C';
    if (!third || third.correct < 3 || third.ratio < 0.65) return 'E';
    return 'G';
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

  function placementCopy(level, grade) {
    if (level === 'A') return 'המסלול המתאים כרגע הוא הכנה לשאלון A — <strong>3 יחידות</strong>.';
    if (level === 'C') {
      if (grade === 9) return 'בכיתה ט׳, הרמה מתאימה לכיוון של <strong>4–5 יחידות</strong>.';
      if (grade === 10) return 'בכיתה י׳, הרמה מתאימה למסלול של <strong>4 יחידות</strong>.';
      if (grade === 11) return 'בכיתה י״א, הרמה מתאימה למסלול של <strong>3–4 יחידות</strong>.';
      return `הרמה מתאימה להכנה לשאלון C. את מסלול היחידות לכיתה ${gradeLabel(grade)} יקבע המורה.`;
    }
    if (level === 'E') {
      if (grade <= 9) return `בכיתה ${gradeLabel(grade)}, הרמה מתאימה למסלול <strong>5 יחידות מואץ</strong>.`;
      if (grade === 10) return 'בכיתה י׳, הרמה מתאימה למסלול של <strong>5 יחידות</strong>.';
      if (grade === 11) return 'בכיתה י״א, הרמה מתאימה למסלול של <strong>4–5 יחידות</strong>.';
      return `הרמה מתאימה להכנה לשאלון E. את מסלול היחידות לכיתה ${gradeLabel(grade)} יקבע המורה.`;
    }
    return grade <= 10
      ? `בכיתה ${gradeLabel(grade)}, הרמה מתאימה למסלול <strong>5 יחידות מואץ</strong>.`
      : 'הרמה מתאימה למסלול של <strong>5 יחידות</strong>.';
  }

  function recommendation(icon, title, detail, href) {
    return { icon, title, detail, href };
  }

  function combinedRecommendations(level, foundationalPassed) {
    if (!foundationalPassed) {
      return [
        recommendation('Aa', 'חיזוק קריאה בסיסית', 'תרגול הבחנה בין מילים דומות לפני המשך ההכנה.', '../index.html'),
        recommendation('▶', 'Word Forge', 'תרגול מהיר של זיהוי מילים ודיוק בקריאה.', '../word-forge/'),
        recommendation('R', 'Read Along', 'התחלה מסיפורים קצרים ברמות הנמוכות.', 'https://simonh68.github.io/E-Vocab-Band-II/Read-Along/')
      ];
    }
    if (level === 'A') {
      return [
        recommendation('EB', 'English Basic', 'חיזוק הדרגתי של יסודות הקריאה.', '../index.html'),
        recommendation('▶', 'Word Forge', 'תרגול מהיר של זיהוי מילים ודיוק בקריאה.', '../word-forge/'),
        recommendation('R', 'Read Along', 'סיפורים קצרים ברמות הנמוכות.', 'https://simonh68.github.io/E-Vocab-Band-II/Read-Along/')
      ];
    }
    if (level === 'C') {
      return [
        recommendation('R', 'Read Along', 'קריאה מדורגת ברמות הביניים.', 'https://simonh68.github.io/E-Vocab-Band-II/Read-Along/'),
        recommendation('Aa', 'תרגול אוצר מילים', 'חיזוק המילים התומכות בקריאה ברמה הזאת.', 'https://simonh68.github.io/E-Vocab-Band-II/')
      ];
    }
    return [
      recommendation('R', 'Read Along', level === 'G' ? 'בחירת הסיפורים המתקדמים ביותר במאגר.' : 'בחירת סיפורים מתקדמים המתאימים לרמה.', 'https://simonh68.github.io/E-Vocab-Band-II/Read-Along/'),
      recommendation('Aa', 'אוצר מילים לבגרות', 'תרגול מתקדם של מילים והבנתן מתוך הקשר.', 'https://simonh68.github.io/module-e-vocab/')
    ];
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
    BASE_POINTS,
    letters,
    readStorage,
    writeStorage,
    removeStorage,
    getGrade,
    setGrade,
    getSessionId,
    createSession,
    validSession,
    gradeLabel,
    loadJson,
    loadManifest,
    shuffle,
    selectFresh,
    escapeHtml,
    startQuestionClock,
    scoreTimedAnswer,
    scoreRatio,
    vocabularyLevel,
    combineLevels,
    placementCopy,
    combinedRecommendations,
    renderRecommendations
  };
})();
