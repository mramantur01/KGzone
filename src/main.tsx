import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {startTranslator} from './i18n/domTranslator';
import './index.css';

startTranslator();
createRoot(document.getElementById('root')!).render(<App />);
