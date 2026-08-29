(() => {
  'use strict';
  const api = window.EFN_DIAGNOSTIC;
  const views = {
    loading: document.querySelector('#loadingView'),
    question: document.querySelector('#questionView'),
    transition: document.querySelector('#transitionView')
  };
  const state = {
    manifest: null,
    bank: [],
    foundationalBank: [],
    questions: [],
    index: 0,
    answers: [],
    grade: api.getGrade(),
    sessionId: api.getSessionId(),
    clock: null
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
    const shuffled = api.shuffle(options.map((text, index) => ({ text, correct: index === correctIndex })));
    return {
      options: shuffled.map(option => option.text),
      correctIndex: shuffled.findIndex(option => option.correct)
    };
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

  function prepareQuestions() {
    const foundationalFamilies = [...new Set(state.foundationalBank.map(item => item.family))];
    const foundational = foundationalFamilies.slice(0, state.manifest.vocabulary.foundationalQuestions).map(family => {
      const familyItems = state.foundationalBank.filter(item => item.family === family);
      const [item] = api.selectFresh(familyItems, 1, `foundation:${family}`, state.manifest.version);
      return { ...item, ...shuffleOptions(item.options, item.answer), kind: 'foundation' };
    });

    const vocabulary = [];
    state.manifest.vocabulary.bands.forEach(band => {
      const bandItems = state.bank.filter(item => item.band === band);
      const sample = api.selectFresh(
        bandItems,
        state.manifest.vocabulary.questionsPerBand,
        `vocabulary:${band}`,
        state.manifest.version
      );
      sample.forEach(item => vocabulary.push({ ...item, ...makeOptions(item, bandItems), kind: 'vocabulary' }));
    });
    state.questions = [...foundational, ...vocabulary];
  }

  function renderQuestion() {
    const question = state.questions[state.index];
    const total = state.questions.length;
    const isFoundation = question.kind === 'foundation';
    const isEnglishMeaning = question.band === 'Band III';
    document.querySelector('#questionCounter').textContent = `${state.index + 1} / ${total}`;
    document.querySelector('#progressBar').style.width = `${Math.round(((state.index + 1) / total) * 100)}%`;
    const progress = document.querySelector('.exam-progress');
    progress.setAttribute('aria-valuemax', String(total));
    progress.setAttribute('aria-valuenow', String(state.index + 1));

    const prompt = document.querySelector('#vocabPrompt');
    const example = document.querySelector('#exampleSentence');
    prompt.classList.toggle('foundation-prompt', isFoundation);
    document.querySelector('#promptLabel').textContent = isFoundation
      ? 'Choose the correct word'
      : isEnglishMeaning ? 'Choose the best meaning' : 'מה משמעות המילה?';
    document.querySelector('#questionTitle').textContent = isFoundation ? question.prompt : question.word;
    example.hidden = isFoundation;
    example.textContent = isFoundation ? '' : question.example;

    const answerGrid = document.querySelector('#answerGrid');
    answerGrid.classList.toggle('english-options', isFoundation || isEnglishMeaning);
    answerGrid.innerHTML = question.options.map((option, index) => `<button class="answer-option" type="button" data-index="${index}"><span class="answer-letter" aria-hidden="true">${api.letters[index]}</span>${api.escapeHtml(option)}</button>`).join('');
    answerGrid.querySelectorAll('button').forEach(button => button.addEventListener('click', () => submit(Number(button.dataset.index), false)));
    document.querySelector('#unknownButton').disabled = false;

    const timer = document.querySelector('#questionTimer');
    timer.classList.remove('is-overtime');
    state.clock = api.startQuestionClock(
      document.querySelector('#timerValue'),
      document.querySelector('#timerTrack'),
      timer
    );
    requestAnimationFrame(() => answerGrid.querySelector('button')?.focus());
  }

  function submit(selectedIndex, unknown) {
    const question = state.questions[state.index];
    const elapsedMs = state.clock?.stop() ?? api.TARGET_MS;
    const correct = !unknown && selectedIndex === question.correctIndex;
    document.querySelectorAll('#answerGrid button').forEach(button => { button.disabled = true; });
    document.querySelector('#unknownButton').disabled = true;
    state.answers.push({
      id: question.id,
      kind: question.kind,
      band: question.band || null,
      family: question.family || null,
      correct,
      unknown,
      elapsedMs: Math.round(elapsedMs),
      points: api.scoreTimedAnswer(correct, elapsedMs)
    });
    state.index += 1;
    if (state.index >= state.questions.length) {
      window.setTimeout(finishVocabulary, 100);
    } else {
      window.setTimeout(renderQuestion, 100);
    }
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

  function finishVocabulary() {
    state.clock?.stop();
    const foundationalAnswers = state.answers.filter(answer => answer.kind === 'foundation');
    const foundationalRatio = api.scoreRatio(foundationalAnswers);
    const foundationalCorrect = foundationalAnswers.filter(answer => answer.correct).length;
    const foundationalPassed = foundationalCorrect >= 2 && foundationalRatio >= 0.55;
    const summary = summarizeVocabulary();
    const level = api.vocabularyLevel(summary);
    api.writeStorage('active-vocabulary', {
      sessionId: state.sessionId,
      version: state.manifest.version,
      level,
      foundational: {
        passed: foundationalPassed,
        correct: foundationalCorrect,
        total: foundationalAnswers.length,
        ratio: foundationalRatio
      },
      summary,
      answers: state.answers,
      completedAt: new Date().toISOString()
    });
    show('transition');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => {
      location.href = `reading.html?grade=${state.grade}&session=${encodeURIComponent(state.sessionId)}`;
    }, 850);
  }

  async function initialize() {
    const session = api.validSession(state.sessionId);
    if (!state.grade || !session || session.grade !== state.grade) {
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
      state.bank = bank.map(item => item.band === 'Band III'
        ? { ...item, definition: definitions[item.id] }
        : item);
      state.foundationalBank = foundationalBank;
      prepareQuestions();
      document.querySelector('#unknownButton').addEventListener('click', () => submit(-1, true));
      show('question');
      renderQuestion();
    } catch {
      views.loading.innerHTML = '<div class="error-message"><strong>לא הצלחנו לטעון את המבחן.</strong><br>בדקו את החיבור ונסו לרענן את הדף.</div>';
    }
  }

  initialize();
})();
