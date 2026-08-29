(() => {
  'use strict';
  const api = window.EFN_DIAGNOSTIC;
  const gradeSelect = document.querySelector('#gradeSelect');
  const startButton = document.querySelector('#startTest');
  const error = document.querySelector('#gradeError');

  const savedGrade = api.getGrade();
  if (savedGrade) gradeSelect.value = String(savedGrade);

  gradeSelect.addEventListener('change', () => {
    error.hidden = true;
    if (gradeSelect.value) api.setGrade(Number(gradeSelect.value));
  });

  startButton.addEventListener('click', () => {
    const grade = Number(gradeSelect.value);
    if (grade < 7 || grade > 12) {
      error.hidden = false;
      gradeSelect.focus();
      return;
    }
    const session = api.createSession(grade);
    location.href = `vocabulary.html?grade=${grade}&session=${encodeURIComponent(session.id)}`;
  });
})();
