import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {startTranslator} from './i18n/domTranslator';
import './index.css';

startTranslator();
createRoot(document.getElementById('root')!).render(<App />);

if (import.meta.env.PROD && !/^(localhost|127.0.0.1)$/.test(location.hostname)) {
  // Installable app + offline copy
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
  }
  // Vercel Web Analytics (anonymous visit statistics; enable it in the Vercel project's Analytics tab)
  const s = document.createElement('script');
  s.defer = true;
  s.src = '/_vercel/insights/script.js';
  document.head.appendChild(s);
}
