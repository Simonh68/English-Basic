/* Word Forge · Memory Run. Pure state machine; no network or personal data. */
(function (root) {
  'use strict';
  const VERSION = 1;
  const CAPS = [1, 3, 4, 5, 6];
  const reward = n => n > 0 ? Math.round(10 * n * 1.25 ** (n - 1)) : 0;
  const capFor = (level, lesson) => CAPS[Math.min(4, (level - 1) * 10 + lesson - 1)];
  const secureRandom = () => {
    if (globalThis.crypto?.getRandomValues) return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
    return Math.random();
  };
  class Game {
    constructor(course, plans, saved = null, random = secureRandom) {
      this.course = course; this.plans = plans; this.random = random;
      this.s = { version: VERSION, level: 1, lesson: 1, bank: 0, tick: 0, stats: {}, completed: [], run: null };
      if (saved?.version === VERSION && saved.stats && typeof saved.stats === 'object' && Array.isArray(saved.completed)) {
        this.s = structuredClone(saved);
        this.s.bank = Math.max(0, Number(this.s.bank) || 0);
        if (!this.validRun()) this.s.run = null;
      }
    }
    validRun() {
      const r = this.s.run;
      return !r || (Number.isInteger(this.s.level) && this.s.level >= 1 && this.s.level <= 5 &&
        Number.isInteger(this.s.lesson) && this.s.lesson >= 1 && this.s.lesson <= 10 &&
        ['learn','drawing','challenge','feedback','summary'].includes(r.phase) &&
        Number.isInteger(r.cursor) && r.cursor >= 0 && r.cursor <= this.items.length &&
        ['pending','queue','passed','seen','history'].every(k => Array.isArray(r[k])) &&
        [...r.pending,...r.queue,...r.passed,...r.seen].every(i => Number.isInteger(i) && i >= 0 && i < this.items.length) &&
        r.pending.length <= this.cap && Number.isFinite(r.score) && r.score >= 0 &&
        (!r.challenge || (Number.isInteger(r.challenge.index) && r.challenge.index >= 0 && r.challenge.index < this.items.length)));
    }
    get items() {
      const lesson = this.course.levels[this.s.level - 1].lessons[this.s.lesson - 1];
      const all = [...lesson.words.map(([word, translation]) => ({word, translation, kind:'target'})),
        ...lesson.transfer.map(([word, translation]) => ({word, translation, kind:'transfer'}))];
      const order = this.plans.rounds[`${this.s.level}-${this.s.lesson}`];
      return order ? order.flatMap(group => group.words.map(w => all.find(x => x.word.toLowerCase() === w))) : all;
    }
    get cap() { return capFor(this.s.level, this.s.lesson); }
    get run() { return this.s.run; }
    get key() { return `${this.s.level}-${this.s.lesson}`; }
    atSoundFamilyEnd(cursor) {
      const groups=this.plans.rounds[this.key];
      if(!groups)return false;
      let end=0;return groups.some(group=>{end+=group.words.length;return cursor===end;});
    }
    stat(index) { return this.s.stats[`${this.key}:${this.items[index].word.toLowerCase()}`] || {attempts:0, correct:0, lastCorrect:-100, spaced:false}; }
    start(level = 1, lesson = 1) {
      if (!Number.isInteger(level) || level < 1 || level > 5 || !Number.isInteger(lesson) || lesson < 1 || lesson > 10) return false;
      this.s.level = level; this.s.lesson = lesson;
      this.s.run = {phase:'learn', cursor:0, pending:[], queue:[], passed:[], seen:[0], history:[], score:0,
        challenge:null, feedback:null, settled:false, rounds:0, mistakes:0, streak:0, reviewStreak:0, missesInRow:0};
      return true;
    }
    plan(index) {
      const word = this.items[index].word.toLowerCase();
      const override = this.plans.overrides[this.key]?.[word];
      const chunks = override ? [override] : (this.plans.chunks[this.key] || []);
      const correct = chunks.filter(c => c.length > 1 && word.includes(c))
        .sort((a,b) => b.length - a.length || word.indexOf(a) - word.indexOf(b))[0];
      if (correct) return {kind:'chunk', correct, start:word.indexOf(correct), length:correct.length};
      const center = (word.length - 1) / 2;
      const start = [...word].map((c,i) => /[a-z]/.test(c) ? i : -1).filter(i => i >= 0).sort((a,b) => Math.abs(a-center)-Math.abs(b-center))[0];
      return {kind:'letter', correct:word[start], start, length:1};
    }
    shuffle(list) {
      const result = [...list];
      for (let i=result.length-1;i>0;i--) { const j=Math.floor(this.random()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; }
      return result;
    }
    queue(index) { if (!this.run.queue.includes(index)) this.run.queue.push(index); }
    risk() {
      const count = this.run?.pending.length || 0;
      const prize = reward(count);
      return {count, prize, loss: this.s.level===1 && this.s.lesson===1 ? 0 : Math.min(this.run?.score||0, Math.ceil(prize/2))};
    }
    defer() {
      const r = this.run;
      if (!r || r.phase!=='learn' || r.cursor>=this.items.length || r.pending.length>=this.cap) return false;
      r.pending.push(r.cursor++);
      if (r.pending.length===this.cap || r.cursor===this.items.length || this.atSoundFamilyEnd(r.cursor)) this.draw();
      else if (!r.seen.includes(r.cursor)) r.seen.push(r.cursor);
      return true;
    }
    challengeNow() {
      const r=this.run;
      if (!r || r.phase!=='learn') return false;
      if (r.pending.length) this.draw();
      else if (r.cursor<this.items.length) this.makeChallenge(r.cursor++, 'direct', [], 10, 0);
      else return false;
      return true;
    }
    draw() {
      const r=this.run;
      if (!r.pending.length) return;
      const pool=[...r.pending], terms=this.risk();
      // Commit the random outcome before animation, so refresh cannot reroll.
      const index=pool[Math.floor(this.random()*pool.length)];
      this.makeChallenge(index, 'risk', pool, terms.prize, terms.loss);
      r.phase=pool.length>1 ? 'drawing' : 'challenge';
    }
    finishDraw() { if (this.run?.phase!=='drawing') return false; this.run.phase='challenge'; return true; }
    makeChallenge(index, origin, pool, prize, loss) {
      const plan=this.plan(index);
      const candidates=plan.kind==='letter' ? [...'aeiourtlsnmpbdfgckwyhvz'] : (this.plans.pools[plan.length] || []);
      const other=this.shuffle([...new Set(candidates)].filter(c=>c!==plan.correct)).slice(0,3);
      if (other.length!==3) throw new Error('Four distinct pedagogical options required');
      this.run.challenge={index, origin, pool, prize, loss, plan, options:this.shuffle([plan.correct,...other]), hinted:false};
      this.run.phase='challenge'; this.run.feedback=null;
    }
    hint() {
      if (this.run?.phase!=='challenge') return false;
      this.run.challenge.hinted=true; this.run.challenge.prize=0; this.run.challenge.loss=0;
      return true;
    }
    answer(option) {
      const r=this.run, c=r?.challenge;
      if (!r || r.phase!=='challenge' || !c || !c.options.includes(option)) return false;
      const correct=option===c.plan.correct;
      const independent=correct&&!c.hinted;
      const delta=independent ? c.prize : correct ? 0 : -Math.min(r.score,c.loss);
      r.score+=delta; this.s.tick++;
      const old=this.stat(c.index);
      const spaced=independent && old.correct>0 && this.s.tick-old.lastCorrect>=3;
      this.s.stats[`${this.key}:${this.items[c.index].word.toLowerCase()}`]={
        attempts:old.attempts+1, correct:old.correct+(independent?1:0),
        lastCorrect:independent?this.s.tick:old.lastCorrect,
        spaced:independent ? old.spaced||spaced : false
      };
      if (independent && !r.passed.includes(c.index)) r.passed.push(c.index);
      if (!independent) this.queue(c.index);
      if (c.origin==='risk') {
        for (const i of c.pool) if (i!==c.index) this.queue(i);
        r.pending=[]; r.rounds++; r.reviewStreak=0;
      } else if (c.origin==='direct') { r.rounds++; r.reviewStreak=0; }
      else { r.reviewStreak++; }
      r.history.push(c.index); r.history=r.history.slice(-2);
      r.mistakes+=correct?0:1; r.missesInRow=correct?0:r.missesInRow+1;
      r.streak=independent?r.streak+1:0;
      r.feedback={correct, independent, delta, index:c.index, origin:c.origin, prize:c.prize, poolCount:c.pool.length,
        firstSpaced:spaced&&!old.spaced, hinted:c.hinted};
      r.phase='feedback';
      return true;
    }
    next() {
      const r=this.run;
      if (!r || r.phase!=='feedback') return false;
      r.challenge=null;
      const due=r.queue.find(i=>!r.history.includes(i));
      const atEnd=r.cursor>=this.items.length;
      const needsReview=r.queue.length>=6 || r.reviewStreak<1 || atEnd;
      if (needsReview && due!==undefined) {
        r.queue=r.queue.filter(i=>i!==due);
        this.makeChallenge(due,'review',[],10,0);
      } else if (atEnd && r.queue.length) {
        // Insert a different already-seen word instead of immediately retesting a correction.
        const filler=r.seen.find(i=>!r.history.includes(i)&&!r.queue.includes(i));
        if (filler!==undefined) this.makeChallenge(filler,'spacing',[],0,0);
        else { r.phase='learn'; throw new Error('Unable to space review safely'); }
      } else if (atEnd) this.finish();
      else { r.phase='learn'; if (!r.seen.includes(r.cursor)) r.seen.push(r.cursor); }
      return true;
    }
    finish() {
      const r=this.run;
      if (r.queue.length || r.pending.length || r.passed.length!==this.items.length) throw new Error('Untested words cannot complete a stage');
      r.phase='summary';
      if (!r.settled) { this.s.bank+=r.score; r.settled=true; if(!this.s.completed.includes(this.key))this.s.completed.push(this.key); }
    }
    snapshot() { return structuredClone(this.s); }
  }
  const api={Game,reward,capFor,VERSION};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.MemoryForge=Object.freeze(api);
})(globalThis);
