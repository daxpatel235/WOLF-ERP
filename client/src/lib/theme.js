// Theme constants shared by the server layout and the client toggle.
// Deliberately NOT a "use client" module: app/layout.jsx is a server component
// and needs the literal script string, not a client-module reference.

export const THEME_STORAGE_KEY = "wolf_theme";

// Inlined into <head> so the `dark` class is set before first paint. Without
// it the page flashes the light palette before React hydrates.
export const themeScript = `
(function(){try{
  var t = localStorage.getItem('${THEME_STORAGE_KEY}');
  if(!t){ t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  document.documentElement.classList.toggle('dark', t === 'dark');
}catch(e){}})();
`;
