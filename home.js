(() => {
  const course = window.ENGLISH_BASIC_COURSE;
  const progressApi = window.EBR_PROGRESS;
  const stages = progressApi.STAGES;
  const ranks = ['Starter', 'Reader', 'Builder', 'Navigator', 'Fluent Track'];
  const levelLabels = ['בסיס יציב', 'צירופים', 'דפוסים', 'קריאה זורמת', 'מילים מורכבות'];

  function readLessonProgress(level, lesson) {
    try { return JSON.parse(localStorage.getItem(`ebr-v1-l${level}-u${lesson}`)) || {}; } catch { return {}; }
  }

  function levelProgress(level) {
    let complete = 0;
    let touchedLessons = 0;
    for (let lesson = 1; lesson <= 10; lesson += 1) {
      const data = readLessonProgress(level, lesson);
      const lessonDone = stages.filter(stage => Boolean(data[stage])).length;
      complete += lessonDone;
      if (lessonDone > 0) touchedLessons += 1;
    }
    return { complete, touchedLessons, percent: Math.round((complete / 70) * 100) };
  }

  function renderLevels() {
    const grid = document.querySelector('#levelGrid');
    grid.innerHTML = course.levels.map((level, index) => {
      const progress = levelProgress(level.id);
      const status = progress.complete ? `${progress.percent}% הושלמו` : 'אפשר להתחיל כאן';
      const gameLink = `<a class="level-game-link" href="${window.ENGLISH_BASIC_WORDS.makeGameHref(level.id)}" aria-label="משחק שמיעה וקריאה לרמה ${level.id}"><span aria-hidden="true">🎧</span> משחק תרגול לרמה <span>${level.id}</span> <span aria-hidden="true">←</span></a>`;
      return `<article class="level-card level-tone-${level.id}">
        <a class="level-card-main" href="lesson.html?level=${level.id}&amp;lesson=1&amp;mode=cards" aria-label="רמה ${level.id}: ${level.name}. ${status}">
          <div class="level-card-top"><span class="level-number">0${level.id}</span><span class="level-status">${status}</span></div>
          <span class="level-label">${levelLabels[index]}</span>
          <h3>${level.name}</h3>
          <p>${level.subtitle}</p>
          <div class="level-progress" role="progressbar" aria-label="התקדמות ברמה ${level.id}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.percent}"><span style="width:${progress.percent}%"></span></div>
          <span class="level-go">10 שיעורים <span aria-hidden="true">←</span></span>
        </a>
        ${gameLink}
      </article>`;
    }).join('');
  }

  function renderProfile() {
    const profile = progressApi.getProfile();
    const daily = progressApi.getToday(profile);
    const rankIndex = Math.min(ranks.length - 1, Math.floor(profile.xp / 300));
    const rankProgress = profile.xp >= 1200 ? 100 : Math.round((profile.xp % 300) / 3);
    document.querySelector('#xpValue').textContent = profile.xp;
    document.querySelector('#streakValue').textContent = profile.streak;
    document.querySelector('#rankName').textContent = ranks[rankIndex];
    document.querySelector('#xpBar').style.width = `${rankProgress}%`;
    const track = document.querySelector('#xpTrack');
    track.setAttribute('aria-valuenow', String(rankProgress));

    const missions = {
      practice: daily.activities >= 1,
      game: daily.gameCorrect >= 5,
      text: daily.textReads >= 1
    };
    Object.entries(missions).forEach(([name, complete]) => {
      const item = document.querySelector(`[data-mission="${name}"]`);
      item.classList.toggle('complete', complete);
      item.querySelector('.mission-check').textContent = complete ? '✓' : (name === 'game' ? '5' : '1');
    });
    const done = Object.values(missions).filter(Boolean).length;
    const status = document.querySelector('#missionStatus');
    status.textContent = done === 3 ? 'המשימה היומית הושלמה. מצוין!' : done ? `${done} מתוך 3 משימות הושלמו היום.` : 'עוד לא התחלתם היום — זה לוקח רק כמה דקות.';

    if (profile.lastLocation && profile.lastLocation.href) {
      document.querySelector('#continueButton').href = profile.lastLocation.href;
      document.querySelector('#continueTitle').textContent = 'ממשיכים מהמקום האחרון';
      document.querySelector('#continueHint').textContent = profile.lastLocation.label || 'חזרה לתרגול';
    }
  }

  renderLevels();
  renderProfile();
  window.addEventListener('ebr:progress', renderProfile);
  window.addEventListener('pageshow', () => { renderLevels(); renderProfile(); });
})();
