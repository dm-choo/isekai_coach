import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { Slice2App } from './app/Slice2App';
import { SubmissionApp } from './app/SubmissionApp';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

const SliceApp = import.meta.env.VITE_SLICE === '1'
  ? App
  : import.meta.env.VITE_SLICE === 'submission'
    ? SubmissionApp
    : Slice2App;

createRoot(root).render(
  <StrictMode>
    <SliceApp />
  </StrictMode>,
);
