(() => {
  'use strict';

  const STORAGE_PREFIX = 'efn-diagnostic-v1';
  const letters = ['A', 'B', 'C', 'D'];

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
    const recent = new Set(history.slice(-Math.max(count * 5, 60)));
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

  function coverageEstimate(correct, total) {
    const ratio = total ? correct / total : 0;
    if (ratio <= 0.17) return { label: '0%–25%', midpoint: 13, status: 'כיסוי התחלתי' };
    if (ratio <= 0.42) return { label: '25%–50%', midpoint: 38, status: 'כיסוי חלקי' };
    if (ratio <= 0.67) return { label: '50%–75%', midpoint: 63, status: 'כיסוי בינוני' };
    if (ratio <= 0.84) return { label: '75%–90%', midpoint: 83, status: 'כיסוי גבוה' };
    return { label: '90%–100%', midpoint: 95, status: 'כיסוי מלא כמעט' };
  }

  function vocabularyComparison(grade, results) {
    const mastered = key => (results[key]?.correct || 0) / (results[key]?.total || 1) >= 0.8;
    if (mastered('Band III')) {
      return grade <= 9
        ? `בכיתה ${gradeLabel(grade)}, כיסוי גבוה של Band III מתאים לרמת <strong>5 יחידות מואץ</strong>.`
        : `בכיתה ${gradeLabel(grade)}, כיסוי גבוה של Band III מתאים לרמת <strong>5 יחידות</strong>.`;
    }
    if (mastered('Core II') && grade <= 9) {
      return `בכיתה ${gradeLabel(grade)}, כיסוי גבוה של Core II מתאים לרמת <strong>הקבצה א׳</strong>.`;
    }
    if (mastered('Core I') && grade <= 8) {
      return `בכיתה ${gradeLabel(grade)}, כיסוי גבוה של Core I מתאים לרמת <strong>הקבצה א׳</strong>.`;
    }
    return `התוצאה לכיתה ${gradeLabel(grade)} מוצגת כפרופיל כיסוי. ההמלצות מתמקדות במאגר הבא שצריך לחזק.`;
  }

  function readingComparison(level, grade) {
    if (level === 'A') return `רמת שאלון A משויכת תמיד למסלול של <strong>3 יחידות</strong>.`;
    if (level === 'C') {
      if (grade === 9) return `בכיתה ט׳, רמת C מתאימה לכיוון של <strong>4–5 יחידות</strong>.`;
      if (grade === 10) return `בכיתה י׳, רמת C מתאימה למסלול של <strong>4 יחידות</strong>.`;
      if (grade === 11) return `בכיתה י״א, רמת C מתאימה למסלול של <strong>3–4 יחידות</strong>.`;
      return `רמת הקריאה שנמדדה היא C. ההשוואה המדויקת לכיתה ${gradeLabel(grade)} תישאר בפרופיל המורה.`;
    }
    if (level === 'E') {
      if (grade <= 9) return `בכיתה ${gradeLabel(grade)}, רמת E מתאימה לרמת <strong>5 יחידות מואץ</strong>.`;
      if (grade === 10) return `בכיתה י׳, רמת E מתאימה למסלול של <strong>5 יחידות</strong>.`;
      if (grade === 11) return `בכיתה י״א, רמת E מתאימה למסלול של <strong>4–5 יחידות</strong>.`;
      return `רמת הקריאה שנמדדה היא E. ההשוואה המדויקת לכיתה ${gradeLabel(grade)} תישאר בפרופיל המורה.`;
    }
    if (level === 'G') {
      return grade <= 10
        ? `בכיתה ${gradeLabel(grade)}, רמת G מתאימה לרמת <strong>5 יחידות מואץ</strong>.`
        : `רמת G מתאימה למסלול של <strong>5 יחידות</strong>.`;
    }
    return 'לא נאספו די תשובות לקביעת רמת קריאה.';
  }

  function recommendation(icon, title, detail, href) {
    return { icon, title, detail, href };
  }

  function vocabularyRecommendations(results) {
    const ratio = key => (results[key]?.correct || 0) / (results[key]?.total || 1);
    const list = [];
    if (ratio('Core I') < 0.8) {
      list.push(recommendation('I', 'חיזוק Core I', 'תרגול ממוקד במאגר הבסיס של Band II.', 'https://simonh68.github.io/E-Vocab-Band-II/'));
    }
    if (ratio('Core I') >= 0.65 && ratio('Core II') < 0.8) {
      list.push(recommendation('II', 'חיזוק Core II', 'השלמת אוצר המילים המתקדם של חטיבת הביניים.', 'https://simonh68.github.io/E-Vocab-Band-II/'));
    }
    if (ratio('Core II') >= 0.65 && ratio('Band III') < 0.8) {
      list.push(recommendation('III', 'התקדמות ל־Band III', 'תרגול אוצר המילים הנדרש לקראת Module E.', 'https://simonh68.github.io/module-e-vocab/'));
    }
    if (!list.length) {
      list.push(recommendation('↗', 'עוברים להבנת הנקרא', 'אוצר המילים חזק. עכשיו כדאי לבדוק ולתרגל קריאה.', 'reading.html'));
    }
    return list;
  }

  function readingRecommendations(level) {
    if (level === 'A') {
      return [
        recommendation('EB', 'English Basic', 'חיזוק קריאה מדורגת מהבסיס.', '../index.html'),
        recommendation('▶', 'Word Forge', 'תרגול מהיר של זיהוי מילים ודיוק בקריאה.', '../word-forge/'),
        recommendation('R', 'Read Along', 'סיפורים קצרים ברמות הנמוכות.', 'https://simonh68.github.io/E-Vocab-Band-II/Read-Along/')
      ];
    }
    if (level === 'C') {
      return [
        recommendation('R', 'Read Along', 'קריאה מדורגת ברמות הביניים.', 'https://simonh68.github.io/E-Vocab-Band-II/Read-Along/'),
        recommendation('II', 'Core II', 'חיזוק אוצר המילים שתומך בקריאה ברמת C.', 'https://simonh68.github.io/E-Vocab-Band-II/')
      ];
    }
    return [
      recommendation('R', 'Read Along', level === 'G' ? 'בחרו בסיפורים המתקדמים ביותר במאגר.' : 'בחרו בסיפורים המתקדמים המתאימים לרמת E.', 'https://simonh68.github.io/E-Vocab-Band-II/Read-Along/'),
      recommendation('III', 'Module E Vocabulary', 'חיזוק Band III והבנת מילים מתוך הקשר.', 'https://simonh68.github.io/module-e-vocab/')
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
    letters,
    readStorage,
    writeStorage,
    getGrade,
    setGrade,
    gradeLabel,
    loadJson,
    loadManifest,
    shuffle,
    selectFresh,
    escapeHtml,
    coverageEstimate,
    vocabularyComparison,
    readingComparison,
    vocabularyRecommendations,
    readingRecommendations,
    renderRecommendations
  };
})();
