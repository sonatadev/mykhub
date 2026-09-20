import React from 'react';
import ReactDOM from 'react-dom/client';
import PublicPage from './pages/public/PublicPage';
import { applyUserTheme } from './lib/theme';
import './index.css';

applyUserTheme(undefined);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PublicPage />
  </React.StrictMode>
);
