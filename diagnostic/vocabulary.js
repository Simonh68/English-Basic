(() => {
  'use strict';
  const api = window.EFN_DIAGNOSTIC;
  const views = {
    loading: document.querySelector('#loadingView'),
    intro: document.querySelector('#introView'),
    question: document.querySelector('#questionView'),
    result: document.querySelector('#resultView')
  };
  const state = { manifest: null, bank: [], questions: [], index: 0, answers: [], grade: api.getGrade() };

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

  function makeOptions(item, bandItems) {
    const correct = item.meaning.trim();
    const samePos = bandItems.filter(candidate => candidate.id !== item.id && coarsePos(candidate.pos) === coarsePos(item.pos));
    const fallback = bandItems.filter(candidate => candidate.id !== item.id);
    const pool = samePos.length >= 8 ? samePos : fallback;
    const distractors = [];
    for (const candidate of api.shuffle(pool)) {
      const meaning = candidate.meaning.trim();
      if (!meaning || meaning === correct || distractors.includes(meaning)) continue;
      distractors.push(meaning);
      if (distractors.length === 3) break;
    }
    const options = api.shuffle([correct, ...distractors]);
    return { options, correctIndex: options.indexOf(correct) };
  }

  function prepareQuestions() {
    const sampleSize = state.manifest.vocabulary.questionsPerBand;
    const bands = state.manifest.vocabulary.bands;
    state.questions = [];
    bands.forEach((band, bandIndex) => {
      const bandItems = state.bank.filter(item => item.band === band);
      const sample = api.selectFresh(bandItems, sampleSize, `vocabulary:${band}`, state.manifest.version);
      sample.forEach(item => {
        const optionData = makeOptions(item, bandItems);
        state.questions.push({ ...item, ...optionData, bandIndex });
      });
    });
  }

  function renderQuestion() {
    const question = state.questions[state.index];
    const total = state.questions.length;
    const bandCount = state.manifest.vocabulary.bands.length;
    document.querySelector('#sectionLabel').textContent = `חלק ${question.bandIndex + 1} מתוך ${bandCount}`;
    document.querySelector('#questionCounter').textContent = `${state.index + 1} / ${total}`;
    document.querySelector('#questionTitle').textContent = question.word;
    document.querySelector('#exampleSentence').textContent = question.example;
    const progress = Math.round(((state.index + 1) / total) * 100);
    document.querySelector('#progressBar').style.width = `${progress}%`;
    document.querySelector('.exam-progress').setAttribute('aria-valuenow', String(state.index + 1));
    const answerGrid = document.querySelector('#answerGrid');
    answerGrid.innerHTML = question.options.map((option, index) => `<button class="answer-option" type="button" data-index="${index}"><span class="answer-letter" aria-hidden="true">${api.letters[index]}</span>${api.escapeHtml(option)}</button>`).join('');
    answerGrid.querySelectorAll('button').forEach(button => button.addEventListener('click', () => submit(Number(button.dataset.index), false)));
    document.querySelector('#unknownButton').disabled = false;
    requestAnimationFrame(() => answerGrid.querySelector('button')?.focus());
  }

  function submit(selectedIndex, unknown) {
    const question = state.questions[state.index];
    const buttons = document.querySelectorAll('#answerGrid button');
    buttons.forEach(button => { button.disabled = true; });
    document.querySelector('#unknownButton').disabled = true;
    state.answers.push({ id: question.id, band: question.band, correct: !unknown && selectedIndex === question.correctIndex, unknown });
    state.index += 1;
    if (state.index >= state.questions.length) {
      window.setTimeout(showResults, 100);
    } else {
      window.setTimeout(renderQuestion, 100);
    }
  }

  function summarize() {
    return state.manifest.vocabulary.bands.reduce((summary, band) => {
      const answers = state.answers.filter(answer => answer.band === band);
      summary[band] = {
        total: answers.length,
        correct: answers.filter(answer => answer.correct).length,
        unknown: answers.filter(answer => answer.unknown).length
      };
      return summary;
    }, {});
  }

  function showResults() {
    const results = summarize();
    const grid = document.querySelector('#resultGrid');
    grid.innerHTML = state.manifest.vocabulary.bands.map(band => {
      const score = results[band];
      const estimate = api.coverageEstimate(score.correct, score.total);
      return `<article class="result-card">
        <span>${api.escapeHtml(band)}</span>
        <strong>${estimate.label}</strong>
        <small>${estimate.status} · ${score.correct}/${score.total} במדגם</small>
        <div class="coverage-track" aria-hidden="true"><i style="width:${estimate.midpoint}%"></i></div>
      </article>`;
    }).join('');
    document.querySelector('#classComparison').innerHTML = api.vocabularyComparison(state.grade, results);
    api.renderRecommendations(document.querySelector('#recommendationList'), api.vocabularyRecommendations(results));
    api.writeStorage('last-vocabulary-result', { version: state.manifest.version, grade: state.grade, results, completedAt: new Date().toISOString() });
    show('result');
    views.result.querySelector('h1').focus?.();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function initialize() {
    if (!state.grade) {
      location.replace('index.html?target=vocabulary');
      return;
    }
    try {
      state.manifest = await api.loadManifest();
      state.bank = await api.loadJson(`${state.manifest.vocabulary.file}?v=${encodeURIComponent(state.manifest.version)}`);
      prepareQuestions();
      show('intro');
      document.querySelector('#startButton').addEventListener('click', () => {
        state.index = 0;
        state.answers = [];
        show('question');
        renderQuestion();
      }, { once: true });
      document.querySelector('#unknownButton').addEventListener('click', () => submit(-1, true));
    } catch (error) {
      views.loading.innerHTML = '<div class="error-message"><strong>לא הצלחנו לטעון את מאגר המבחן.</strong><br>בדקו את החיבור ונסו לרענן את הדף.</div>';
    }
  }

  initialize();
})();
