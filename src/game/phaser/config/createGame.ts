import * as Phaser from 'phaser';
import type { PresentationPort } from '../bridge/PresentationPort';
import { BattleScene } from '../scenes/BattleScene';

export function createPhaserGame(
  parent: HTMLElement,
  onReady: (presentation: PresentationPort) => void,
): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 1_000,
    height: 460,
    backgroundColor: '#09111c',
    transparent: false,
    antialias: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [new BattleScene(onReady)],
  });
}
