import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import '@fontsource/inter-tight/300.css';
import '@fontsource/inter-tight/400.css';
import '@fontsource/inter-tight/500.css';
import '@fontsource/inter-tight/600.css';
import '@fontsource/inter-tight/700.css';
import '@fontsource/inter-tight/800.css';
import '@fontsource/inter-tight/900.css';
import Root from './Root.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
