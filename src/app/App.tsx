import { useState, useSyncExternalStore } from 'react';
import {
  SCENARIO_IDS,
  type CombatAction,
  type Direction,
  type GridPosition,
  type Unit,
} from '../game/combat';
import { SandboxController } from '../game/phaser/bridge/SandboxController';
import type { PlaybackSpeed } from '../game/phaser/bridge/types';
import { PhaserCanvas } from './PhaserCanvas';

const SCENARIO_LABELS: Record<string, string> = {
  'basic-1v1': 'Basic 1v1',
  'warrior-knockback': 'Warrior Knockback Test',
  'spearman-knockback': 'Spearman Knockback Test',
  'kill-cancels-intent': 'Kill Cancels Intent',
  'unblockable-attack': 'Unblockable Attack Test',
  'multi-enemy-1v2': 'Multi-enemy 1v2 Test',
};

export function App() {
  const [controller] = useState(() => new SandboxController());
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const [debugOpen, setDebugOpen] = useState(true);
  const student = snapshot.state.units.find((unit) => unit.faction === 'STUDENT');
  const enemies = snapshot.state.units.filter((unit) => unit.faction === 'ENEMY' && unit.hp > 0);
  const debugActionsBlocked =
    snapshot.status.queuedEventCount > 0 || snapshot.status.mode === 'COMPLETE';

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">DEV-ONLY / DETERMINISTIC COMBAT LAB</p>
          <h1>Isekai Coach</h1>
        </div>
        <div className={`runtime-pill runtime-pill--${snapshot.status.mode.toLowerCase()}`}>
          {snapshot.status.mode} · {String(snapshot.status.speed)}
        </div>
      </header>

      <section className="stage-card">
        <PhaserCanvas controller={controller} />
        <div className="telegraph-legend" aria-label="Telegraph legend">
          <span><i className="legend-swatch legend-swatch--normal" /> Normal</span>
          <span><i className="legend-swatch legend-swatch--unblockable" /> ⛨× Unblockable</span>
        </div>
      </section>

      <section className="control-deck" aria-label="Sandbox controls">
        <label className="scenario-select">
          <span>Scenario</span>
          <select
            value={snapshot.scenarioId}
            onChange={(event) => controller.reset(event.target.value)}
          >
            {Object.values(SCENARIO_IDS).map((id) => (
              <option key={id} value={id}>{SCENARIO_LABELS[id] ?? humanize(id)}</option>
            ))}
          </select>
        </label>

        <div className="button-row button-row--primary">
          <button type="button" onClick={() => controller.reset()}>Reset Battle</button>
          <button type="button" className="button-accent" onClick={controller.start}>Start</button>
          <button type="button" onClick={controller.pause}>Pause</button>
          <button type="button" onClick={controller.step}>Step event</button>
        </div>

        <div className="speed-controls" aria-label="Playback speed">
          {([1, 2, 4] as const).map((speed) => (
            <SpeedButton
              key={speed}
              speed={speed}
              active={snapshot.status.speed === speed}
              onClick={controller.setSpeed}
            />
          ))}
          <SpeedButton
            speed="INSTANT"
            active={snapshot.status.speed === 'INSTANT'}
            onClick={controller.setSpeed}
          />
        </div>
      </section>

      <section className="manual-panel" aria-label="Manual debug actions">
        <div>
          <p className="panel-kicker">PROVISIONAL DEBUG UTILITY</p>
          <h2>Manual action probe</h2>
          <p>
            Declares enemy intent first, then applies one domain action. This is not the Gambit UI.
            {debugActionsBlocked && ' Finish queued presentation events before the next action.'}
          </p>
        </div>
        <div className="button-row button-row--manual">
          <button type="button" disabled={!student || debugActionsBlocked} onClick={() => student && move(controller, student, 'UP')}>Move ↑</button>
          <button type="button" disabled={!student || debugActionsBlocked} onClick={() => student && move(controller, student, 'LEFT')}>Move ←</button>
          <button type="button" disabled={!student || debugActionsBlocked} onClick={() => student && move(controller, student, 'RIGHT')}>Move →</button>
          <button type="button" disabled={!student || debugActionsBlocked} onClick={() => student && move(controller, student, 'DOWN')}>Move ↓</button>
          <AbilityButton label="Defend" needle="defend" student={student} blocked={debugActionsBlocked} controller={controller} />
          <AbilityButton label="Thrust" needle="thrust" student={student} blocked={debugActionsBlocked} controller={controller} />
          <AbilityButton label="Slash" needle="slash" student={student} blocked={debugActionsBlocked} controller={controller} />
          <AbilityButton
            label="Push test"
            needle="knockback"
            student={student}
            targetId={enemies[0]?.id}
            blocked={debugActionsBlocked}
            controller={controller}
          />
        </div>
      </section>

      <section className="debug-panel">
        <button
          className="debug-toggle"
          type="button"
          aria-expanded={debugOpen}
          onClick={() => setDebugOpen((open) => !open)}
        >
          <span>Domain debug panel</span>
          <span>{debugOpen ? 'Collapse' : 'Expand'}</span>
        </button>
        {debugOpen && (
          <div className="debug-grid">
            <StateInspector snapshot={snapshot} />
            <EventLog snapshot={snapshot} />
          </div>
        )}
      </section>
    </main>
  );
}

function SpeedButton({
  speed,
  active,
  onClick,
}: {
  readonly speed: PlaybackSpeed;
  readonly active: boolean;
  readonly onClick: (speed: PlaybackSpeed) => void;
}) {
  return (
    <button
      type="button"
      className={active ? 'is-active' : undefined}
      onClick={() => onClick(speed)}
    >
      {speed === 'INSTANT' ? 'Instant' : `${speed}x`}
    </button>
  );
}

function AbilityButton({
  label,
  needle,
  student,
  targetId,
  blocked,
  controller,
}: {
  readonly label: string;
  readonly needle: string;
  readonly student: Unit | undefined;
  readonly targetId?: string;
  readonly blocked: boolean;
  readonly controller: SandboxController;
}) {
  const abilityId = student?.abilities.find((id) => id.toLowerCase().includes(needle));
  return (
    <button
      type="button"
      disabled={blocked || !student || !abilityId || (needle === 'knockback' && !targetId)}
      onClick={() => {
        if (!student || !abilityId) return;
        controller.performDebugAction({
          type: 'USE_ABILITY',
          actorId: student.id,
          abilityId,
          direction: student.facing,
          targetId,
        });
      }}
    >
      {label}
    </button>
  );
}

function move(controller: SandboxController, student: Unit, direction: Direction): void {
  const deltas: Record<Direction, GridPosition> = {
    UP: { x: 0, y: -1 },
    RIGHT: { x: 1, y: 0 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
  };
  const delta = deltas[direction];
  const action: CombatAction = {
    type: 'MOVE',
    actorId: student.id,
    to: { x: student.position.x + delta.x, y: student.position.y + delta.y },
  };
  controller.performDebugAction(action);
}

function StateInspector({ snapshot }: { readonly snapshot: ReturnType<SandboxController['getSnapshot']> }) {
  return (
    <article className="inspector-card">
      <div className="inspector-heading">
        <h3>Simulation head</h3>
        <span>turn {snapshot.state.turn} / {snapshot.state.phase}</span>
      </div>
      <p className="head-note">
        Domain resolution is immediate; presentation is {snapshot.status.queuedEventCount} events behind.
      </p>
      <div className="unit-list">
        {snapshot.state.units.map((unit) => (
          <div className="unit-row" key={unit.id}>
            <span className={`faction-dot faction-dot--${unit.faction.toLowerCase()}`} />
            <code>{unit.id}</code>
            <span>({unit.position.x}, {unit.position.y})</span>
            <span>HP {unit.hp}/{unit.maxHp}</span>
            <span>AP {unit.ap}/{unit.maxAp}</span>
            <span>guard {unit.status.guard}</span>
          </div>
        ))}
      </div>
      <pre>{JSON.stringify(snapshot.state.intents, null, 2)}</pre>
    </article>
  );
}

function EventLog({ snapshot }: { readonly snapshot: ReturnType<SandboxController['getSnapshot']> }) {
  return (
    <article className="inspector-card event-card">
      <div className="inspector-heading">
        <h3>CombatEvent history</h3>
        <span>{snapshot.eventHistory.length} events</span>
      </div>
      <ol className="event-list">
        {snapshot.eventHistory.map((event, index) => ({ event, index })).reverse().map(({ event, index }) => {
          const presented = index < snapshot.status.presentedEventCount;
          return (
            <li key={event.sequence} className={presented ? 'is-presented' : 'is-queued'}>
              <span>#{event.sequence}</span>
              <strong>{event.type}</strong>
              <small>T{event.turn}</small>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

function humanize(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
