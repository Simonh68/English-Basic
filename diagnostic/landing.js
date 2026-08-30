(() => {
  'use strict';
  const api = window.EFN_DIAGNOSTIC;
  const startButton = document.querySelector('#startTest');

  startButton.addEventListener('click', () => {
    const session = api.createSession();
    location.href = `vocabulary.html?session=${encodeURIComponent(session.id)}`;
  });
})();
