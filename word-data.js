(() => {
  /*
   * Shared vocabulary and game logic for English Basic.
   * The course is the primary source. Visual entries enrich the canonical
   * level words, while each lesson becomes a practice skill in the game.
   */
  const VISUAL_WORDS = [
      { w: "cat", emoji: "🐱", tier: 0, skill: "short-a" },
      { w: "hat", emoji: "🎩", tier: 0, skill: "short-a" },
      { w: "bat", emoji: "🦇", tier: 0, skill: "short-a" },
      { w: "map", emoji: "🗺️", tier: 0, skill: "short-a" },
      { w: "bag", emoji: "🎒", tier: 0, skill: "short-a" },
      { w: "jam", emoji: "🍓🫙", tier: 0, skill: "short-a" },
      { w: "van", emoji: "🚐", tier: 0, skill: "short-a" },
      { w: "cap", emoji: "🧢", tier: 0, skill: "short-a" },
      { w: "fan", emoji: "🪭", tier: 0, skill: "short-a" },
      { w: "man", emoji: "👨", tier: 0, skill: "short-a" },
      { w: "rat", emoji: "🐀", tier: 0, skill: "short-a" },
      { w: "pan", emoji: "🍳", tier: 0, skill: "short-a" },

      { w: "bed", emoji: "🛏️", tier: 0, skill: "short-e" },
      { w: "red", emoji: "🔴", tier: 0, skill: "short-e" },
      { w: "pen", emoji: "🖊️", tier: 0, skill: "short-e" },
      { w: "hen", emoji: "🐔", tier: 0, skill: "short-e" },
      { w: "leg", emoji: "🦵", tier: 0, skill: "short-e" },
      { w: "net", emoji: "🥅", tier: 0, skill: "short-e" },
      { w: "ten", emoji: "🔟", tier: 0, skill: "short-e" },
      { w: "wet", emoji: "💦", tier: 0, skill: "short-e" },
      { w: "pet", emoji: "🐕", tier: 0, skill: "short-e" },
      { w: "jet", emoji: "✈️", tier: 0, skill: "short-e" },
      { w: "web", emoji: "🕸️", tier: 0, skill: "short-e" },
      { w: "bell", emoji: "🔔", tier: 0, skill: "short-e" },

      { w: "pig", emoji: "🐷", tier: 0, skill: "short-i" },
      { w: "big", emoji: "🐘", tier: 0, skill: "short-i" },
      { w: "sit", emoji: "🪑", tier: 0, skill: "short-i" },
      { w: "six", emoji: "6️⃣", tier: 0, skill: "short-i" },
      { w: "fin", emoji: "🐟", tier: 0, skill: "short-i" },
      { w: "pin", emoji: "📌", tier: 0, skill: "short-i" },
      { w: "lip", emoji: "👄", tier: 0, skill: "short-i" },
      { w: "kid", emoji: "🧒", tier: 0, skill: "short-i" },
      { w: "win", emoji: "🏆", tier: 0, skill: "short-i" },
      { w: "mix", emoji: "🥣", tier: 0, skill: "short-i" },
      { w: "zip", emoji: "🤐", tier: 0, skill: "short-i" },
      { w: "hill", emoji: "⛰️", tier: 0, skill: "short-i" },

      { w: "dog", emoji: "🐶", tier: 0, skill: "short-o" },
      { w: "log", emoji: "🪵", tier: 0, skill: "short-o" },
      { w: "box", emoji: "📦", tier: 0, skill: "short-o" },
      { w: "fox", emoji: "🦊", tier: 0, skill: "short-o" },
      { w: "hot", emoji: "🔥", tier: 0, skill: "short-o" },
      { w: "pot", emoji: "🍲", tier: 0, skill: "short-o" },
      { w: "top", emoji: "🔝", tier: 0, skill: "short-o" },
      { w: "mop", emoji: "🧹", tier: 0, skill: "short-o" },
      { w: "hop", emoji: "🦘", tier: 0, skill: "short-o" },
      { w: "cot", emoji: "🛏️", tier: 0, skill: "short-o" },
      { w: "doll", emoji: "🪆", tier: 0, skill: "short-o" },
      { w: "sock", emoji: "🧦", tier: 0, skill: "short-o" },

      { w: "sun", emoji: "☀️", tier: 0, skill: "short-u" },
      { w: "bus", emoji: "🚌", tier: 0, skill: "short-u" },
      { w: "cup", emoji: "🥤", tier: 0, skill: "short-u" },
      { w: "run", emoji: "🏃", tier: 0, skill: "short-u" },
      { w: "bug", emoji: "🐛", tier: 0, skill: "short-u" },
      { w: "rug", emoji: "🧶", tier: 0, skill: "short-u" },
      { w: "nut", emoji: "🌰", tier: 0, skill: "short-u" },
      { w: "mud", emoji: "🟫", tier: 0, skill: "short-u" },
      { w: "hug", emoji: "🤗", tier: 0, skill: "short-u" },
      { w: "cut", emoji: "✂️", tier: 0, skill: "short-u" },
      { w: "duck", emoji: "🦆", tier: 0, skill: "short-u" },
      { w: "bun", emoji: "🥯", tier: 0, skill: "short-u" },

      { w: "flag", emoji: "🚩", tier: 1, skill: "l-blends" },
      { w: "clap", emoji: "👏", tier: 1, skill: "l-blends" },
      { w: "glass", emoji: "🥛", tier: 1, skill: "l-blends" },
      { w: "plant", emoji: "🌱", tier: 1, skill: "l-blends" },
      { w: "blue", emoji: "🔵", tier: 1, skill: "l-blends" },
      { w: "black", emoji: "⚫", tier: 1, skill: "l-blends" },
      { w: "clock", emoji: "🕒", tier: 1, skill: "l-blends" },
      { w: "cloud", emoji: "☁️", tier: 1, skill: "l-blends" },
      { w: "flower", emoji: "🌸", tier: 1, skill: "l-blends" },
      { w: "frog", emoji: "🐸", tier: 1, skill: "l-blends" },

      { w: "crab", emoji: "🦀", tier: 1, skill: "r-blends" },
      { w: "drum", emoji: "🥁", tier: 1, skill: "r-blends" },
      { w: "branch", emoji: "🌿", tier: 1, skill: "r-blends" },
      { w: "brick", emoji: "🧱", tier: 1, skill: "r-blends" },
      { w: "bread", emoji: "🍞", tier: 1, skill: "r-blends" },
      { w: "green", emoji: "🟢", tier: 1, skill: "r-blends" },
      { w: "grape", emoji: "🍇", tier: 1, skill: "r-blends" },
      { w: "tree", emoji: "🌳", tier: 1, skill: "r-blends" },
      { w: "train", emoji: "🚆", tier: 1, skill: "r-blends" },
      { w: "truck", emoji: "🚚", tier: 1, skill: "r-blends" },

      { w: "star", emoji: "⭐", tier: 1, skill: "s-blends" },
      { w: "stop", emoji: "🛑", tier: 1, skill: "s-blends" },
      { w: "swim", emoji: "🏊", tier: 1, skill: "s-blends" },
      { w: "snake", emoji: "🐍", tier: 1, skill: "s-blends" },
      { w: "snow", emoji: "❄️", tier: 1, skill: "s-blends" },
      { w: "spoon", emoji: "🥄", tier: 1, skill: "s-blends" },
      { w: "school", emoji: "🏫", tier: 1, skill: "s-blends" },
      { w: "skate", emoji: "🛹", tier: 1, skill: "s-blends" },
      { w: "smile", emoji: "😊", tier: 1, skill: "s-blends" },
      { w: "spider", emoji: "🕷️", tier: 1, skill: "s-blends" },

      { w: "ship", emoji: "🚢", tier: 1, skill: "digraph-sh" },
      { w: "shop", emoji: "🛍️", tier: 1, skill: "digraph-sh" },
      { w: "fish", emoji: "🐟", tier: 1, skill: "digraph-sh" },
      { w: "shell", emoji: "🐚", tier: 1, skill: "digraph-sh" },
      { w: "shoe", emoji: "👟", tier: 1, skill: "digraph-sh" },
      { w: "sheep", emoji: "🐑", tier: 1, skill: "digraph-sh" },

      { w: "chip", emoji: "🍟", tier: 1, skill: "digraph-ch" },
      { w: "chair", emoji: "🪑", tier: 1, skill: "digraph-ch" },
      { w: "chick", emoji: "🐥", tier: 1, skill: "digraph-ch" },
      { w: "cheese", emoji: "🧀", tier: 1, skill: "digraph-ch" },
      { w: "lunch", emoji: "🥪", tier: 1, skill: "digraph-ch" },
      { w: "peach", emoji: "🍑", tier: 1, skill: "digraph-ch" },

      { w: "thin", emoji: "📏", tier: 1, skill: "digraph-th" },
      { w: "bath", emoji: "🛁", tier: 1, skill: "digraph-th" },
      { w: "moth", emoji: "🦋", tier: 1, skill: "digraph-th" },
      { w: "three", emoji: "3️⃣", tier: 1, skill: "digraph-th" },
      { w: "thumb", emoji: "👍", tier: 1, skill: "digraph-th" },
      { w: "teeth", emoji: "🦷", tier: 1, skill: "digraph-th" },

      { w: "king", emoji: "👑", tier: 1, skill: "endings" },
      { w: "ring", emoji: "💍", tier: 1, skill: "endings" },
      { w: "sing", emoji: "🎤", tier: 1, skill: "endings" },
      { w: "pink", emoji: "🩷", tier: 1, skill: "endings" },
      { w: "bank", emoji: "🏦", tier: 1, skill: "endings" },
      { w: "drink", emoji: "🥤", tier: 1, skill: "endings" },
      { w: "hand", emoji: "✋", tier: 1, skill: "endings" },
      { w: "lamp", emoji: "🪔", tier: 1, skill: "endings" },
      { w: "nest", emoji: "🪺", tier: 1, skill: "endings" },
      { w: "mask", emoji: "😷", tier: 1, skill: "endings" },
      { w: "gift", emoji: "🎁", tier: 1, skill: "endings" },
      { w: "milk", emoji: "🥛", tier: 1, skill: "endings" },

      { w: "cake", emoji: "🍰", tier: 2, skill: "silent-a" },
      { w: "game", emoji: "🎮", tier: 2, skill: "silent-a" },
      { w: "name", emoji: "🏷️", tier: 2, skill: "silent-a" },
      { w: "plane", emoji: "✈️", tier: 2, skill: "silent-a" },
      { w: "plate", emoji: "🍽️", tier: 2, skill: "silent-a" },
      { w: "lake", emoji: "🏞️", tier: 2, skill: "silent-a" },
      { w: "gate", emoji: "🚪", tier: 2, skill: "silent-a" },
      { w: "wave", emoji: "🌊", tier: 2, skill: "silent-a" },

      { w: "bike", emoji: "🚲", tier: 2, skill: "silent-i" },
      { w: "five", emoji: "5️⃣", tier: 2, skill: "silent-i" },
      { w: "kite", emoji: "🪁", tier: 2, skill: "silent-i" },
      { w: "line", emoji: "➖", tier: 2, skill: "silent-i" },
      { w: "time", emoji: "⏰", tier: 2, skill: "silent-i" },
      { w: "nine", emoji: "9️⃣", tier: 2, skill: "silent-i" },
      { w: "rice", emoji: "🍚", tier: 2, skill: "silent-i" },
      { w: "pipe", emoji: "🚰", tier: 2, skill: "silent-i" },

      { w: "home", emoji: "🏠", tier: 2, skill: "silent-ou" },
      { w: "nose", emoji: "👃", tier: 2, skill: "silent-ou" },
      { w: "rope", emoji: "🪢", tier: 2, skill: "silent-ou" },
      { w: "rose", emoji: "🌹", tier: 2, skill: "silent-ou" },
      { w: "bone", emoji: "🦴", tier: 2, skill: "silent-ou" },
      { w: "cone", emoji: "🍦", tier: 2, skill: "silent-ou" },
      { w: "cube", emoji: "🧊", tier: 2, skill: "silent-ou" },
      { w: "mule", emoji: "🫏", tier: 2, skill: "silent-ou" },

      { w: "rain", emoji: "🌧️", tier: 2, skill: "ai-ay" },
      { w: "tail", emoji: "🐕", tier: 2, skill: "ai-ay" },
      { w: "snail", emoji: "🐌", tier: 2, skill: "ai-ay" },
      { w: "chain", emoji: "⛓️", tier: 2, skill: "ai-ay" },
      { w: "mail", emoji: "✉️", tier: 2, skill: "ai-ay" },
      { w: "day", emoji: "📅", tier: 2, skill: "ai-ay" },
      { w: "play", emoji: "🛝", tier: 2, skill: "ai-ay" },
      { w: "paint", emoji: "🎨", tier: 2, skill: "ai-ay" },

      { w: "feet", emoji: "🦶", tier: 2, skill: "ee-ea" },
      { w: "seed", emoji: "🌱", tier: 2, skill: "ee-ea" },
      { w: "bee", emoji: "🐝", tier: 2, skill: "ee-ea" },
      { w: "see", emoji: "👀", tier: 2, skill: "ee-ea" },
      { w: "leaf", emoji: "🍃", tier: 2, skill: "ee-ea" },
      { w: "sea", emoji: "🌊", tier: 2, skill: "ee-ea" },
      { w: "team", emoji: "👥", tier: 2, skill: "ee-ea" },
      { w: "read", emoji: "📖", tier: 2, skill: "ee-ea" },

      { w: "boat", emoji: "⛵", tier: 2, skill: "oa-ow" },
      { w: "coat", emoji: "🧥", tier: 2, skill: "oa-ow" },
      { w: "goat", emoji: "🐐", tier: 2, skill: "oa-ow" },
      { w: "road", emoji: "🛣️", tier: 2, skill: "oa-ow" },
      { w: "soap", emoji: "🧼", tier: 2, skill: "oa-ow" },
      { w: "toast", emoji: "🍞", tier: 2, skill: "oa-ow" },
      { w: "crow", emoji: "🐦‍⬛", tier: 2, skill: "oa-ow" },
      { w: "yellow", emoji: "🟡", tier: 2, skill: "oa-ow" },

      { w: "car", emoji: "🚗", tier: 2, skill: "r-diphthong" },
      { w: "farm", emoji: "🚜", tier: 2, skill: "r-diphthong" },
      { w: "bird", emoji: "🐦", tier: 2, skill: "r-diphthong" },
      { w: "girl", emoji: "👧", tier: 2, skill: "r-diphthong" },
      { w: "horse", emoji: "🐎", tier: 2, skill: "r-diphthong" },
      { w: "house", emoji: "🏡", tier: 2, skill: "r-diphthong" },

      { w: "apple", emoji: "🍎", tier: 2, skill: "two-syllable" },
      { w: "baby", emoji: "👶", tier: 2, skill: "two-syllable" },
      { w: "water", emoji: "💧", tier: 2, skill: "two-syllable" },
      { w: "rabbit", emoji: "🐇", tier: 2, skill: "two-syllable" },
      { w: "lemon", emoji: "🍋", tier: 2, skill: "two-syllable" },
      { w: "tiger", emoji: "🐯", tier: 2, skill: "two-syllable" }
    ];

  function numeric(value, fallback = null) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function courseIndex() {
    const levels = window.ENGLISH_BASIC_COURSE?.levels || [];
    const index = new Map();
    levels.forEach(level => level.lessons.forEach((lesson, lessonIndex) => {
      [...lesson.words, ...lesson.transfer].forEach(([word]) => {
        const key = word.toLowerCase();
        const locations = index.get(key) || [];
        locations.push({
          level: level.id,
          lesson: lessonIndex + 1,
          focus: lesson.focus
        });
        index.set(key, locations);
      });
    }));
    return index;
  }

  const VISUAL_BY_WORD = new Map(VISUAL_WORDS.map(word => [word.w.toLowerCase(), word]));
  const FALLBACK_EMOJIS = ["🔤", "📚", "🧩", "⭐", "🎯", "✏️", "🗣️"];

  function fallbackEmoji(word) {
    return FALLBACK_EMOJIS[word.length % FALLBACK_EMOJIS.length];
  }

  function lessonSkill(level, lesson) {
    return `level-${level}-lesson-${lesson}`;
  }

  function buildGameWords() {
    const levels = window.ENGLISH_BASIC_COURSE?.levels || [];
    return levels.flatMap(level => {
      const seen = new Set();
      return level.lessons.flatMap((lesson, lessonIndex) => {
        const entries = [
          ...lesson.words.map(([word]) => ({ word, sourceKind: "lesson" })),
          ...lesson.transfer.map(([word]) => ({ word, sourceKind: "transfer" }))
        ];
        return entries.map(({ word, sourceKind }) => {
          const cleanWord = String(word).trim().toLowerCase();
          if (!cleanWord || seen.has(cleanWord)) return null;
          seen.add(cleanWord);
          const visual = VISUAL_BY_WORD.get(cleanWord);
          return {
            w: cleanWord,
            emoji: visual?.emoji || fallbackEmoji(cleanWord),
            tier: level.id - 1,
            courseLevel: level.id,
            skill: lessonSkill(level.id, lessonIndex + 1),
            sourceLevel: level.id,
            sourceLesson: lessonIndex + 1,
            sourceFocus: lesson.focus,
            sourceKind,
            inCourse: true,
            transferWord: sourceKind === "transfer"
          };
        }).filter(Boolean);
      });
    });
  }

  const GAME_WORDS = buildGameWords();
  const SKILL_PATH_BY_LEVEL = Array.from({ length: 5 }, (_, index) => (
    window.ENGLISH_BASIC_COURSE?.levels?.[index]?.lessons?.map((_, lessonIndex) => lessonSkill(index + 1, lessonIndex + 1)) || []
  ));

  function getGameWords({ courseLevel = null, lesson = null } = {}) {
    const requestedLevel = numeric(courseLevel);
    const requestedLesson = numeric(lesson);

    let records = [...GAME_WORDS];
    if (requestedLevel >= 1 && requestedLevel <= 5) {
      records = records.filter(word => word.courseLevel === requestedLevel);
    }

    // A lesson link starts with that lesson's words, then keeps the rest of
    // the level available for spaced mixing and varied distractors.
    if (requestedLesson && requestedLevel >= 1 && requestedLevel <= 5) {
      records.sort((a, b) => {
        const aPreferred = a.sourceLevel === requestedLevel && a.sourceLesson === requestedLesson ? 1 : 0;
        const bPreferred = b.sourceLevel === requestedLevel && b.sourceLesson === requestedLesson ? 1 : 0;
        return bPreferred - aPreferred;
      });
    }

    return records;
  }

  function getSkillPath(courseLevel = null) {
    const requestedLevel = numeric(courseLevel);
    if (requestedLevel >= 1 && requestedLevel <= 5) {
      return [...SKILL_PATH_BY_LEVEL[requestedLevel - 1]];
    }
    return SKILL_PATH_BY_LEVEL.flat();
  }

  function makeGameHref(courseLevel = null, lesson = null) {
    const params = new URLSearchParams();
    if (courseLevel) params.set("courseLevel", String(courseLevel));
    if (lesson) params.set("lesson", String(lesson));
    const query = params.toString();
    return `word-game/${query ? `?${query}` : ""}`;
  }

  function getCourseAudit() {
    const index = courseIndex();
    const gameWords = getGameWords();
    return {
      courseWords: index.size,
      gameWords: gameWords.length,
      gameWordsInCourse: gameWords.filter(word => word.inCourse).length,
      transferWords: gameWords.filter(word => word.transferWord).length,
      byLevel: Array.from({ length: 5 }, (_, index) => {
        const words = getGameWords({ courseLevel: index + 1 });
        return { level: index + 1, words: words.length, transferWords: words.filter(word => word.transferWord).length };
      })
    };
  }

  window.ENGLISH_BASIC_WORDS = {
    GAME_WORDS,
    SKILL_PATH_BY_LEVEL,
    courseIndex,
    getGameWords,
    getSkillPath,
    makeGameHref,
    getCourseAudit
  };
})();
