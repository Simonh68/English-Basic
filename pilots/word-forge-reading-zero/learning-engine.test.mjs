import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {LearningEngine, posterior, evidenceWindow, estimate} from './learning-engine.mjs';
import {mappings, assets, words, activities} from './learning-content.mjs';
const base = new URL('.', import.meta.url);
const spec = JSON.parse(fs.readFileSync(new URL('learning-model.spec.json', base)));
const DAY = 86400000;
function setup() {
  let time = 1000;
  const engine = new LearningEngine(spec, {clock: () => time});
  const teach = (id, block = id) => engine.completeTeachingBlock(block, id, {learnerActed: true});
  const answer = (id, family = 'sound_to_letter', correct = true, count = 3) => {
    const options = mappings.includes(id) ? [id, ...mappings.filter(x => x !== id)].slice(0, count) : ['RZ-W-AM', 'RZ-W-MAT', 'RZ-W-SAT'].slice(0, count);
    const p = engine.begin(`${id}:${family}`, {optionCount: count, optionItemIds: options});
    return engine.respond(p.encounterId, correct);
  };
  const masterMappings = () => {
    mappings.forEach(id => teach(id));
    for (let day = 0; day < 28; day++) {
      for (const id of mappings) for (const family of ['sound_to_letter', 'letter_to_sound']) answer(id, family);
      time += DAY; engine.newSession();
    }
    assert(mappings.every(id => engine.report(id).gates.M1));
  };
  return {engine, teach, answer, masterMappings, advance: (ms = DAY) => {time += ms; engine.newSession();}};
}
test('Bayesian arithmetic matches documented one/six/eight-success examples', () => {
  const event = {correct: true, weight: 1, optionCount: 3};
  for (const [n, expected] of [[1, .3208], [6, .9191], [8, .9759]])
    assert(Math.abs(posterior(Array(n).fill(event), spec.initialParameters) - expected) < .0001);
  assert(posterior([{...event, correct: false}], spec.initialParameters) < .2);
});
test('effective window treats errors equally, includes fractional boundary, ignores support', () => {
  const events = [{weight: 1, correct: true}, {weight: .5, correct: false}, {weight: 0, correct: true}];
  assert.deepEqual(evidenceWindow(events, 1), [{weight: .5, correct: true}, {weight: .5, correct: false}]);
  assert.deepEqual(evidenceWindow(events.concat(Array(100).fill({weight: 0})), 1), evidenceWindow(events, 1));
});
test('no unknown/unreviewed content or n/i/p prerequisite bypass', () => {
  assert.throws(() => words['RZ-W-AM'].requires.splice(0));
  assert.throws(() => activities[0].requires.push('RZ-G-N'));
  const {engine, teach} = setup();
  assert.throws(() => teach('RZ-G-N'));
  assert.throws(() => teach('RZ-G-T'));
  assert.throws(() => engine.begin('RZ-W-TAN:word_to_audio'));
  assert.throws(() => engine.begin('RZ-W-AT:word_to_audio'));
  assert.throws(() => teach('RZ-W-AM'));
  assert.equal(engine.inspect().blocks['RZ-W-AM'], undefined);
  teach('RZ-G-M'); teach('RZ-G-S');
  assert.throws(() => engine.begin('RZ-G-M:sound_to_letter', {optionCount: 2, optionItemIds: ['RZ-G-M', 'RZ-G-N']}));
  assert.throws(() => engine.begin('RZ-G-M:sound_to_letter', {optionCount: 2, optionItemIds: ['RZ-G-M', 'RZ-G-M']}));
});
test('passive exposure and repeated teaching transition cannot grant gates', () => {
  const {engine, teach} = setup();
  assert.throws(() => engine.completeTeachingBlock('passive', 'RZ-G-M'));
  assert.equal(teach('RZ-G-M'), true);
  assert.equal(teach('RZ-G-M'), false);
  for (let i = 0; i < 200; i++) teach('RZ-G-M', `block-${i}`);
  engine.expose('RZ-G-M', 'audio');
  assert(engine.report('RZ-G-M').qReady > .99);
  assert.equal(engine.report('RZ-G-M').qEvidence, .2);
  assert.equal(engine.report('RZ-G-M').gates.M1, false);
});
test('hint, correction and all retries are zero weight; first error remains evidence', () => {
  const {engine, teach} = setup(); mappings.forEach(id => teach(id));
  const options = {optionItemIds: mappings.slice(0, 3), optionCount: 3};
  let p = engine.begin('RZ-G-M:sound_to_letter', options);
  const wrong = engine.respond(p.encounterId, false);
  assert.equal(wrong.weight, 1); assert(wrong.independent);
  engine.support(p.encounterId, 'correction');
  assert.equal(engine.respond(p.encounterId, true).weight, 0);
  assert(engine.report('RZ-G-M').qEvidence < .2);
  p = engine.begin('RZ-G-M:letter_to_sound', options);
  engine.support(p.encounterId);
  const supported = engine.respond(p.encounterId, true);
  assert.equal(supported.weight, 0); assert.equal(supported.independent, false);
  assert.throws(() => engine.respond(p.encounterId, true));
});
test('answer-option playback differs from target hints and wrong-direction playback', () => {
  const {engine, teach} = setup(); mappings.forEach(id => teach(id));
  const options = {optionCount: 3, optionItemIds: mappings.slice(0, 3)};
  let p = engine.begin('RZ-G-M:letter_to_sound', options);
  mappings.slice(0, 3).forEach(id => engine.playOption(p.encounterId, id));
  assert(engine.respond(p.encounterId, true).independent);
  p = engine.begin('RZ-G-M:sound_to_letter', options);
  engine.playOption(p.encounterId, 'RZ-G-M');
  assert.equal(engine.respond(p.encounterId, true).weight, 0);
  p = engine.begin('RZ-G-S:letter_to_sound', options);
  engine.expose('RZ-G-S', 'audio');
  assert.equal(engine.respond(p.encounterId, true).weight, 0);
});
test('correction review requires three responses on other items or another session', () => {
  const {engine, teach, answer, advance} = setup(); mappings.forEach(id => teach(id));
  const p = engine.begin('RZ-G-M:sound_to_letter', {optionCount: 3, optionItemIds: mappings.slice(0, 3)});
  engine.respond(p.encounterId, false); engine.respond(p.encounterId, true);
  assert.equal(answer('RZ-G-M', 'letter_to_sound').weight, 0);
  answer('RZ-G-S'); answer('RZ-G-A-AE'); answer('RZ-G-T');
  assert.equal(engine.nextPractice().kind, 'review');
  assert.equal(answer('RZ-G-M', 'letter_to_sound').weight, 1);
  advance(); assert.equal(answer('RZ-G-M', 'letter_to_sound').weight, .5);
});
test('near repeated-item farming is capped; the same policy weights wrong answers', () => {
  const a = setup(), b = setup();
  for (const x of [a, b]) mappings.forEach(id => x.teach(id));
  assert.equal(a.answer('RZ-G-M').weight, b.answer('RZ-G-M', 'sound_to_letter', false).weight);
  b.engine.respond(b.engine.inspect().pending.id, true);
  for (let i = 0; i < 100; i++) a.answer('RZ-G-M');
  assert.equal(a.engine.report('RZ-G-M').effectiveEvidence, 1);
  assert.equal(a.engine.report('RZ-G-M').gates.M1, false);
});
test('visual matching never updates phonological estimates', () => {
  const {engine, teach, answer} = setup(); mappings.forEach(id => teach(id));
  assert.equal(answer('RZ-G-M', 'visual_match').weight, 0);
  assert.equal(engine.report('RZ-G-M').qEvidence, .2);
});
test('word activities unlock only after each mapping gate AND word exposure', () => {
  const {engine, teach, masterMappings, answer} = setup(); masterMappings();
  assert(!engine.availableActivities().some(task => task.skill === 'blending'));
  ['RZ-W-AM', 'RZ-W-MAT', 'RZ-W-SAT'].forEach(id => teach(id));
  assert(engine.availableActivities().some(task => task.skill === 'blending'));
  const before = engine.report('blending').qEvidence;
  const e = answer('RZ-W-AM', 'blend_to_word');
  assert.equal(e.weight, .25); assert.equal(e.novel, false);
  assert(engine.report('blending').qEvidence > before);
  assert.equal(engine.report('known_word_recall').qEvidence, .2);
  answer('RZ-W-MAT', 'word_to_audio');
  assert(engine.report('known_word_recall').qEvidence > .2);
  for (const target of ['novel_word_decoding', 'word_meaning', 'sentence_comprehension']) {
    assert.equal(engine.report(target).status, 'unassessed');
    assert.deepEqual(engine.report(target).gates, {M1: false, M2: false, M3: false});
  }
  assert.equal(engine.report('known_word_recall').gates.M2, false);
});
test('exposing all options and assistance consumes novelty permanently', () => {
  const {engine, teach, masterMappings} = setup(); masterMappings();
  ['RZ-W-AM', 'RZ-W-MAT', 'RZ-W-SAT'].forEach(id => teach(id));
  const p = engine.begin('RZ-W-AM:blend_to_word', {optionCount: 3, optionItemIds: ['RZ-W-AM', 'RZ-W-MAT', 'RZ-W-SAT']});
  engine.support(p.encounterId, 'screen_reader_target');
  assert.equal(engine.respond(p.encounterId, true).weight, 0);
  for (const id of ['RZ-W-AM', 'RZ-W-MAT', 'RZ-W-SAT']) assert(engine.inspect().exposure[id].written);
  assert(engine.inspect().exposure['RZ-W-AM'].assisted);
});
test('partial mapping knowledge cannot open dependent words', () => {
  const {engine, teach, answer, advance} = setup(); mappings.forEach(id => teach(id));
  for (let day = 0; day < 28; day++) {
    for (const id of mappings.slice(0, 3)) for (const family of ['sound_to_letter', 'letter_to_sound']) answer(id, family);
    advance();
  }
  assert(engine.report('RZ-G-M').gates.M1);
  assert.equal(engine.report('RZ-G-T').gates.M1, false);
  assert.throws(() => teach('RZ-W-MAT'));
  assert.equal(engine.report('sentence_comprehension').status, 'unassessed');
});
test('sensitivity is a conservative parameter minimum and errors can be recovered', () => {
  const events = Array.from({length: 60}, (_, i) => ({weight: 1, correct: i >= 48, optionCount: 3, itemId: `i${i}`, family: i % 2}));
  const report = estimate(events, spec);
  assert(report.qLow <= report.qEvidence); assert(report.qEvidence > .99);
  assert.equal(report.effectiveEvidence, 12);
  assert(estimate(events, spec, 16).qEvidence < report.qEvidence);
});
test('prediction summaries use pre-answer probabilities; no selected answers or reward API', () => {
  const {engine, teach, answer} = setup(); mappings.forEach(id => teach(id));
  answer('RZ-G-M');
  const state = engine.inspect();
  assert.equal(state.prediction.count, 1);
  assert(Math.abs(state.prediction.brierSum - (1 - (.2 * .85 + .8 * .45)) ** 2) < 1e-12);
  state.taught.push('RZ-G-N'); assert(!engine.inspect().taught.includes('RZ-G-N'));
  assert.equal(typeof engine.reward, 'undefined');
  assert.throws(() => engine.respond(1, 'm'));
  assert(!JSON.stringify(engine.inspect()).includes('selectedAnswer'));
});
test('exact approved audio bindings and all eight hashes remain unchanged', () => {
  let count = 0;
  for (const folder of ['context-candidates', 'whole-word-candidates', 'am-revision']) {
    const manifest = JSON.parse(fs.readFileSync(new URL(`audio/${folder}/manifest.json`, base)));
    assert(manifest.pronunciation_accepted);
    for (const entry of manifest.assets) {
      const bytes = fs.readFileSync(new URL(`audio/${folder}/${entry.file}`, base));
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), entry.sha256); count++;
    }
  }
  assert.equal(count, 8);
  Object.values(assets).forEach(path => assert(fs.existsSync(new URL(path, base))));
});

test('spaced reviews follow 1/3/7 days and late error resets review advice', () => {
  const {engine, teach, answer, advance} = setup(); mappings.forEach(id => teach(id));
  answer('RZ-G-M');
  assert.equal(engine.inspect().spaced['RZ-G-M'].level, 0);
  advance(); assert.equal(engine.nextPractice().kind, 'spaced_review');
  answer('RZ-G-M'); assert.equal(engine.inspect().spaced['RZ-G-M'].level, 1);
  advance(3 * DAY); answer('RZ-G-M');
  assert.equal(engine.inspect().spaced['RZ-G-M'].level, 2);
  advance(7 * DAY); const error = answer('RZ-G-M', 'sound_to_letter', false);
  assert.equal(error.weight, .5);
  engine.respond(engine.inspect().pending.id, true);
  assert.equal(engine.inspect().spaced['RZ-G-M'], undefined);
  assert.equal(engine.inspect().review[0].itemId, 'RZ-G-M');
});
test('supported failure limit offers a finish rather than endless corrections', () => {
  const {engine, teach} = setup(); mappings.forEach(id => teach(id));
  for (let i = 0; i < 3; i++) {
    const p = engine.begin('RZ-G-M:sound_to_letter', {optionCount: 3, optionItemIds: mappings.slice(0, 3)});
    engine.support(p.encounterId); engine.respond(p.encounterId, false); engine.respond(p.encounterId, true);
  }
  assert.equal(engine.nextPractice().kind, 'finish_or_familiar');
});
test('deterministic guessing and side-choice simulations never claim word or sentence mastery', () => {
  let seed = 17;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (const mode of ['guess', 'side', 'hints']) {
    const {engine, teach, answer, advance} = setup(); mappings.forEach(id => teach(id));
    for (let day = 0; day < 40; day++) {
      let position = day * 8;
      for (const id of mappings) for (const family of ['sound_to_letter', 'letter_to_sound']) {
        // Fixed first-side choice with a balanced rotating target position.
        const correct = mode === 'guess' ? random() < 1 / 3 : mode === 'side' ? position++ % 3 === 0 : true;
        if (mode === 'hints') {
          const p = engine.begin(`${id}:${family}`, {optionCount: 3, optionItemIds: [id, ...mappings.filter(x => x !== id)].slice(0, 3)});
          engine.support(p.encounterId); engine.respond(p.encounterId, true);
        } else {
          answer(id, family, correct);
          if (!correct) engine.respond(engine.inspect().pending.id, true);
        }
      }
      advance();
    }
    assert(!mappings.every(id => engine.report(id).gates.M1));
    for (const target of ['known_word_recall', 'novel_word_decoding', 'sentence_comprehension'])
      assert.equal(engine.report(target).gates.M2, false);
  }
});
