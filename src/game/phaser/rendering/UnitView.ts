import * as Phaser from 'phaser';
import { getCharacterVisual, type UnitAnimationState } from '../../assets/AssetManifest';
import type { Direction } from '../../combat';
import type { LogicalPosition } from './GridProjector';
import { createUnitVisual, type UnitVisualAdapter } from './UnitVisual';

export interface RenderableUnit {
  readonly id: string;
  readonly faction: 'STUDENT' | 'ENEMY';
  readonly position: LogicalPosition;
  readonly facing: Direction;
  readonly hp: number;
  readonly maxHp: number;
  readonly ap: number;
  readonly maxAp: number;
  readonly visualKey?: string;
}

export class UnitView {
  public readonly container: Phaser.GameObjects.Container;
  private readonly unitVisual: UnitVisualAdapter;
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
    this.unitVisual = createUnitVisual(scene, this.visual);
    this.nameLabel = scene.add
      .text(0, -46, this.visual.displayName, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#ecf4ff',
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
      ...this.unitVisual.objects,
      this.nameLabel,
      this.hpBackground,
      this.hpFill,
      this.apLabel,
    ]);
    this.update(unit);
    this.setAnimationState('idle');
  }

  public update(unit: RenderableUnit): void {
    this.setHp(unit.hp, unit.maxHp);
    this.setAp(unit.ap, unit.maxAp, unit.faction === 'STUDENT');

    this.unitVisual.setFacing(unit.facing);
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
    this.unitVisual.setState(state);
  }

  public returnToIdle(): void {
    if (this.currentState !== 'death') {
      this.setAnimationState('idle');
    }
  }

  public setWorldPosition(world: Readonly<{ x: number; y: number }>, row?: number): void {
    this.container.setPosition(world.x, world.y);
    if (row !== undefined) this.setGridDepth(row);
  }

  public setGridDepth(row: number): void {
    this.container.setDepth(20 + row);
  }

  public destroy(): void {
    this.unitVisual.destroy();
    this.container.destroy(true);
  }
}
