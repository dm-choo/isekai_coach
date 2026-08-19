import { useEffect, useRef } from 'react';
import { createPhaserGame } from '../game/phaser/config/createGame';
import type { PresentationPort } from '../game/phaser/bridge/PresentationPort';
import type { BattleVisualTheme } from '../game/assets/AssetManifest';

interface PresentationController {
  attachPresentation(presentation: PresentationPort): () => void;
  selectTarget(unitId: string): void;
}

export function PhaserCanvas({ controller, visualTheme = 'SLICE', onReady }: {
  readonly controller: PresentationController;
  readonly visualTheme?: BattleVisualTheme;
  readonly onReady?: () => void;
}) {
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
        onReady?.();
      }, controller.selectTarget, visualTheme);
    });

    return () => {
      disposed = true;
      detach?.();
      game?.destroy(true);
    };
  }, [controller, onReady, visualTheme]);

  return <div className="phaser-host" ref={hostRef} aria-label="Phaser combat presentation" />;
}
