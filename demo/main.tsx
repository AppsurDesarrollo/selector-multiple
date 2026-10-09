import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Demo } from './demo';
import './estilos.css';

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
