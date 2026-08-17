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
    this.container.setDepth(30 + unit.position.y * 10);

    const guardian = this.visual.silhouette === 'GUARDIAN';
    const visualHeight = this.visual.displaySize?.height ?? 96;
    const barWidth = guardian ? 112 : 68;
    const labelY = -visualHeight + 12;
    const shadow = scene.add.ellipse(0, 27, guardian ? 142 : 82, guardian ? 27 : 19, 0x050704, 0.58);
    this.unitVisual = createUnitVisual(scene, this.visual);
    this.nameLabel = scene.add
      .text(0, labelY, this.visual.displayName, {
        fontFamily: '"Pretendard Variable", system-ui, sans-serif',
        fontSize: guardian ? '16px' : '13px',
        color: guardian ? '#ffe2bd' : '#f5f0dc',
        fontStyle: 'bold',
        stroke: '#07100b',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.hpBackground = scene.add.rectangle(0, labelY + 22, barWidth + 4, 9, 0x120d09, 0.92);
    this.hpFill = scene.add.rectangle(-barWidth / 2, labelY + 22, barWidth, 5, guardian ? 0xdf6b37 : 0x70c88b, 1).setOrigin(0, 0.5);
    this.apLabel = scene.add
      .text(0, 38, '', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '12px',
        color: '#e9c96f',
        stroke: '#0b0c08',
        strokeThickness: 3,
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
    const barWidth = this.visual.silhouette === 'GUARDIAN' ? 112 : 68;
    this.hpFill.displayWidth = barWidth * hpRatio;
    this.hpFill.setFillStyle(hpRatio <= 0.35 ? 0xe14f3f : this.visual.silhouette === 'GUARDIAN' ? 0xdf6b37 : 0x70c88b);
  }

  public setAp(ap: number, maxAp: number, visible = true): void {
    this.apLabel.setText(visible && maxAp > 0 ? `${'◆'.repeat(ap)}${'◇'.repeat(Math.max(0, maxAp - ap))}` : '');
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
    this.container.setDepth(30 + row * 10);
  }

  public destroy(): void {
    this.unitVisual.destroy();
    this.container.destroy(true);
  }
}
