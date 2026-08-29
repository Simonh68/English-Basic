(() => {
  'use strict';
  const api = window.EFN_DIAGNOSTIC;
  const gradeSelect = document.querySelector('#gradeSelect');
  const links = [...document.querySelectorAll('[data-test-link]')];
  const params = new URLSearchParams(location.search);

  function updateLinks() {
    const grade = Number(gradeSelect.value);
    const valid = grade >= 7 && grade <= 12;
    links.forEach(link => {
      const base = link.getAttribute('href').split('?')[0];
      link.setAttribute('aria-disabled', String(!valid));
      link.href = valid ? `${base}?grade=${grade}` : base;
    });
    if (valid) api.setGrade(grade);
  }

  async function initialize() {
    const savedGrade = api.getGrade();
    if (savedGrade) gradeSelect.value = String(savedGrade);
    updateLinks();
    gradeSelect.addEventListener('change', () => {
      updateLinks();
      const target = params.get('target');
      if (target === 'vocabulary' || target === 'reading') {
        location.href = `${target}.html?grade=${gradeSelect.value}`;
      }
    });
    try {
      const manifest = await api.loadManifest();
      document.querySelector('#bankVersion').textContent = manifest.version;
      document.querySelector('#bankDate').textContent = `עודכן ${manifest.releasedHe}`;
    } catch {
      document.querySelector('#bankVersion').textContent = 'לא זמין';
      document.querySelector('#bankDate').textContent = 'נסו לרענן את הדף';
    }
  }

  initialize();
})();
