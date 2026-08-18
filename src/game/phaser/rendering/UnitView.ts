import * as Phaser from 'phaser';
import {
  getCharacterVisual,
  INTENT_ICON_TEXTURES,
  type UnitAnimationState,
} from '../../assets/AssetManifest';
import type { Direction } from '../../combat';
import type { IntentIconKind } from '../bridge/PresentationPort';
import type { LogicalPosition } from './GridProjector';
import { createUnitVisual, type UnitVisualAdapter } from './UnitVisual';

const INTENT_OWNER_COLORS = [0xff725e, 0xffc857, 0xc58cff, 0x67d7ef] as const;

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

export interface RenderableIntentStep {
  readonly id: string;
  readonly label: string;
  readonly glyph: string;
  readonly icon: IntentIconKind;
  readonly description: string;
  readonly damage?: number;
}

export class UnitView {
  public readonly container: Phaser.GameObjects.Container;
  private readonly unitVisual: UnitVisualAdapter;
  private readonly nameLabel: Phaser.GameObjects.Text;
  private readonly hpBackground: Phaser.GameObjects.Rectangle;
  private readonly hpLagFill: Phaser.GameObjects.Rectangle;
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private readonly hpTicks: Phaser.GameObjects.Container;
  private readonly apLabel: Phaser.GameObjects.Text;
  private readonly intentContainer: Phaser.GameObjects.Container;
  private readonly selectionRing: Phaser.GameObjects.Ellipse;
  private readonly visual;
  private readonly faction: RenderableUnit['faction'];
  private maxHp = 1;
  private currentHp = -1;
  private currentState: UnitAnimationState | null = null;

  public constructor(
    private readonly scene: Phaser.Scene,
    unit: RenderableUnit,
    world: Readonly<{ x: number; y: number }>,
    onSelected?: (unitId: string) => void,
  ) {
    this.visual = getCharacterVisual(unit.visualKey, unit.faction);
    this.faction = unit.faction;
    this.container = scene.add.container(world.x, world.y);
    this.container.setDepth(30 + unit.position.y * 10);

    const guardian = this.visual.silhouette === 'GUARDIAN';
    const visualHeight = this.visual.displaySize?.height ?? 96;
    const barWidth = guardian ? 112 : 68;
    const footAnchorY = this.visual.footAnchor?.y ?? 1;
    const visualTopY = -visualHeight * footAnchorY;
    const hpY = visualTopY - 10;
    const labelY = hpY - 16;
    const shadow = scene.add.ellipse(0, 3, guardian ? 126 : 68, guardian ? 24 : 16, 0x050704, 0.62);
    this.selectionRing = scene.add.ellipse(0, 2, 88, 26, 0xffc66d, 0.05)
      .setStrokeStyle(4, 0xffd67f, 0.96)
      .setVisible(false);
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
      .setOrigin(0.5)
      .setVisible(false);
    this.hpBackground = scene.add.rectangle(0, hpY, barWidth + 4, 9, 0x120d09, 0.92);
    this.hpLagFill = scene.add.rectangle(-barWidth / 2, hpY, barWidth, 5, 0xf0d384, 0.82).setOrigin(0, 0.5);
    this.hpFill = scene.add.rectangle(-barWidth / 2, hpY, barWidth, 5, this.hpColor(1), 1).setOrigin(0, 0.5);
    this.hpTicks = scene.add.container(0, hpY);
    this.apLabel = scene.add
      .text(0, 38, '', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '12px',
        color: '#e9c96f',
        stroke: '#0b0c08',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0);
    this.intentContainer = scene.add.container(0, labelY - 35);

    this.container.add([
      shadow,
      this.selectionRing,
      ...this.unitVisual.objects,
      this.nameLabel,
      this.hpBackground,
      this.hpLagFill,
      this.hpFill,
      this.hpTicks,
      this.apLabel,
      this.intentContainer,
    ]);
    if (onSelected && unit.faction === 'ENEMY') {
      const hitWidth = Math.max(78, (this.visual.displaySize?.width ?? 90) * 0.72);
      const hitHeight = this.visual.displaySize?.height ?? 110;
      const hitZone = scene.add.rectangle(0, -hitHeight / 2, hitWidth, hitHeight, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          // Phaser may receive a window-level pointer while an HTML HUD control
          // overlays the canvas. Only world clicks that originated on this
          // game's canvas are allowed to change the selected combat target.
          if (!(pointer.event?.target instanceof HTMLCanvasElement)) return;
          onSelected(unit.id);
        });
      this.container.add(hitZone);
      this.container.bringToTop(hitZone);
    }
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
    const previousHp = this.currentHp;
    this.maxHp = maxHp;
    this.currentHp = hp;
    const hpRatio = Math.max(0, Math.min(1, hp / Math.max(maxHp, 1)));
    const barWidth = this.visual.silhouette === 'GUARDIAN' ? 112 : 68;
    this.hpFill.displayWidth = barWidth * hpRatio;
    this.hpFill.setFillStyle(this.hpColor(hpRatio));
    this.scene.tweens.killTweensOf(this.hpLagFill);
    if (previousHp < 0 || hp >= previousHp) {
      this.hpLagFill.displayWidth = barWidth * hpRatio;
    } else {
      this.scene.tweens.add({
        targets: this.hpLagFill,
        displayWidth: barWidth * hpRatio,
        delay: 180,
        duration: 360,
        ease: 'Cubic.Out',
      });
    }
    this.drawHpTicks(barWidth, maxHp);
  }

  public setSelected(selected: boolean): void {
    this.selectionRing.setVisible(selected);
  }

  public setFacing(direction: Direction): void {
    this.unitVisual.setFacing(direction);
  }

  public setAp(ap: number, maxAp: number, visible = true): void {
    this.apLabel.setText(visible && maxAp > 0 ? `${'◆'.repeat(ap)}${'◇'.repeat(Math.max(0, maxAp - ap))}` : '');
  }

  public setAnimationState(state: UnitAnimationState): void {
    if (this.currentState === state) return;
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

  public setIntentPreview(steps: readonly RenderableIntentStep[]): void {
    this.intentContainer.removeAll(true);
    this.intentContainer.setVisible(steps.length > 0);
    const width = 42;
    const gap = 7;
    const total = steps.length * width + Math.max(0, steps.length - 1) * gap;
    const ownerMarker = steps[0]?.label.match(/^([A-Z]) ·/)?.[1];
    const ownerIndex = ownerMarker ? ownerMarker.charCodeAt(0) - 65 : -1;
    const ownerColor = INTENT_OWNER_COLORS[ownerIndex % INTENT_OWNER_COLORS.length] ?? 0xe8664d;
    if (ownerMarker) {
      const badgeX = -total / 2 - 15;
      const badge = this.scene.add.circle(badgeX, 0, 11, ownerColor, 1)
        .setStrokeStyle(2, 0x120b08, 0.95);
      const badgeText = this.scene.add.text(badgeX, 0, ownerMarker, {
        fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: '#160a07', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.intentContainer.add([badge, badgeText]);
    }
    steps.forEach((step, index) => {
      const x = -total / 2 + width / 2 + index * (width + gap);
      const background = this.scene.add.rectangle(x, 0, width, 36, 0x11130d, 0.94)
        .setStrokeStyle(2, this.faction === 'ENEMY' ? ownerColor : 0x65d7e4, 0.95)
        .setInteractive({ useHandCursor: true });
      const textureKey = INTENT_ICON_TEXTURES[step.icon].textureKey;
      const icon = this.scene.textures.exists(textureKey)
        ? this.scene.add.image(x, -1, textureKey).setDisplaySize(27, 27)
        : this.scene.add.text(x, -2, step.glyph, {
            fontFamily: 'Georgia, serif', fontSize: '21px', color: '#fff0bd', fontStyle: 'bold',
          }).setOrigin(0.5);
      const tooltip = this.scene.add.text(0, 49, `${step.label}\n${step.description}`, {
        fontFamily: '"Pretendard Variable", system-ui, sans-serif',
        fontSize: '12px',
        color: '#f8edda',
        backgroundColor: '#090c09f2',
        stroke: '#090c09',
        strokeThickness: 1,
        wordWrap: { width: 250 },
      }).setPadding(11, 8).setOrigin(0.5, 0).setDepth(180).setVisible(false);
      background.on('pointerover', () => tooltip.setVisible(true));
      background.on('pointerout', () => tooltip.setVisible(false));
      this.intentContainer.add([background, icon, tooltip]);
      if (step.damage !== undefined) {
        const damage = this.scene.add.text(x + 17, 13, String(step.damage), {
          fontFamily: 'ui-monospace, monospace',
          fontSize: '11px',
          color: '#fff5dd',
          fontStyle: 'bold',
          backgroundColor: '#a83f2ddd',
        }).setPadding(3, 1).setOrigin(0.5);
        this.intentContainer.add(damage);
      }
      if (index < steps.length - 1) {
        const arrow = this.scene.add.text(x + width / 2 + gap / 2, 0, '›', {
          fontFamily: 'Georgia, serif', fontSize: '19px', color: '#b9aa80',
        }).setOrigin(0.5);
        this.intentContainer.add(arrow);
      }
    });
  }

  public destroy(): void {
    this.unitVisual.destroy();
    this.container.destroy(true);
  }

  private hpColor(hpRatio: number): number {
    if (hpRatio <= 0.35) return 0xe24c42;
    return this.faction === 'ENEMY' ? 0xc64a37 : 0x59b979;
  }

  private drawHpTicks(barWidth: number, maxHp: number): void {
    this.hpTicks.removeAll(true);
    const segments = Math.max(1, Math.min(maxHp, 10));
    for (let index = 1; index < segments; index += 1) {
      const x = -barWidth / 2 + (barWidth * index) / segments;
      this.hpTicks.add(this.scene.add.rectangle(x, 0, 1, 7, 0x090a08, 0.86));
    }
  }
}
