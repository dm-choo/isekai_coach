/// <reference types="vite/client" />

interface Window {
  __ISEKAI_COACH_SUBMISSION__?: unknown;
}

interface Window {
  __ISEKAI_COACH_COMBAT__?: {
    readonly snapshot: import('./game/slice').SliceSnapshot;
  };
  __ISEKAI_COACH_SLICE2__?: {
    readonly snapshot: import('./game/slice2').Slice2RunSnapshot;
  };
}
