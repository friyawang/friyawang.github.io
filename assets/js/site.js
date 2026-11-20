(() => {
  const root = document.documentElement;
  const themeButton = document.getElementById('theme-toggle');
  const languageButton = document.getElementById('language-toggle');
  const languageLabel = document.getElementById('language-label');
  const colorMeta = document.querySelector('meta[name="theme-color"]');
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const persist = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };

  function updateThemeButton() {
    const dark = root.dataset.theme === 'dark';
    const label = root.dataset.lang === 'zh'
      ? (dark ? '切换到日间模式' : '切换到夜间模式')
      : (dark ? 'Switch to light mode' : 'Switch to dark mode');
    themeButton.setAttribute('aria-label', label);
    themeButton.setAttribute('title', label);
  }
  function applyTheme(preference) {
    root.dataset.themePreference = preference;
    root.dataset.theme = preference === 'system' ? (systemTheme.matches ? 'dark' : 'light') : preference;
    colorMeta.content = root.dataset.theme === 'dark' ? '#111317' : '#ffffff';
    updateThemeButton();
  }
  function applyLanguage(lang) {
    root.dataset.lang = lang;
    root.lang = lang === 'zh' ? 'zh-CN' : 'en';
    languageLabel.textContent = lang === 'zh' ? 'EN' : '中文';
    languageButton.setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : '切换到中文');
    updateThemeButton();
  }

  themeButton.addEventListener('click', () => {
    const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    persist('jw-theme', theme);
  });
  languageButton.addEventListener('click', () => {
    const lang = root.dataset.lang === 'en' ? 'zh' : 'en';
    applyLanguage(lang);
    persist('jw-language', lang);
  });
  const onSystemThemeChange = () => { if (root.dataset.themePreference === 'system') applyTheme('system'); };
  if (systemTheme.addEventListener) systemTheme.addEventListener('change', onSystemThemeChange);
  else if (systemTheme.addListener) systemTheme.addListener(onSystemThemeChange);
  applyTheme(root.dataset.themePreference || 'system');
  applyLanguage(root.dataset.lang || 'en');

  const newsToggle = document.getElementById('news-toggle');
  if (newsToggle) {
    const list = document.getElementById(newsToggle.getAttribute('aria-controls'));
    const limit = Number(newsToggle.dataset.limit) || 6;
    const items = Array.from(list.children);
    const setExpanded = (expanded) => {
      items.forEach((item, i) => item.classList.toggle('is-hidden', !expanded && i >= limit));
      newsToggle.setAttribute('aria-expanded', String(expanded));
    };
    if (items.length <= limit) newsToggle.hidden = true;
    newsToggle.addEventListener('click', () => setExpanded(newsToggle.getAttribute('aria-expanded') !== 'true'));
    setExpanded(false);
  }
})();
