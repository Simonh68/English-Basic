(() => {
  'use strict';
  const api = window.EFN_DIAGNOSTIC;
  const views = {
    loading: document.querySelector('#loadingView'),
    question: document.querySelector('#questionView'),
    result: document.querySelector('#resultView')
  };
  const state = {
    manifest: null,
    banks: {},
    grade: api.getGrade(),
    sessionId: api.getSessionId(),
    vocabularyResult: null,
    passage: null,
    questionIndex: 0,
    passageAnswers: [],
    attempts: [],
    usedDomains: new Set(),
    readingLevel: null,
    clock: null
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
    state.clock?.stop();
    state.passage = choosePassage(level);
    state.questionIndex = 0;
    state.passageAnswers = [];
    const passageNumber = state.attempts.length + 1;
    document.querySelector('#levelProgress').textContent = `קטע ${passageNumber}`;
    document.querySelector('#questionCounter').textContent = 'הבנת הנקרא';
    document.querySelector('#progressBar').style.width = '0%';
    document.querySelector('.exam-progress').setAttribute('aria-valuenow', '0');
    document.querySelector('#passageTitle').textContent = state.passage.title;
    document.querySelector('#passageText').textContent = state.passage.text;
    document.querySelector('#passageReady').hidden = false;
    document.querySelector('#readingQuestion').hidden = true;
    show('question');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function beginQuestions() {
    document.querySelector('#passageReady').hidden = true;
    document.querySelector('#readingQuestion').hidden = false;
    renderQuestion();
  }

  function renderQuestion() {
    const question = state.passage.questions[state.questionIndex];
    document.querySelector('#questionCounter').textContent = `שאלה ${state.questionIndex + 1} מתוך ${state.passage.questions.length}`;
    document.querySelector('#questionText').textContent = question.question;
    document.querySelector('#progressBar').style.width = `${Math.round(((state.questionIndex + 1) / state.passage.questions.length) * 100)}%`;
    document.querySelector('.exam-progress').setAttribute('aria-valuenow', String(state.questionIndex + 1));
    const answerGrid = document.querySelector('#answerGrid');
    answerGrid.innerHTML = question.options.map((option, index) => `<button class="answer-option" type="button" data-index="${index}"><span class="answer-letter" aria-hidden="true">${api.letters[index]}</span>${api.escapeHtml(option)}</button>`).join('');
    answerGrid.querySelectorAll('button').forEach(button => button.addEventListener('click', () => submit(Number(button.dataset.index), false)));
    document.querySelector('#skipButton').disabled = false;

    const timer = document.querySelector('#questionTimer');
    timer.classList.remove('is-overtime');
    state.clock = api.startQuestionClock(
      document.querySelector('#timerValue'),
      document.querySelector('#timerTrack'),
      timer
    );
    requestAnimationFrame(() => answerGrid.querySelector('button')?.focus());
  }

  function submit(selectedIndex, skipped) {
    const question = state.passage.questions[state.questionIndex];
    const elapsedMs = state.clock?.stop() ?? api.TARGET_MS;
    const correct = !skipped && selectedIndex === question.answer;
    document.querySelectorAll('#answerGrid button').forEach(button => { button.disabled = true; });
    document.querySelector('#skipButton').disabled = true;
    state.passageAnswers.push({
      id: question.id,
      group: question.group,
      correct,
      skipped,
      elapsedMs: Math.round(elapsedMs),
      points: api.scoreTimedAnswer(correct, elapsedMs)
    });
    state.questionIndex += 1;
    if (state.questionIndex < state.passage.questions.length) {
      window.setTimeout(renderQuestion, 100);
      return;
    }
    window.setTimeout(finishPassage, 110);
  }

  function finishPassage() {
    const correct = state.passageAnswers.filter(answer => answer.correct).length;
    state.attempts.push({
      passageId: state.passage.id,
      level: state.passage.level,
      correct,
      total: state.passage.questions.length,
      ratio: api.scoreRatio(state.passageAnswers),
      answers: state.passageAnswers
    });
    routeNext();
  }

  function finishReading(level) {
    state.readingLevel = level;
    showResults();
  }

  function routeNext() {
    const last = state.attempts.at(-1);
    if (state.attempts.length === 1 && last.level === 'C') {
      if (last.correct <= 1 || last.ratio < 0.45) return startPassage('A');
      if (last.correct === 2 || last.ratio < 0.68) return startPassage('C');
      return startPassage('E');
    }
    if (last.level === 'A') return finishReading('A');
    if (last.level === 'C') {
      const attempts = state.attempts.filter(item => item.level === 'C');
      const answers = attempts.flatMap(item => item.answers);
      const correct = answers.filter(answer => answer.correct).length;
      return finishReading(correct >= 5 && api.scoreRatio(answers) >= 0.62 ? 'C' : 'A');
    }
    if (last.level === 'E') {
      return last.correct >= 3 && last.ratio >= 0.68 ? startPassage('G') : finishReading('C');
    }
    if (last.level === 'G') {
      return finishReading(last.correct >= 3 && last.ratio >= 0.68 ? 'G' : 'E');
    }
    return finishReading('A');
  }

  function showResults(existingResult = null) {
    const foundationalPassed = state.vocabularyResult.foundational.passed;
    const combined = existingResult?.combined || api.combineLevels(
      state.vocabularyResult.level,
      state.readingLevel,
      foundationalPassed
    );
    const level = combined.level;
    const title = foundationalPassed
      ? `רמת ההכנה המתאימה: ${level}`
      : 'השלב המתאים עכשיו: חיזוק קריאה בסיסית';
    const detail = foundationalPassed
      ? 'התוצאה משלבת את אוצר המילים ואת הבנת הנקרא.'
      : 'כדאי לחזק תחילה הבחנה בין מילים דומות וקריאה מדויקת.';

    document.querySelector('#readingResult').innerHTML = `<div class="reading-level">
      <span class="level-badge" aria-hidden="true">${level}</span>
      <div><h2>${api.escapeHtml(title)}</h2><p>${api.escapeHtml(detail)}</p></div>
    </div>`;
    document.querySelector('#classComparison').innerHTML = api.placementCopy(level, state.grade);
    api.renderRecommendations(
      document.querySelector('#recommendationList'),
      api.combinedRecommendations(level, foundationalPassed)
    );

    const result = existingResult || {
      sessionId: state.sessionId,
      version: state.manifest.version,
      grade: state.grade,
      vocabularyLevel: state.vocabularyResult.level,
      readingLevel: state.readingLevel,
      foundational: state.vocabularyResult.foundational,
      combined,
      readingAttempts: state.attempts,
      completedAt: new Date().toISOString()
    };
    api.writeStorage('last-combined-result', result);
    show('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function initialize() {
    const session = api.validSession(state.sessionId);
    state.vocabularyResult = api.readStorage('active-vocabulary', null);
    if (
      !state.grade
      || !session
      || session.grade !== state.grade
      || state.vocabularyResult?.sessionId !== state.sessionId
    ) {
      location.replace('index.html');
      return;
    }

    const priorResult = api.readStorage('last-combined-result', null);
    if (priorResult?.sessionId === state.sessionId) {
      state.readingLevel = priorResult.readingLevel;
      state.attempts = priorResult.readingAttempts || [];
      showResults(priorResult);
      return;
    }

    try {
      state.manifest = await api.loadManifest();
      const entries = await Promise.all(state.manifest.reading.levels.map(async level => {
        const file = state.manifest.reading.files[level];
        return [level, await api.loadJson(`${file}?v=${encodeURIComponent(state.manifest.version)}`)];
      }));
      state.banks = Object.fromEntries(entries);
      document.querySelector('#beginQuestions').addEventListener('click', beginQuestions);
      document.querySelector('#skipButton').addEventListener('click', () => submit(-1, true));
      startPassage('C');
    } catch {
      views.loading.innerHTML = '<div class="error-message"><strong>לא הצלחנו לטעון את המבחן.</strong><br>בדקו את החיבור ונסו לרענן את הדף.</div>';
    }
  }

  initialize();
})();
