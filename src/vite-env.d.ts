/// <reference types="vite/client" />

interface Window {
  __ISEKAI_COACH_COMBAT__?: {
    readonly snapshot: import('./game/slice').SliceSnapshot;
  };
}
