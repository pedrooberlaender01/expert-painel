// Tema claro/escuro. Dark é o default (data-theme ausente = dark).
export type Theme = 'dark' | 'light';

const KEY = 'theme';

export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(t: Theme): void {
  const root = document.documentElement;
  if (t === 'light') root.setAttribute('data-theme', 'light');
  else root.removeAttribute('data-theme');
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'light' ? 'dark' : 'light';
  applyTheme(next);
  return next;
}

// Chamado no boot (main.tsx) antes do render pra evitar flash.
export function initTheme(): void {
  applyTheme(getTheme());
}
