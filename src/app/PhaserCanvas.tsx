import { useEffect, useRef } from 'react';
import { createPhaserGame } from '../game/phaser/config/createGame';
import type { SandboxController } from '../game/phaser/bridge/SandboxController';

export function PhaserCanvas({ controller }: { readonly controller: SandboxController }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let detach: (() => void) | undefined;
    let disposed = false;
    const game = createPhaserGame(host, (presentation) => {
      if (disposed) {
        presentation.destroy();
        return;
      }
      detach = controller.attachPresentation(presentation);
    });

    return () => {
      disposed = true;
      detach?.();
      game.destroy(true);
    };
  }, [controller]);

  return <div className="phaser-host" ref={hostRef} aria-label="Phaser combat presentation" />;
}
