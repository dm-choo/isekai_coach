import * as Phaser from 'phaser';
import type { PresentationPort } from '../bridge/PresentationPort';
import { BattleScene } from '../scenes/BattleScene';

export function createPhaserGame(
  parent: HTMLElement,
  onReady: (presentation: PresentationPort) => void,
  onUnitSelected?: (unitId: string) => void,
): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 1_280,
    height: 720,
    backgroundColor: '#071009',
    transparent: false,
    antialias: true,
    loader: {
      imageLoadType: 'HTMLImageElement',
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [new BattleScene(onReady, onUnitSelected)],
  });
}
