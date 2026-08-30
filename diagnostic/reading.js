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
    sessionId: api.getSessionId(),
    vocabularyResult: null,
    passage: null,
    paragraphs: [],
    questionIndex: 0,
    passageAnswers: [],
    attempts: [],
    usedDomains: new Set(),
    vocabularyProfile: null,
    startLevel: null,
    readingLevel: null,
    clock: null,
    acceptingAnswer: false
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
    const questions = selected.questions.map(question => {
      const options = api.shuffle(question.options.map((text, index) => ({ text, correct: index === question.answer })));
      return { ...question, options: options.map(option => option.text), answer: options.findIndex(option => option.correct) };
    });
    return { ...selected, questions };
  }

  function startPassage(level) {
    state.clock?.stop();
    state.passage = choosePassage(level);
    state.paragraphs = state.passage.text.split(/\n\s*\n/);
    state.questionIndex = 0;
    state.passageAnswers = [];
    const passageNumber = state.attempts.length + 1;
    document.querySelector('#levelProgress').textContent = `קטע ${passageNumber} · פסקה 1`;
    document.querySelector('#questionCounter').textContent = 'הבנת הנקרא';
    document.querySelector('#progressBar').style.width = '0%';
    document.querySelector('.exam-progress').setAttribute('aria-valuenow', '0');
    document.querySelector('#passageTitle').textContent = state.passage.title;
    document.querySelector('#passageText').replaceChildren();
    show('question');
    renderQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderQuestion() {
    const question = state.passage.questions[state.questionIndex];
    const isSummary = question.scope === 'whole-text';
    const visible = api.visibleReadingParagraphs(state.paragraphs, state.questionIndex, question.scope);
    const paragraphNodes = visible.map(paragraph => {
      const node = document.createElement('p');
      node.className = 'is-new';
      node.textContent = paragraph;
      return node;
    });
    document.querySelector('#passageText').replaceChildren(...paragraphNodes);
    document.querySelector('#levelProgress').textContent = isSummary
      ? `קטע ${state.attempts.length + 1} · שאלה מסכמת`
      : `קטע ${state.attempts.length + 1} · פסקה ${state.questionIndex + 1}`;
    document.querySelector('#questionCounter').textContent = isSummary
      ? 'שאלה כללית על הטקסט'
      : `שאלה ${state.questionIndex + 1} מתוך ${state.passage.questions.length}`;
    document.querySelector('#questionText').textContent = question.question;
    document.querySelector('#progressBar').style.width = `${Math.round(((state.questionIndex + 1) / state.passage.questions.length) * 100)}%`;
    document.querySelector('.exam-progress').setAttribute('aria-valuenow', String(state.questionIndex + 1));
    const answerGrid = document.querySelector('#answerGrid');
    answerGrid.innerHTML = question.options.map((option, index) => `<button class="answer-option" type="button" data-index="${index}"><span class="answer-letter" aria-hidden="true">${api.letters[index]}</span>${api.escapeHtml(option)}</button>`).join('');
    answerGrid.querySelectorAll('button').forEach(button => button.addEventListener('click', () => submit(Number(button.dataset.index), false)));
    document.querySelector('#skipButton').disabled = false;
    state.acceptingAnswer = true;

    const timer = document.querySelector('#questionTimer');
    timer.classList.remove('is-overtime');
    state.clock = api.startQuestionClock(
      document.querySelector('#timerValue'),
      document.querySelector('#timerTrack'),
      timer,
      api.READING_TARGET_MS,
      () => submit(-1, true, true)
    );
    requestAnimationFrame(() => answerGrid.querySelector('button')?.focus());
  }

  function submit(selectedIndex, skipped, timedOut = false) {
    if (!state.acceptingAnswer) return;
    state.acceptingAnswer = false;
    const question = state.passage.questions[state.questionIndex];
    const elapsedMs = state.clock?.stop() ?? api.READING_TARGET_MS;
    const expired = timedOut || elapsedMs >= api.READING_TARGET_MS;
    const correct = !skipped && !expired && selectedIndex === question.answer;
    document.querySelectorAll('#answerGrid button').forEach(button => { button.disabled = true; });
    document.querySelector('#skipButton').disabled = true;
    state.passageAnswers.push({
      id: question.id,
      group: question.group,
      correct,
      skipped: skipped || expired,
      timedOut: expired,
      elapsedMs: Math.round(elapsedMs),
      points: api.scoreTimedAnswer(correct, elapsedMs, api.READING_TARGET_MS)
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
    const step = api.nextReadingStep(state.vocabularyProfile, state.attempts);
    return step.action === 'start' ? startPassage(step.level) : finishReading(step.level);
  }

  function showResults(existingResult = null) {
    const foundationalPassed = state.vocabularyResult.foundational.passed;
    const level = existingResult?.level || existingResult?.combined?.level || state.readingLevel || 'A';
    const title = `רמת האנגלית שלך: ${level}`;
    const detail = 'התוצאה מבוססת על אוצר המילים ועל הבנת הנקרא שהפגנת בבדיקה.';

    document.querySelector('#readingResult').innerHTML = `<div class="reading-level">
      <span class="level-badge" aria-hidden="true">${level}</span>
      <div><h2>${api.escapeHtml(title)}</h2><p>${api.escapeHtml(detail)}</p></div>
    </div>`;
    api.renderRecommendations(
      document.querySelector('#recommendationList'),
      api.combinedRecommendations(level, foundationalPassed, state.vocabularyResult.level)
    );

    const result = existingResult || {
      sessionId: state.sessionId,
      version: state.manifest.version,
      level,
      vocabularyLevel: state.vocabularyResult.level,
      vocabularyProfile: state.vocabularyProfile,
      readingLevel: state.readingLevel,
      foundational: state.vocabularyResult.foundational,
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
      !session
      || state.vocabularyResult?.sessionId !== state.sessionId
    ) {
      location.replace('index.html');
      return;
    }
    if (state.vocabularyResult.foundational?.passed !== true) {
      location.replace('index.html');
      return;
    }
    state.vocabularyProfile = state.vocabularyResult.profile
      || api.vocabularyProfile(state.vocabularyResult.summary || {});

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
      document.querySelector('#skipButton').addEventListener('click', () => submit(-1, true));
      const firstStep = api.nextReadingStep(state.vocabularyProfile, []);
      state.startLevel = firstStep.level;
      state.vocabularyResult.level = api.vocabularyLevel(state.vocabularyResult.summary || {});
      startPassage(state.startLevel);
    } catch {
      views.loading.innerHTML = '<div class="error-message"><strong>לא הצלחנו לטעון את בדיקת הרמה האישית.</strong><br>בדקו את החיבור ונסו לרענן את הדף.</div>';
    }
  }

  initialize();
})();
