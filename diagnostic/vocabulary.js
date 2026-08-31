(() => {
  'use strict';
  const api = window.EFN_DIAGNOSTIC;
  const views = {
    loading: document.querySelector('#loadingView'),
    question: document.querySelector('#questionView'),
    transition: document.querySelector('#transitionView'),
    foundationStop: document.querySelector('#foundationStopView')
  };
  const state = {
    manifest: null,
    bank: [],
    foundationalBank: [],
    stage: 'foundation',
    questions: [],
    index: 0,
    answers: [],
    foundation: null,
    sessionId: api.getSessionId(),
    clock: null,
    acceptingAnswer: false,
    previousCorrectIndex: -1
  };

  function show(name) {
    Object.entries(views).forEach(([key, element]) => { element.hidden = key !== name; });
  }

  function coarsePos(pos) {
    const value = String(pos || '').toLowerCase();
    if (value.includes('verb')) return 'verb';
    if (value.includes('noun')) return 'noun';
    if (value.includes('adjective')) return 'adjective';
    if (value.includes('adverb')) return 'adverb';
    return 'other';
  }

  function shuffleOptions(options, correctIndex) {
    const shuffled = api.shuffleAnswerOptions(options, correctIndex, state.previousCorrectIndex);
    state.previousCorrectIndex = shuffled.correctIndex;
    return shuffled;
  }

  function makeOptions(item, bandItems) {
    const field = item.band === 'Band III' ? 'definition' : 'meaning';
    const correct = String(item[field] || '').trim();
    const samePos = bandItems.filter(candidate => candidate.id !== item.id && coarsePos(candidate.pos) === coarsePos(item.pos));
    const fallback = bandItems.filter(candidate => candidate.id !== item.id);
    const pool = samePos.length >= 8 ? samePos : fallback;
    const distractors = [];
    for (const candidate of api.shuffle(pool)) {
      const value = String(candidate[field] || '').trim();
      if (!value || value === correct || distractors.includes(value)) continue;
      distractors.push(value);
      if (distractors.length === 3) break;
    }
    return shuffleOptions([correct, ...distractors], 0);
  }

  function prepareFoundationQuestions() {
    const count = state.manifest.vocabulary.foundationalQuestions;
    const anchors = state.foundationalBank.filter(item => item.anchor).slice(0, count);
    const extrasNeeded = Math.max(0, count - anchors.length);
    const extras = api.selectFresh(
      state.foundationalBank.filter(item => !item.anchor),
      extrasNeeded,
      'foundation:extra-spelling',
      state.manifest.version
    );
    return api.shuffle([...anchors, ...extras]).map(item => ({
      ...item,
      ...shuffleOptions(item.options, item.answer),
      kind: 'foundation'
    }));
  }

  function prepareVocabularyQuestions() {
    const questions = [];
    state.manifest.vocabulary.bands.forEach(band => {
      const bandItems = state.bank.filter(item => item.band === band);
      const sample = api.selectFresh(
        bandItems,
        state.manifest.vocabulary.questionsPerBand,
        `vocabulary:${band}`,
        state.manifest.version
      );
      sample.forEach(item => questions.push({ ...item, ...makeOptions(item, bandItems), kind: 'vocabulary' }));
    });
    return questions;
  }

  function showTransition(step, title, next) {
    state.clock?.stop();
    state.acceptingAnswer = false;
    document.querySelector('#transitionMark').textContent = `0${step}`;
    document.querySelector('#transitionTitle').textContent = title;
    document.querySelector('#transitionText').textContent = `שלב ${step} מתוך 3`;
    show('transition');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(next, 1200);
  }

  function renderQuestion() {
    const question = state.questions[state.index];
    const total = state.questions.length;
    const isFoundation = state.stage === 'foundation';
    const isEnglishMeaning = question.band === 'Band III';
    document.querySelector('#sectionLabel').textContent = isFoundation ? 'קריאה בסיסית' : 'אוצר מילים';
    document.querySelector('#questionCounter').textContent = `${state.index + 1} / ${total}`;
    document.querySelector('#progressBar').style.width = `${Math.round(((state.index + 1) / total) * 100)}%`;
    const progress = document.querySelector('.exam-progress');
    progress.setAttribute('aria-valuemax', String(total));
    progress.setAttribute('aria-valuenow', String(state.index + 1));

    const prompt = document.querySelector('#vocabPrompt');
    const title = document.querySelector('#questionTitle');
    const example = document.querySelector('#exampleSentence');
    prompt.classList.toggle('foundation-prompt', isFoundation);
    document.querySelector('#promptLabel').textContent = isFoundation
      ? 'איך כותבים באנגלית?'
      : isEnglishMeaning ? 'Choose the best meaning' : 'מה משמעות המילה?';
    title.textContent = isFoundation ? question.prompt : question.word;
    title.lang = isFoundation ? 'he' : 'en';
    title.dir = isFoundation ? 'rtl' : 'ltr';
    example.hidden = isFoundation;
    example.textContent = isFoundation ? '' : question.example;

    const answerGrid = document.querySelector('#answerGrid');
    answerGrid.classList.toggle('english-options', isFoundation || isEnglishMeaning);
    answerGrid.innerHTML = question.options.map((option, index) => `<button class="answer-option" type="button" data-index="${index}"><span class="answer-letter" aria-hidden="true">${api.letters[index]}</span>${api.escapeHtml(option)}</button>`).join('');
    answerGrid.querySelectorAll('button').forEach(button => button.addEventListener('click', () => submit(Number(button.dataset.index), false)));
    document.querySelector('#unknownButton').disabled = false;
    state.acceptingAnswer = true;

    const timer = document.querySelector('#questionTimer');
    timer.classList.remove('is-overtime');
    state.clock = api.startQuestionClock(
      document.querySelector('#timerValue'),
      document.querySelector('#timerTrack'),
      timer,
      api.TARGET_MS,
      () => submit(-1, true, true)
    );
    requestAnimationFrame(() => answerGrid.querySelector('button')?.focus());
  }

  function submit(selectedIndex, unknown, timedOut = false) {
    if (!state.acceptingAnswer) return;
    state.acceptingAnswer = false;
    const question = state.questions[state.index];
    const elapsedMs = state.clock?.stop() ?? api.TARGET_MS;
    const expired = timedOut || elapsedMs >= api.TARGET_MS;
    const correct = !unknown && !expired && selectedIndex === question.correctIndex;
    document.querySelectorAll('#answerGrid button').forEach(button => { button.disabled = true; });
    document.querySelector('#unknownButton').disabled = true;
    state.answers.push({
      id: question.id,
      kind: question.kind,
      band: question.band || null,
      correct,
      unknown: unknown || expired,
      timedOut: expired,
      elapsedMs: Math.round(elapsedMs),
      points: api.scoreTimedAnswer(correct, elapsedMs)
    });
    state.index += 1;
    if (state.index < state.questions.length) {
      window.setTimeout(renderQuestion, 100);
      return;
    }
    window.setTimeout(state.stage === 'foundation' ? finishFoundation : finishVocabulary, 100);
  }

  function summarizeVocabulary() {
    return state.manifest.vocabulary.bands.reduce((summary, band) => {
      const answers = state.answers.filter(answer => answer.band === band);
      summary[band] = {
        total: answers.length,
        correct: answers.filter(answer => answer.correct).length,
        points: answers.reduce((sum, answer) => sum + answer.points, 0),
        ratio: api.scoreRatio(answers)
      };
      return summary;
    }, {});
  }

  function finishFoundation() {
    state.clock?.stop();
    const answers = state.answers.filter(answer => answer.kind === 'foundation');
    const correct = answers.filter(answer => answer.correct).length;
    const ratio = api.scoreRatio(answers);
    const passed = correct >= 5 && ratio >= 0.70;
    state.foundation = { passed, correct, total: answers.length, ratio };

    if (!passed) {
      api.writeStorage('active-vocabulary', {
        sessionId: state.sessionId,
        version: state.manifest.version,
        level: 'A',
        profile: 'foundation-stop',
        foundational: state.foundation,
        summary: {},
        answers: state.answers,
        stoppedAt: 'foundation',
        completedAt: new Date().toISOString()
      });
      show('foundationStop');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    state.stage = 'vocabulary';
    state.questions = prepareVocabularyQuestions();
    state.index = 0;
    showTransition(2, 'שליטה באוצר מילים', () => {
      show('question');
      renderQuestion();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function finishVocabulary() {
    state.clock?.stop();
    const summary = summarizeVocabulary();
    const profile = api.vocabularyProfile(summary);
    const level = api.vocabularyLevel(summary);
    api.writeStorage('active-vocabulary', {
      sessionId: state.sessionId,
      version: state.manifest.version,
      level,
      profile,
      foundational: state.foundation,
      summary,
      answers: state.answers,
      completedAt: new Date().toISOString()
    });
    showTransition(3, 'יכולת הבנת הנקרא', () => {
      location.href = `reading.html?session=${encodeURIComponent(state.sessionId)}`;
    });
  }

  async function initialize() {
    const session = api.validSession(state.sessionId);
    if (!session) {
      location.replace('index.html');
      return;
    }
    try {
      state.manifest = await api.loadManifest();
      const [bank, definitions, foundationalBank] = await Promise.all([
        api.loadJson(`${state.manifest.vocabulary.file}?v=${encodeURIComponent(state.manifest.version)}`),
        api.loadJson(`${state.manifest.vocabulary.definitionFile}?v=${encodeURIComponent(state.manifest.version)}`),
        api.loadJson(`${state.manifest.vocabulary.foundationalFile}?v=${encodeURIComponent(state.manifest.version)}`)
      ]);
      state.bank = api.filterDiagnosticVocabulary(bank.map(item => item.band === 'Band III'
        ? { ...item, definition: definitions[item.id] }
        : item));
      state.foundationalBank = foundationalBank;
      state.questions = prepareFoundationQuestions();
      document.querySelector('#unknownButton').addEventListener('click', () => submit(-1, true));
      showTransition(1, 'יכולת קריאה בסיסית', () => {
        show('question');
        renderQuestion();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } catch {
      views.loading.innerHTML = '<div class="error-message"><strong>לא הצלחנו לטעון את בדיקת הרמה האישית.</strong><br>בדקו את החיבור ונסו לרענן את הדף.</div>';
    }
  }

  initialize();
})();
