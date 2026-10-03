// Stage 2 adapter. The proposal remains unchanged; only accepted assets are bound.
const freeze = object => {
  for (const value of Object.values(object)) if (value && typeof value === 'object') freeze(value);
  return Object.freeze(object);
};
export const mappings = Object.freeze(['RZ-G-M', 'RZ-G-S', 'RZ-G-A-AE', 'RZ-G-T']);
const phonemes = ['phoneme-m.wav', 'phoneme-s.wav', 'phoneme-short-a.wav', 'phoneme-t.wav'];
export const assets = Object.freeze(Object.fromEntries([
  ...mappings.map((id, i) => [id, `audio/context-candidates/${phonemes[i]}`]),
  ...['am', 'mat', 'sat'].map(word => [`RZ-W-${word.toUpperCase()}`, `audio/whole-word-candidates/${word}.wav`]),
  ['blend-am', 'audio/am-revision/am-connected-moderate.wav'],
]));
export const words = freeze({
  'RZ-W-AM': {requires: ['RZ-G-A-AE', 'RZ-G-M']},
  'RZ-W-MAT': {requires: ['RZ-G-M', 'RZ-G-A-AE', 'RZ-G-T']},
  'RZ-W-SAT': {requires: ['RZ-G-S', 'RZ-G-A-AE', 'RZ-G-T']},
});
const tasks = [];
for (const id of mappings) {
  for (const direction of ['sound_to_letter', 'letter_to_sound']) {
    tasks.push({id: `${id}:${direction}`, itemId: id, skill: 'letter_sound',
      family: direction, target: id, requires: [id], audio: assets[id], optionCounts: [2, 3]});
  }
  tasks.push({id: `${id}:visual_match`, itemId: id, skill: null, family: 'visual_match',
    target: null, requires: [id], audio: null, optionCounts: [2, 3]});
}
for (const [id, word] of Object.entries(words)) {
  for (const family of ['word_to_audio', 'missing_letter']) {
    tasks.push({id: `${id}:${family}`, itemId: id, skill: 'known_word_recall',
      family, target: 'known_word_recall', requires: word.requires, audio: assets[id], optionCounts: [2, 3]});
  }
}
// Only am has an approved complete moderate blending model. These families are
// recognition tasks, not recordings or measurements of the learner's speech.
for (const family of ['blend_to_word', 'word_to_blend']) {
  tasks.push({id: `RZ-W-AM:${family}`, itemId: 'RZ-W-AM', skill: 'blending', family,
    target: 'blending', requires: words['RZ-W-AM'].requires, audio: assets['blend-am'], optionCounts: [2, 3]});
}
export const activities = freeze(tasks);
export const unavailable = Object.freeze({
  novel_word_decoding: 'No reviewed, audio-approved held-out transfer item in m/s/a/t.',
  word_meaning: 'No reviewed semantic choices in the current content pack.',
  sentence_comprehension: 'No controlled sentence activities in this slice.',
});
export const contentVersion = 'rz-m-s-a-t-engine-1';
