(() => {
  if (window.__EFNOwnershipLoaded) return;
  window.__EFNOwnershipLoaded = true;

  const owner = "שמעון הרצל הלוי גובני";
  const ownerAlias = "Simon Halevi";
  const sourceUrl = document.currentScript?.src || location.href;
  const copyrightUrl = new URL("copyright.html", sourceUrl).href;

  const ensureMeta = (name, content) => {
    let meta = document.head.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = content;
  };

  ensureMeta("author", `${owner} (${ownerAlias})`);
  ensureMeta("copyright", `© 2026 ${owner}. כל הזכויות שמורות.`);

  const render = () => {
    if (document.querySelector("[data-efn-ownership]")) return;

    const style = document.createElement("style");
    style.id = "efn-ownership-style";
    style.textContent = `
      [data-efn-ownership] {
        position: relative;
        z-index: 2;
        display: grid;
        gap: .35rem;
        justify-items: center;
        width: 100%;
        margin: 0;
        padding: 1rem clamp(1rem, 4vw, 2.5rem);
        border-top: 1px solid rgba(255,255,255,.16);
        background: #071120;
        color: #d9e3f2;
        font: 600 12px/1.55 Arial, "Noto Sans Hebrew", sans-serif;
        text-align: center;
      }
      [data-efn-ownership] strong { color: #fff; font-size: 13px; }
      [data-efn-ownership] span { color: #aebbd0; }
      [data-efn-ownership] a { color: #ffd978; text-underline-offset: 3px; }
      [data-efn-ownership] a:focus-visible { outline: 3px solid #ffd978; outline-offset: 3px; }
    `;
    document.head.appendChild(style);

    const notice = document.createElement("section");
    notice.dataset.efnOwnership = "true";
    notice.dataset.analyticsIgnore = "true";
    notice.setAttribute("role", "contentinfo");
    notice.setAttribute("aria-label", "בעלות וזכויות יוצרים");

    const title = document.createElement("strong");
    title.dir = "rtl";
    title.textContent = `© 2026 ${owner} · כל הזכויות שמורות`;

    const scope = document.createElement("span");
    scope.dir = "rtl";
    scope.textContent = "המותג English for Noar, העיצוב, הקוד והתכנים המקוריים מוגנים. זכויות בתכני צד שלישי נשמרות לבעליהן.";

    const link = document.createElement("a");
    link.href = copyrightUrl;
    link.textContent = "הצהרת הזכויות המלאה";

    notice.append(title, scope, link);
    document.body.appendChild(notice);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render, { once: true });
  } else {
    render();
  }
})();
