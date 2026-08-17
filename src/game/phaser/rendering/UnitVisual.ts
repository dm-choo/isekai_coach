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
  private readonly baseScaleX: number;
  private readonly baseScaleY: number;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly visual: CharacterVisualConfig,
  ) {
    const anchor = visual.footAnchor ?? { x: 0.5, y: 1 };
    this.sprite = scene.add.sprite(0, 0, visual.spriteKey).setOrigin(anchor.x, anchor.y);
    if (visual.displaySize) {
      this.sprite.setDisplaySize(visual.displaySize.width, visual.displaySize.height);
    }
    this.baseScaleX = this.sprite.scaleX;
    this.baseScaleY = this.sprite.scaleY;
    this.objects = [this.sprite];
  }

  public setState(state: UnitAnimationState): void {
    const definition = this.visual.animations[state];
    if (this.scene.anims.exists(definition.key)) this.sprite.play(definition.key, true);
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setAlpha(1).setAngle(0).setScale(this.baseScaleX, this.baseScaleY).setPosition(0, 0);
    switch (state) {
      case 'idle':
        this.scene.tweens.add({
          targets: this.sprite,
          y: -3,
          duration: this.visual.silhouette === 'GUARDIAN' ? 1_500 : 1_050,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
        break;
      case 'move':
        this.scene.tweens.add({ targets: this.sprite, angle: 2, duration: 110, yoyo: true, repeat: 1 });
        break;
      case 'attack':
        this.scene.tweens.add({
          targets: this.sprite,
          angle: -4,
          scaleX: this.baseScaleX * 1.05,
          scaleY: this.baseScaleY * 0.97,
          duration: 130,
          yoyo: true,
        });
        break;
      case 'hit':
        this.scene.tweens.add({ targets: this.sprite, x: -7, duration: 55, yoyo: true, repeat: 2 });
        break;
      case 'knockback':
        this.scene.tweens.add({ targets: this.sprite, angle: -8, duration: 140, yoyo: true });
        break;
      case 'death':
        this.scene.tweens.add({ targets: this.sprite, angle: -12, alpha: 0.28, y: 10, duration: 420 });
        break;
      case 'defend':
        this.scene.tweens.add({
          targets: this.sprite,
          scaleX: this.baseScaleX * 0.96,
          scaleY: this.baseScaleY * 1.04,
          duration: 120,
          yoyo: true,
        });
        break;
    }
  }

  public setFacing(direction: Direction): void {
    if (direction === 'LEFT' || direction === 'RIGHT') {
      this.sprite.setFlipX(direction !== (this.visual.nativeFacing ?? 'RIGHT'));
    }
  }

  public destroy(): void {
    this.sprite.destroy();
  }
}

class PlaceholderUnitVisual implements UnitVisualAdapter {
  public readonly objects: readonly Phaser.GameObjects.GameObject[];
  private readonly cloak: Phaser.GameObjects.Triangle;
  private readonly body: Phaser.GameObjects.Rectangle;
  private readonly head: Phaser.GameObjects.Ellipse;
  private readonly weapon: Phaser.GameObjects.Rectangle;
  private readonly accent: Phaser.GameObjects.Triangle;
  private readonly sigil: Phaser.GameObjects.Arc;

  public constructor(
    scene: Phaser.Scene,
    private readonly visual: CharacterVisualConfig,
  ) {
    const silhouette = visual.silhouette ?? 'GENERIC';
    const bodyWidth = silhouette === 'RAIDER' ? 44 : silhouette === 'LANCER' ? 34 : 39;
    this.cloak = scene.add.triangle(
      0,
      9,
      -24,
      29,
      24,
      29,
      0,
      -22,
      visual.palette.shadow,
      0.96,
    );
    this.body = scene.add.rectangle(0, 0, bodyWidth, 46, visual.palette.body, 1);
    this.body.setStrokeStyle(silhouette === 'ADMINISTRATOR' ? 2 : 3, visual.palette.accent, 0.9);
    this.head = scene.add.ellipse(
      silhouette === 'RAIDER' ? 3 : 0,
      -30,
      silhouette === 'RAIDER' ? 26 : 22,
      25,
      silhouette === 'RAIDER' ? visual.palette.body : 0xd5c9bd,
      1,
    );
    this.head.setStrokeStyle(2, visual.palette.accent, 0.85);
    const weaponLength = silhouette === 'LANCER' ? 78 : silhouette === 'RAIDER' ? 54 : 38;
    this.weapon = scene.add.rectangle(
      silhouette === 'LANCER' ? 25 : 21,
      silhouette === 'LANCER' ? -2 : 3,
      weaponLength,
      silhouette === 'RAIDER' ? 8 : 4,
      visual.palette.accent,
      0.96,
    );
    this.weapon.setOrigin(0.12, 0.5).setAngle(silhouette === 'LANCER' ? -8 : 18);
    this.accent = scene.add.triangle(0, 0, 0, 0, 14, 6, 0, 12, visual.palette.accent, 1);
    this.sigil = scene.add.circle(0, 0, silhouette === 'ADMINISTRATOR' ? 16 : 6, visual.palette.accent, silhouette === 'ADMINISTRATOR' ? 0.08 : 0);
    this.sigil.setStrokeStyle(1, visual.palette.accent, silhouette === 'ADMINISTRATOR' ? 0.8 : 0);
    this.objects = [this.cloak, this.sigil, this.body, this.head, this.weapon, this.accent];
  }

  public setState(state: UnitAnimationState): void {
    const style: Partial<Record<UnitAnimationState, number>> = {
      defend: 0x8fd7ff,
      hit: 0xffffff,
      knockback: 0xffc05c,
      death: 0x4f5966,
      attack: this.visual.palette.accent,
    };
    this.body.setFillStyle(style[state] ?? this.visual.palette.body);
    this.body.setScale(state === 'defend' ? 1.12 : 1, state === 'hit' ? 0.92 : 1);
    this.cloak.setAlpha(state === 'death' ? 0.18 : 0.96);
    this.head.setAlpha(state === 'death' ? 0.24 : 1);
    this.weapon
      .setAlpha(state === 'death' ? 0.15 : 0.96)
      .setAngle(state === 'attack' ? -34 : state === 'defend' ? 72 : this.visual.silhouette === 'LANCER' ? -8 : 18);
    this.sigil.setScale(state === 'attack' ? 1.45 : state === 'defend' ? 1.2 : 1);
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
    const horizontal = direction === 'LEFT' ? -1 : 1;
    if (direction === 'LEFT' || direction === 'RIGHT') {
      this.weapon.setScale(horizontal, 1);
      this.weapon.setX(21 * horizontal);
    }
  }

  public destroy(): void {
    for (const object of this.objects) object.destroy();
  }
}
