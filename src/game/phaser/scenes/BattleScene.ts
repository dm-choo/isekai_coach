import * as Phaser from 'phaser';
import type { BattleState, CombatEvent } from '../../combat';
import { AnimationDirector } from '../animation/AnimationDirector';
import { preloadVisualAssets, registerVisualAnimations } from '../assets/VisualAssetLoader';
import type {
  BattlePredictionPresentation,
  PresentationPort,
} from '../bridge/PresentationPort';
import { BattleRenderer } from '../rendering/BattleRenderer';

export class BattleScene extends Phaser.Scene {
  private battleRenderer: BattleRenderer | null = null;
  private director: AnimationDirector | null = null;
  private port: PresentationPort | null = null;

  public constructor(
    private readonly onReady: (port: PresentationPort) => void,
    private readonly onUnitSelected?: (unitId: string) => void,
  ) {
    super({ key: 'BattleScene' });
  }

  public preload(): void {
    preloadVisualAssets(this);
  }

  public create(): void {
    registerVisualAnimations(this);
    this.battleRenderer = new BattleRenderer(this, this.onUnitSelected);
    this.director = new AnimationDirector(this.battleRenderer);
    this.port = new PhaserPresentationPort(this, this.director);
    this.onReady(this.port);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.release());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.release());
  }

  private release(): void {
    this.port?.destroy();
    this.port = null;
    this.director = null;
    this.battleRenderer = null;
  }
}

class PhaserPresentationPort implements PresentationPort {
  private destroyed = false;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly director: AnimationDirector,
  ) {}

  public reset(state: BattleState): void {
    if (this.destroyed) return;
    this.scene.tweens.killAll();
    this.scene.time.removeAllEvents();
    this.scene.tweens.resumeAll();
    this.scene.time.paused = false;
    this.director.reset(state);
  }

  public present(
    event: CombatEvent,
    _state: BattleState,
    durationScale: number,
    signal: AbortSignal,
  ): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    return this.director.present(event, durationScale, signal);
  }

  public settle(state: BattleState): void {
    if (!this.destroyed) this.director.settle(state);
  }

  public pause(): void {
    if (this.destroyed) return;
    this.scene.tweens.pauseAll();
    this.scene.time.paused = true;
  }

  public resume(): void {
    if (this.destroyed) return;
    this.scene.tweens.resumeAll();
    this.scene.time.paused = false;
  }

  public setSpeed(multiplier: number): void {
    if (this.destroyed) return;
    this.scene.tweens.timeScale = multiplier;
    this.scene.time.timeScale = multiplier;
  }

  public setPrediction(prediction: BattlePredictionPresentation | null): void {
    if (!this.destroyed) this.director.setPrediction(prediction);
  }

  public setSelection(unitId: string | null): void {
    if (!this.destroyed) this.director.setSelection(unitId);
  }

  public playSealUnlock(signal: AbortSignal): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    return this.director.playSealUnlock(signal);
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.tweens.killAll();
    this.scene.time.removeAllEvents();
  }
}
