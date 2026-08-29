(() => {
  'use strict';
  const api = window.EFN_DIAGNOSTIC;
  const views = {
    loading: document.querySelector('#loadingView'),
    intro: document.querySelector('#introView'),
    question: document.querySelector('#questionView'),
    result: document.querySelector('#resultView')
  };
  const state = {
    manifest: null,
    banks: {},
    grade: api.getGrade(),
    passage: null,
    questionIndex: 0,
    passageAnswers: [],
    attempts: [],
    usedDomains: new Set(),
    resultLevel: null
  };

  function show(name) {
    Object.entries(views).forEach(([key, element]) => { element.hidden = key !== name; });
  }

  function choosePassage(level) {
    const all = state.banks[level] || [];
    const distinctDomains = all.filter(item => !state.usedDomains.has(item.domain));
    const pool = distinctDomains.length ? distinctDomains : all;
    const [selected] = api.selectFresh(pool, 1, `reading:${level}`, state.manifest.version);
    state.usedDomains.add(selected.domain);
    const questions = api.shuffle(selected.questions).map(question => {
      const options = api.shuffle(question.options.map((text, index) => ({ text, correct: index === question.answer })));
      return { ...question, options: options.map(option => option.text), answer: options.findIndex(option => option.correct) };
    });
    return { ...selected, questions };
  }

  function startPassage(level) {
    state.passage = choosePassage(level);
    state.questionIndex = 0;
    state.passageAnswers = [];
    show('question');
    renderQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderQuestion() {
    const passage = state.passage;
    const question = passage.questions[state.questionIndex];
    const passageNumber = state.attempts.length + 1;
    document.querySelector('#levelProgress').textContent = `קטע ${passageNumber}`;
    document.querySelector('#questionCounter').textContent = `שאלה ${state.questionIndex + 1} מתוך ${passage.questions.length}`;
    document.querySelector('#passageTitle').textContent = passage.title;
    document.querySelector('#passageText').textContent = passage.text;
    document.querySelector('#questionText').textContent = question.question;
    const progress = Math.round(((state.questionIndex + 1) / passage.questions.length) * 100);
    document.querySelector('#progressBar').style.width = `${progress}%`;
    document.querySelector('.exam-progress').setAttribute('aria-valuenow', String(state.questionIndex + 1));
    const answerGrid = document.querySelector('#answerGrid');
    answerGrid.innerHTML = question.options.map((option, index) => `<button class="answer-option" type="button" data-index="${index}"><span class="answer-letter" aria-hidden="true">${api.letters[index]}</span>${api.escapeHtml(option)}</button>`).join('');
    answerGrid.querySelectorAll('button').forEach(button => button.addEventListener('click', () => submit(Number(button.dataset.index), false)));
    document.querySelector('#skipButton').disabled = false;
  }

  function submit(selectedIndex, skipped) {
    const question = state.passage.questions[state.questionIndex];
    document.querySelectorAll('#answerGrid button').forEach(button => { button.disabled = true; });
    document.querySelector('#skipButton').disabled = true;
    state.passageAnswers.push({
      id: question.id,
      group: question.group,
      correct: !skipped && selectedIndex === question.answer,
      skipped
    });
    state.questionIndex += 1;
    if (state.questionIndex < state.passage.questions.length) {
      window.setTimeout(renderQuestion, 110);
      return;
    }
    window.setTimeout(finishPassage, 120);
  }

  function finishPassage() {
    const correct = state.passageAnswers.filter(answer => answer.correct).length;
    state.attempts.push({
      passageId: state.passage.id,
      level: state.passage.level,
      title: state.passage.title,
      correct,
      total: state.passage.questions.length,
      answers: state.passageAnswers
    });
    routeNext();
  }

  function result(level) {
    state.resultLevel = level;
    showResults();
  }

  function routeNext() {
    const last = state.attempts.at(-1);
    if (state.attempts.length === 1 && last.level === 'C') {
      if (last.correct <= 1) return startPassage('A');
      if (last.correct === 2) return startPassage('C');
      return startPassage('E');
    }
    if (last.level === 'A') return result('A');
    if (last.level === 'C') {
      const cAttempts = state.attempts.filter(item => item.level === 'C');
      const totalCorrect = cAttempts.reduce((sum, item) => sum + item.correct, 0);
      return result(totalCorrect >= 5 ? 'C' : 'A');
    }
    if (last.level === 'E') {
      return last.correct >= 3 ? startPassage('G') : result('C');
    }
    if (last.level === 'G') return result(last.correct >= 3 ? 'G' : 'E');
    return result('A');
  }

  function levelCopy(level) {
    return ({
      A: { title: 'קרוב יותר לרמת A', detail: 'הבסיס קיים, אך שאלות ברמת C עדיין אינן יציבות.' },
      C: { title: 'קרוב יותר לרמת C', detail: 'יש שליטה בטקסט בסיסי ובשאלות איתור, דיוק והסקה ברמת C.' },
      E: { title: 'מגיע לרמת E', detail: 'הקריאה מתמודדת בהצלחה עם טקסט אקדמי ועם מסיחים מורכבים.' },
      G: { title: 'מגיע לרמת G', detail: 'הקריאה מראה יכולת מתקדמת של סינתזה, הבחנה והסקה.' }
    })[level];
  }

  function showResults() {
    const copy = levelCopy(state.resultLevel);
    const evidence = state.attempts.map(item => `<span>${api.escapeHtml(item.level)} · ${item.correct}/${item.total}</span>`).join('');
    document.querySelector('#readingResult').innerHTML = `<div class="reading-level">
      <span class="level-badge" aria-hidden="true">${state.resultLevel}</span>
      <div><h2>${copy.title}</h2><p>${copy.detail}</p></div>
    </div><div class="level-evidence" aria-label="תוצאות הקטעים">${evidence}</div>`;
    document.querySelector('#classComparison').innerHTML = api.readingComparison(state.resultLevel, state.grade);
    api.renderRecommendations(document.querySelector('#recommendationList'), api.readingRecommendations(state.resultLevel));
    api.writeStorage('last-reading-result', {
      version: state.manifest.version,
      grade: state.grade,
      level: state.resultLevel,
      attempts: state.attempts,
      completedAt: new Date().toISOString()
    });
    show('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function initialize() {
    if (!state.grade) {
      location.replace('index.html?target=reading');
      return;
    }
    try {
      state.manifest = await api.loadManifest();
      const entries = await Promise.all(state.manifest.reading.levels.map(async level => {
        const file = state.manifest.reading.files[level];
        return [level, await api.loadJson(`${file}?v=${encodeURIComponent(state.manifest.version)}`)];
      }));
      state.banks = Object.fromEntries(entries);
      show('intro');
      document.querySelector('#startButton').addEventListener('click', () => startPassage('C'), { once: true });
      document.querySelector('#skipButton').addEventListener('click', () => submit(-1, true));
    } catch {
      views.loading.innerHTML = '<div class="error-message"><strong>לא הצלחנו לטעון את מאגר הקריאה.</strong><br>בדקו את החיבור ונסו לרענן את הדף.</div>';
    }
  }

  initialize();
})();
