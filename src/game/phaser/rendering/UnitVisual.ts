import * as Phaser from 'phaser';
import type {
  CharacterVisualConfig,
  UnitAnimationState,
} from '../../assets/AssetManifest';
import type { Direction } from '../../combat';

export interface UnitVisualAdapter {
  readonly objects: readonly Phaser.GameObjects.GameObject[];
  setState(state: UnitAnimationState): void;
  setFacing(direction: Direction): void;
  destroy(): void;
}

export function createUnitVisual(
  scene: Phaser.Scene,
  visual: CharacterVisualConfig,
): UnitVisualAdapter {
  return scene.textures.exists(visual.spriteKey)
    ? new SpriteUnitVisual(scene, visual)
    : new PlaceholderUnitVisual(scene, visual);
}

class SpriteUnitVisual implements UnitVisualAdapter {
  public readonly objects: readonly Phaser.GameObjects.GameObject[];
  private readonly sprite: Phaser.GameObjects.Sprite;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly visual: CharacterVisualConfig,
  ) {
    this.sprite = scene.add.sprite(0, -3, visual.spriteKey);
    if (visual.displaySize) {
      this.sprite.setDisplaySize(visual.displaySize.width, visual.displaySize.height);
    }
    this.objects = [this.sprite];
  }

  public setState(state: UnitAnimationState): void {
    const definition = this.visual.animations[state];
    if (this.scene.anims.exists(definition.key)) this.sprite.play(definition.key, true);
  }

  public setFacing(direction: Direction): void {
    if (direction === 'LEFT') this.sprite.setFlipX(true);
    else if (direction === 'RIGHT') this.sprite.setFlipX(false);
  }

  public destroy(): void {
    this.sprite.destroy();
  }
}

class PlaceholderUnitVisual implements UnitVisualAdapter {
  public readonly objects: readonly Phaser.GameObjects.GameObject[];
  private readonly body: Phaser.GameObjects.Rectangle;
  private readonly accent: Phaser.GameObjects.Triangle;
  private readonly stateLabel: Phaser.GameObjects.Text;

  public constructor(
    scene: Phaser.Scene,
    private readonly visual: CharacterVisualConfig,
  ) {
    this.body = scene.add.rectangle(0, -2, 40, 54, visual.palette.body, 1);
    this.body.setStrokeStyle(3, visual.palette.accent, 0.9);
    this.accent = scene.add.triangle(0, 0, 0, 0, 14, 6, 0, 12, visual.palette.accent, 1);
    this.stateLabel = scene.add
      .text(0, 5, 'IDLE', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '9px',
        color: '#0a1420',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.objects = [this.body, this.accent, this.stateLabel];
  }

  public setState(state: UnitAnimationState): void {
    this.stateLabel.setText(state.toUpperCase());
    const style: Partial<Record<UnitAnimationState, number>> = {
      defend: 0x8fd7ff,
      hit: 0xffffff,
      knockback: 0xffc05c,
      death: 0x4f5966,
      attack: this.visual.palette.accent,
    };
    this.body.setFillStyle(style[state] ?? this.visual.palette.body);
  }

  public setFacing(direction: Direction): void {
    const facingVisuals: Record<Direction, { x: number; y: number; angle: number }> = {
      RIGHT: { x: 28, y: -4, angle: 0 },
      LEFT: { x: -28, y: -4, angle: 180 },
      UP: { x: 0, y: -34, angle: -90 },
      DOWN: { x: 0, y: 30, angle: 90 },
    };
    const facing = facingVisuals[direction];
    this.accent.setPosition(facing.x, facing.y).setAngle(facing.angle);
  }

  public destroy(): void {
    for (const object of this.objects) object.destroy();
  }
}
