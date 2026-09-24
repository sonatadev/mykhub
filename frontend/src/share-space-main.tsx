import React from 'react';
import ReactDOM from 'react-dom/client';
import PublicSpace from './pages/public/PublicSpace';
import { applyUserTheme } from './lib/theme';
import 'katex/dist/katex.min.css';
import './index.css';

applyUserTheme(undefined);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PublicSpace />
  </React.StrictMode>
);
