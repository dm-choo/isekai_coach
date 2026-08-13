import * as Phaser from 'phaser';
import { getCharacterVisual, type UnitAnimationState } from '../../assets/AssetManifest';
import type { LogicalPosition } from './GridProjector';

export interface RenderableUnit {
  readonly id: string;
  readonly faction: 'STUDENT' | 'ENEMY';
  readonly position: LogicalPosition;
  readonly facing: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly ap: number;
  readonly maxAp: number;
  readonly visualKey?: string;
}

export class UnitView {
  public readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Rectangle;
  private readonly accent: Phaser.GameObjects.Triangle;
  private readonly stateLabel: Phaser.GameObjects.Text;
  private readonly nameLabel: Phaser.GameObjects.Text;
  private readonly hpBackground: Phaser.GameObjects.Rectangle;
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private readonly apLabel: Phaser.GameObjects.Text;
  private readonly visual;
  private maxHp = 1;
  private currentState: UnitAnimationState = 'idle';

  public constructor(
    private readonly scene: Phaser.Scene,
    unit: RenderableUnit,
    world: Readonly<{ x: number; y: number }>,
  ) {
    this.visual = getCharacterVisual(unit.visualKey, unit.faction);
    this.container = scene.add.container(world.x, world.y);
    this.container.setDepth(20 + unit.position.y);

    const shadow = scene.add.ellipse(0, 25, 46, 13, this.visual.palette.shadow, 0.5);
    this.body = scene.add.rectangle(0, -2, 40, 54, this.visual.palette.body, 1);
    this.body.setStrokeStyle(3, this.visual.palette.accent, 0.9);
    this.accent = scene.add.triangle(0, 0, 0, 0, 14, 6, 0, 12, this.visual.palette.accent, 1);
    this.nameLabel = scene.add
      .text(0, -46, this.visual.displayName, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#ecf4ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.stateLabel = scene.add
      .text(0, 5, 'IDLE', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '9px',
        color: '#0a1420',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.hpBackground = scene.add.rectangle(0, 35, 48, 6, 0x17202b, 1);
    this.hpFill = scene.add.rectangle(-24, 35, 48, 6, 0x63df8b, 1).setOrigin(0, 0.5);
    this.apLabel = scene.add
      .text(0, 44, '', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '10px',
        color: '#7ed8ff',
      })
      .setOrigin(0.5, 0);

    this.container.add([
      shadow,
      this.body,
      this.accent,
      this.nameLabel,
      this.stateLabel,
      this.hpBackground,
      this.hpFill,
      this.apLabel,
    ]);
    this.update(unit);
  }

  public update(unit: RenderableUnit): void {
    this.setHp(unit.hp, unit.maxHp);
    this.setAp(unit.ap, unit.maxAp, unit.faction === 'STUDENT');

    const facingVisuals: Record<string, { x: number; y: number; angle: number }> = {
      RIGHT: { x: 28, y: -4, angle: 0 },
      LEFT: { x: -28, y: -4, angle: 180 },
      UP: { x: 0, y: -34, angle: -90 },
      DOWN: { x: 0, y: 30, angle: 90 },
    };
    const facing = facingVisuals[unit.facing] ?? facingVisuals.RIGHT;
    this.accent.setPosition(facing.x, facing.y).setAngle(facing.angle);
    this.container.setAlpha(unit.hp > 0 ? 1 : 0.4);
  }

  public setHp(hp: number, maxHp = this.maxHp): void {
    this.maxHp = maxHp;
    const hpRatio = Math.max(0, Math.min(1, hp / Math.max(maxHp, 1)));
    this.hpFill.displayWidth = 48 * hpRatio;
    this.hpFill.setFillStyle(hpRatio <= 0.4 ? 0xff786b : 0x63df8b);
  }

  public setAp(ap: number, maxAp: number, visible = true): void {
    this.apLabel.setText(visible ? `AP ${ap}/${maxAp}` : '');
  }

  public setAnimationState(state: UnitAnimationState): void {
    this.currentState = state;
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

  public returnToIdle(): void {
    if (this.currentState !== 'death') {
      this.setAnimationState('idle');
    }
  }

  public setWorldPosition(world: Readonly<{ x: number; y: number }>): void {
    this.container.setPosition(world.x, world.y);
  }

  public destroy(): void {
    this.container.destroy(true);
  }
}
