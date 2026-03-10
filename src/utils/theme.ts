export function setupTheme() {
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    const fresh = btn.cloneNode(true) as HTMLElement;
    btn.parentNode?.replaceChild(fresh, btn);
    fresh.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('mr-theme', isDark ? 'dark' : 'light');
    });
  });
}
