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
  // Vercel Web Analytics (anonymous visit statistics; enable it in the Vercel project's Analytics tab).
  // Until it is enabled the address returns the site's HTML, so load the script only when it is real JS.
  window.addEventListener('load', () => {
    fetch('/_vercel/insights/script.js', { method: 'HEAD' })
      .then((r) => {
        if (!r.ok || !/javascript/i.test(r.headers.get('content-type') || '')) return;
        const s = document.createElement('script');
        s.defer = true;
        s.src = '/_vercel/insights/script.js';
        document.head.appendChild(s);
      })
      .catch(() => undefined);
  });
}
