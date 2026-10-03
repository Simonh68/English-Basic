import {activities, mappings, words, unavailable, contentVersion} from './learning-content.mjs';

const DAY = 86400000;
const clone = value => structuredClone(value);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const logit = q => Math.log(q / (1 - q));
const logistic = x => 1 / (1 + Math.exp(-x));

// Pure model arithmetic; no storage, rewards, network or UI dependencies.
export function evidenceWindow(events, capacity = 12) {
  assert(Number.isFinite(capacity) && capacity > 0, 'Invalid evidence capacity');
  let remaining = capacity;
  const result = [];
  for (const event of [...events].reverse()) {
    if (event.weight <= 0) continue;
    const weight = Math.min(event.weight, remaining);
    if (weight > 0) result.unshift({...event, weight});
    remaining -= weight;
    if (remaining <= 0) break;
  }
  return result;
}
export function posterior(events, {prior, slip, guessByOptionCount}) {
  assert(prior > 0 && prior < 1 && slip > 0 && slip < 1, 'Invalid model parameters');
  let odds = logit(prior);
  for (const event of events) {
    const guess = guessByOptionCount[event.optionCount];
    assert(guess > 0 && guess < 1 - slip && event.weight >= 0 && event.weight <= 1,
      'Invalid guess or evidence weight');
    const ratio = event.correct ? (1 - slip) / guess : slip / (1 - guess);
    odds += event.weight * Math.log(ratio);
  }
  return logistic(odds);
}
export function estimate(events, spec, capacity = spec.gatingEvidencePath.effectiveEvidenceWindow) {
  const window = evidenceWindow(events, capacity);
  const q = posterior(window, spec.initialParameters);
  let qLow = 1;
  const grid = spec.sensitivityGrid;
  for (const prior of grid.prior) for (const slip of grid.slip)
    for (const g2 of grid.guessByOptionCount[2]) for (const g3 of grid.guessByOptionCount[3]) {
      qLow = Math.min(qLow, posterior(window, {prior, slip, guessByOptionCount: {2: g2, 3: g3}}));
    }
  return {qEvidence: q, qLow, effectiveEvidence: window.reduce((n, e) => n + e.weight, 0),
    validAttempts: window.length, uniqueItems: new Set(window.map(e => e.itemId)).size,
    taskFamilies: new Set(window.map(e => e.family)).size, window};
}

export class LearningEngine {
  #spec; #clock; #state; #catalog;
  constructor(spec, {clock = () => Date.now()} = {}) {
    assert(spec.version === 'probability-design-1' && spec.empiricallyCalibrated === false,
      'Unsupported learning specification');
    this.#spec = clone(spec); this.#clock = clock;
    this.#catalog = new Map(activities.map(task => [task.id, clone(task)]));
    this.#state = {contentVersion, session: 0, sequence: 0, taught: [], blocks: {},
      exposure: {}, evidence: {}, ready: {}, milestones: {}, pending: null,
      responses: [], review: [], spaced: {}, outcomes: [], prediction: {count: 0, brierSum: 0, bins: {}}};
    this.newSession();
  }
  #now() {
    const time = this.#clock();
    assert(Number.isFinite(time) && time >= 0, 'Invalid local time'); return time;
  }
  newSession() {
    assert(!this.#state.pending, 'Resolve or abandon current encounter first');
    this.#state.session++; return this.#state.session;
  }
  #expose(itemId, kind) {
    const known = mappings.includes(itemId) || Object.hasOwn(words, itemId);
    assert(known && ['written', 'audio', 'hint', 'correction'].includes(kind), 'Invalid exposure');
    const entry = this.#state.exposure[itemId] ?? {written: false, audio: false, assisted: false};
    if (kind === 'written') entry.written = true;
    if (kind === 'audio') entry.audio = true;
    if (kind === 'hint' || kind === 'correction') entry.assisted = true;
    this.#state.exposure[itemId] = entry;
  }
  expose(itemId, kind) {
    this.#expose(itemId, kind);
    // External solution/target exposure while an encounter is open must never
    // leave that encounter independent. Option playback has its own safe API.
    if (this.#state.pending?.task.itemId === itemId) this.#state.pending.supported = true;
  }
  completeTeachingBlock(blockId, itemId, {learnerActed = false} = {}) {
    assert(typeof blockId === 'string' && blockId.length > 0 && blockId.length <= 80, 'Invalid block ID');
    assert(!this.#state.pending, 'Teaching must precede a new encounter');
    assert(learnerActed === true, 'Passive viewing is not a completed teaching block');
    assert(mappings.includes(itemId) || Object.hasOwn(words, itemId), 'Unavailable teaching content');
    if (this.#state.blocks[blockId]) {
      assert(this.#state.blocks[blockId] === itemId, 'Teaching block ID collision'); return false;
    }
    if (mappings.includes(itemId) && !this.#state.taught.includes(itemId)) {
      assert(mappings[this.#state.taught.length] === itemId, 'Introduce only next mapping');
      this.#state.taught.push(itemId);
    }
    if (words[itemId]) assert(words[itemId].requires.every(id => this.report(id).gates.M1), 'Unmet mapping prerequisites');
    this.#state.blocks[blockId] = itemId;
    this.#expose(itemId, 'written'); this.#expose(itemId, 'audio');
    const targets = mappings.includes(itemId) ? [itemId] : ['known_word_recall', ...(itemId === 'RZ-W-AM' ? ['blending'] : [])];
    for (const target of targets) {
      const q = this.#state.ready[target] ?? this.report(target).qEvidence;
      this.#state.ready[target] = q + this.#spec.initialParameters.learningTransitionOncePerCompletedTeachingBlock * (1 - q);
    }
    return true;
  }
  availableActivities() {
    return activities.filter(task => this.#eligible(task)).map(clone);
  }
  #eligible(task) {
    if (!task.requires.every(id => this.#state.taught.includes(id))) return false;
    if (task.skill === 'letter_sound' || task.skill === null) return true;
    if (!task.requires.every(id => this.report(id).gates.M1)) return false;
    const exposure = this.#state.exposure[task.itemId];
    // Current word tasks are practice/recognition of exposed items, never transfer.
    return Boolean(exposure?.written && exposure?.audio);
  }
  begin(activityId, {optionCount = 2, optionItemIds} = {}) {
    assert(!this.#state.pending, 'An encounter is already open');
    const task = this.#catalog.get(activityId);
    assert(task && this.#eligible(task), 'Activity unavailable or prerequisites unmet');
    assert(task.optionCounts.includes(optionCount), 'Unsupported option count');
    assert(Array.isArray(optionItemIds) && optionItemIds.length === optionCount &&
      new Set(optionItemIds).size === optionCount && optionItemIds.includes(task.itemId), 'Invalid controlled choices');
    const mappingTask = mappings.includes(task.itemId);
    assert(optionItemIds.every(id => mappingTask ? this.#state.taught.includes(id) :
      words[id] && words[id].requires.every(req => this.report(req).gates.M1) &&
      this.#state.exposure[id]?.written && this.#state.exposure[id]?.audio), 'Uncontrolled distractor');
    const id = ++this.#state.sequence;
    const before = clone(this.#state.exposure[task.itemId] ?? {});
    const prediction = task.target ? this.report(task.target).qEvidence * (1 - this.#spec.initialParameters.slip) +
      (1 - this.report(task.target).qEvidence) * this.#spec.initialParameters.guessByOptionCount[optionCount] : null;
    this.#state.pending = {id, task: clone(task), optionCount, options: [...optionItemIds],
      before, supported: false, responded: false, firstCorrect: null, prediction};
    // Presentation itself consumes written novelty of EVERY visible choice.
    if (task.family !== 'letter_to_sound' && task.family !== 'word_to_blend' && task.family !== 'word_to_audio')
      optionItemIds.forEach(item => this.#expose(item, 'written'));
    this.#expose(task.itemId, 'written');
    if (task.family === 'sound_to_letter' || task.family === 'blend_to_word') this.#expose(task.itemId, 'audio');
    return {encounterId: id, activityId, optionCount, prediction, exposureBefore: before};
  }
  playOption(encounterId, itemId) {
    const p = this.#pending(encounterId);
    assert(p.options.includes(itemId), 'Not an answer option');
    const audioFamilies = ['letter_to_sound', 'word_to_audio', 'word_to_blend'];
    if (!audioFamilies.includes(p.task.family)) p.supported = true;
    this.#expose(itemId, 'audio');
    return true;
  }
  support(encounterId, kind = 'hint') {
    assert(['hint', 'correction', 'target_audio', 'remove_option', 'screen_reader_target'].includes(kind), 'Unknown support');
    const p = this.#pending(encounterId); p.supported = true;
    this.#expose(p.task.itemId, kind === 'correction' ? 'correction' : 'hint');
    this.#expose(p.task.itemId, 'audio');
  }
  #pending(id) {
    assert(this.#state.pending?.id === id, 'Unknown or settled encounter'); return this.#state.pending;
  }
  respond(encounterId, correct) {
    assert(typeof correct === 'boolean', 'Result must be boolean, no answer text');
    const p = this.#pending(encounterId);
    const first = !p.responded;
    if (first) {
      p.firstCorrect = correct; p.responded = true;
      this.#state.responses.push({itemId: p.task.itemId, id: p.id});
    }
    const independent = first && !p.supported;
    const time = this.#now();
    const prior = (this.#state.evidence[p.task.target] ?? []);
    const same = prior.filter(e => e.itemId === p.task.itemId && e.family === p.task.family);
    const last = same.at(-1);
    // Cap correlated near repeats per item/family/session; outcome never selects weight.
    const nearUsed = same.filter(e => e.session === this.#state.session).reduce((n, e) => n + e.weight, 0);
    const review = this.#state.review.find(e => e.itemId === p.task.itemId);
    const otherResponses = review ? this.#state.responses.filter(e => e.id > review.after && e.itemId !== review.itemId).length : 3;
    const reviewReady = !review || otherResponses >= 3 || review.session !== this.#state.session;
    const weight = independent && p.task.target && reviewReady ?
      (!last && p.task.skill === 'letter_sound' ? 1 :
        last && time - last.time >= DAY ? 0.5 : Math.max(0, 0.25 - nearUsed)) : 0;
    const event = {id: p.id, skill: p.task.skill, itemId: p.task.itemId, family: p.task.family,
      optionCount: p.optionCount, correct, first, independent, supported: !independent,
      weight, novel: false, time, session: this.#state.session};
    if (weight > 0) {
      const q = this.#state.ready[p.task.target] ?? this.report(p.task.target).qEvidence;
      this.#state.evidence[p.task.target] ??= [];
      this.#state.evidence[p.task.target].push(event);
      this.#state.ready[p.task.target] = posterior([event], {...this.#spec.initialParameters, prior: Math.min(1 - 1e-12, Math.max(1e-12, q))});
      const predicted = p.prediction;
      const stats = this.#state.prediction;
      stats.count++; stats.brierSum += (predicted - Number(correct)) ** 2;
      const bin = Math.min(9, Math.floor(predicted * 10));
      stats.bins[bin] ??= {count: 0, predictionSum: 0, correctCount: 0};
      stats.bins[bin].count++; stats.bins[bin].predictionSum += predicted; stats.bins[bin].correctCount += Number(correct);
    }
    this.#state.outcomes.push(event);
    if (first && (!correct || p.supported)) this.#queueReview(p.task.itemId, p.id, time);
    if (independent && correct && reviewReady) {
      this.#state.review = this.#state.review.filter(e => e.itemId !== p.task.itemId);
      if (weight > 0) {
        const old = this.#state.spaced[p.task.itemId];
        const level = old && time >= old.due ? Math.min(2, old.level + 1) : old?.level ?? 0;
        this.#state.spaced[p.task.itemId] = {level, due: time + [1, 3, 7][level] * DAY};
      }
    }
    if (first && p.task.target) this.#recordMilestones(p.task.target, time, independent && weight > 0);
    if (!correct) p.supported = true; // Correction/retry is permanently supported.
    if (correct) this.#state.pending = null;
    return clone(event);
  }
  #queueReview(itemId, after, time) {
    delete this.#state.spaced[itemId];
    this.#state.review = this.#state.review.filter(e => e.itemId !== itemId);
    this.#state.review.push({itemId, after, time, session: this.#state.session});
  }
  abandon(encounterId) {
    const p = this.#pending(encounterId);
    this.#queueReview(p.task.itemId, p.id, this.#now()); this.#state.pending = null;
  }
  #recordMilestones(target, time, valid) {
    if (!valid) return;
    const gates = this.report(target).gates;
    this.#state.milestones[target] ??= {};
    for (const gate of ['M1', 'M2', 'M3']) if (gates[gate] && !this.#state.milestones[target][gate])
      this.#state.milestones[target][gate] = {time, sequence: this.#state.sequence, session: this.#state.session};
  }
  report(target) {
    const events = this.#state.evidence[target] ?? [];
    const estimated = estimate(events, this.#spec);
    const {qEvidence, qLow, effectiveEvidence, validAttempts, uniqueItems, taskFamilies, window} = estimated;
    const qReady = this.#state.ready[target] ?? qEvidence;
    const spec = this.#spec.gates;
    const isMapping = mappings.includes(target);
    const unavailableReason = unavailable[target] ?? null;
    const enough = gate => qEvidence >= spec[gate].q && qLow >= spec[gate].qLow;
    const M1 = !unavailableReason && enough('M1') && validAttempts >= spec.M1.validAttemptsMin &&
      taskFamilies >= spec.M1.taskFamiliesMin && (!isMapping || validAttempts >= spec.M1.eachRequiredMappingOpportunitiesMin);
    const M2 = !unavailableReason && enough('M2') && effectiveEvidence >= spec.M2.effectiveEvidenceMin &&
      uniqueItems >= spec.M2.uniqueItemsMin && taskFamilies >= spec.M2.taskFamiliesMin;
    const m2 = this.#state.milestones[target]?.M2;
    const later = m2 ? window.filter(e => e.id > m2.sequence && e.time - m2.time >= DAY && e.session !== m2.session) : [];
    const M3 = Boolean(!unavailableReason && m2 && enough('M3') && later.length >= spec.M3.additionalValidEvidenceMin &&
      later.filter(e => e.novel).length >= spec.M3.unseenTransferMin);
    return {target, status: unavailableReason ? 'unassessed' : events.length ? 'evidence_observed' : 'unassessed',
      unavailableReason, qEvidence, qLow, qReady, empiricallyCalibrated: false,
      lowEstimateMeaning: this.#spec.sensitivityGrid.lowEstimate,
      effectiveEvidence, validAttempts, uniqueItems, taskFamilies, gates: {M1, M2, M3},
      historicalMilestones: clone(this.#state.milestones[target] ?? {}),
      windowSensitivity: Object.fromEntries(this.#spec.gatingEvidencePath.windowSensitivity.map(n => [n, estimate(events, this.#spec, n).qEvidence]))};
  }
  nextPractice() {
    if (this.#state.pending) return {kind: 'resume', encounterId: this.#state.pending.id};
    const available = this.availableActivities().filter(task => task.skill);
    const recent = this.#state.outcomes.filter(e => e.first && e.session === this.#state.session);
    const failureCounts = {};
    for (const event of recent.filter(e => !e.correct && e.supported))
      failureCounts[event.itemId] = (failureCounts[event.itemId] ?? 0) + 1;
    if (Object.values(failureCounts).some(count => count >= 3))
      return {kind: 'finish_or_familiar', reason: 'supported_failure_limit'};
    for (const review of this.#state.review) {
      const ready = review.session !== this.#state.session || this.#state.responses.filter(e => e.id > review.after && e.itemId !== review.itemId).length >= 3;
      const task = available.find(task => task.itemId === review.itemId);
      if (ready && task) return {kind: 'review', activityId: task.id};
    }
    for (const [itemId, schedule] of Object.entries(this.#state.spaced)) {
      const task = available.find(task => task.itemId === itemId);
      if (task && this.#now() >= schedule.due) return {kind: 'spaced_review', activityId: task.id};
    }
    const lastTwo = recent.slice(-2);
    if (lastTwo.length === 2 && lastTwo.every(e => !e.correct) && lastTwo[0].itemId === lastTwo[1].itemId) {
      const task = available.find(task => task.itemId === lastTwo[0].itemId);
      if (task) return {kind: 'supported_practice', activityId: task.id, optionCount: 2};
    }
    // Scheduling advice only; the session controller remains stage 3 work.
    const next = mappings.find(id => !this.#state.taught.includes(id));
    if (next) return {kind: 'teach', itemId: next};
    return available.length ? {kind: 'practice', activityId: available.sort((a, b) =>
      this.report(a.target).qEvidence - this.report(b.target).qEvidence)[0].id} : {kind: 'stop'};
  }
  inspect() { return clone(this.#state); }
}
