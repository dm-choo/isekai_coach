import { useEffect, useRef } from 'react';
import { createPhaserGame } from '../game/phaser/config/createGame';
import type { PresentationPort } from '../game/phaser/bridge/PresentationPort';

interface PresentationController {
  attachPresentation(presentation: PresentationPort): () => void;
}

export function PhaserCanvas({ controller }: { readonly controller: PresentationController }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let detach: (() => void) | undefined;
    let game: ReturnType<typeof createPhaserGame> | undefined;
    let disposed = false;
    void document.fonts.ready.then(() => {
      if (disposed) return;
      game = createPhaserGame(host, (presentation) => {
        if (disposed) {
          presentation.destroy();
          return;
        }
        detach = controller.attachPresentation(presentation);
      });
    });

    return () => {
      disposed = true;
      detach?.();
      game?.destroy(true);
    };
  }, [controller]);

  return <div className="phaser-host" ref={hostRef} aria-label="Phaser combat presentation" />;
}
