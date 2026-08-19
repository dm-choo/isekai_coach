import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

const SliceApp = lazy(async () => {
  if (import.meta.env.VITE_SLICE === '1') {
    const module = await import('./app/App');
    return { default: module.App };
  }
  if (import.meta.env.VITE_SLICE === 'submission') {
    const module = await import('./app/SubmissionApp');
    return { default: module.SubmissionApp };
  }
  const module = await import('./app/Slice2App');
  return { default: module.Slice2App };
});

createRoot(root).render(
  <StrictMode>
    <Suspense fallback={<main className="boot-loading" aria-label="게임 불러오는 중"><i /><span>경계를 불러오는 중</span></main>}>
      <SliceApp />
    </Suspense>
  </StrictMode>,
);
