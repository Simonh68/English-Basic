(() => {
  const PROFILE_KEY = 'ebr-profile-v2';
  const STAGES = ['cards', 'listen', 'read', 'transfer', 'sentences', 'text', 'check'];
  const DAY_MS = 86400000;

  function dateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function safeParse(value, fallback) {
    try { return JSON.parse(value) || fallback; } catch { return fallback; }
  }

  function emptyProfile() {
    return {
      version: 2,
      xp: 0,
      streak: 0,
      lastActive: null,
      activeDays: [],
      completedStages: 0,
      gameCorrect: 0,
      gameSessions: 0,
      gameRounds: 0,
      gameLevelUps: 0,
      gameLevelDowns: 0,
      bestGameScore: 0,
      lastLocation: null,
      daily: {},
      migratedLegacy: false
    };
  }

  function normalize(profile) {
    const base = emptyProfile();
    const next = { ...base, ...(profile || {}) };
    next.activeDays = Array.isArray(next.activeDays) ? next.activeDays.slice(-90) : [];
    next.daily = next.daily && typeof next.daily === 'object' ? next.daily : {};
    return next;
  }

  function readRaw() {
    return normalize(safeParse(localStorage.getItem(PROFILE_KEY), null));
  }

  function write(profile, detail = {}) {
    const clean = normalize(profile);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(clean));
    try { window.dispatchEvent(new CustomEvent('ebr:progress', { detail: { profile: clean, ...detail } })); } catch {}
    return clean;
  }

  function legacyStageCount() {
    let count = 0;
    for (let level = 1; level <= 5; level += 1) {
      for (let lesson = 1; lesson <= 10; lesson += 1) {
        const lessonProgress = safeParse(localStorage.getItem(`ebr-v1-l${level}-u${lesson}`), {});
        count += STAGES.filter(stage => Boolean(lessonProgress[stage])).length;
      }
    }
    return count;
  }

  function getProfile() {
    const profile = readRaw();
    if (!profile.migratedLegacy) {
      const completed = legacyStageCount();
      profile.completedStages = Math.max(profile.completedStages, completed);
      profile.xp = Math.max(profile.xp, completed * 12);
      profile.migratedLegacy = true;
      return write(profile);
    }
    return profile;
  }

  function dayDistance(fromKey, toKey) {
    if (!fromKey || !toKey) return Infinity;
    const from = new Date(`${fromKey}T12:00:00`);
    const to = new Date(`${toKey}T12:00:00`);
    return Math.round((to - from) / DAY_MS);
  }

  function ensureDaily(profile) {
    const today = dateKey();
    if (!profile.daily[today]) profile.daily[today] = { activities: 0, gameCorrect: 0, textReads: 0 };
    const daily = profile.daily[today];
    daily.activities = Number(daily.activities) || 0;
    daily.gameCorrect = Number(daily.gameCorrect) || 0;
    daily.textReads = Number(daily.textReads) || 0;
    daily.gameSessions = Number(daily.gameSessions) || 0;
    daily.gameRounds = Number(daily.gameRounds) || 0;
    const keys = Object.keys(profile.daily).sort();
    keys.slice(0, Math.max(0, keys.length - 14)).forEach(key => delete profile.daily[key]);
    return daily;
  }

  function touch(profile) {
    const today = dateKey();
    if (profile.lastActive !== today) {
      profile.streak = dayDistance(profile.lastActive, today) === 1 ? Math.max(1, profile.streak + 1) : 1;
      profile.lastActive = today;
      if (!profile.activeDays.includes(today)) profile.activeDays.push(today);
      profile.activeDays = profile.activeDays.slice(-90);
    }
    ensureDaily(profile);
  }

  function setLastLocation(location) {
    const profile = getProfile();
    profile.lastLocation = location;
    return write(profile);
  }

  function recordPractice(stage, options = {}) {
    const profile = getProfile();
    touch(profile);
    const daily = ensureDaily(profile);
    daily.activities += 1;
    if (stage === 'text') daily.textReads += 1;
    const firstTime = Boolean(options.firstTime);
    const gained = firstTime ? Number(options.xp || (stage === 'check' ? 25 : 12)) : 0;
    if (gained > 0) {
      profile.xp += gained;
      profile.completedStages += 1;
    }
    return write(profile, { xpGained: gained, activity: stage });
  }

  function startGameSession(detail = {}) {
    const profile = getProfile();
    touch(profile);
    const daily = ensureDaily(profile);
    profile.gameSessions += 1;
    daily.gameSessions += 1;
    return write(profile, { activity: 'game_session', ...detail });
  }

  function recordGame(correct, points = 0, detail = {}) {
    const profile = getProfile();
    touch(profile);
    const daily = ensureDaily(profile);
    profile.gameRounds += 1;
    daily.gameRounds += 1;
    if (correct) {
      daily.gameCorrect += 1;
      profile.gameCorrect += 1;
      profile.xp += 4;
    }
    if (detail.levelUp) profile.gameLevelUps += 1;
    if (detail.levelDown) profile.gameLevelDowns += 1;
    profile.bestGameScore = Math.max(profile.bestGameScore, Number(points) || 0);
    return write(profile, { xpGained: correct ? 4 : 0, activity: 'game', ...detail });
  }

  function getToday(profile = getProfile()) {
    return profile.daily[dateKey()] || { activities: 0, gameCorrect: 0, textReads: 0, gameSessions: 0, gameRounds: 0 };
  }

  window.EBR_PROGRESS = { STAGES, dateKey, getProfile, getToday, setLastLocation, recordPractice, startGameSession, recordGame };
})();
