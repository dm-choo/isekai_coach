import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Direction, Unit } from '../game/combat';
import {
  POLICY_COPY,
  SliceController,
  type SliceMode,
  type SliceSnapshot,
} from '../game/slice';
import { PhaserCanvas } from './PhaserCanvas';

const BASE_URL = import.meta.env.BASE_URL;

export function App() {
  const [controller] = useState(() => new SliceController());
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  useEffect(() => () => controller.destroy(), [controller]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const directions: Partial<Record<string, Direction>> = {
        w: 'UP', ArrowUp: 'UP',
        a: 'LEFT', ArrowLeft: 'LEFT',
        s: 'DOWN', ArrowDown: 'DOWN',
        d: 'RIGHT', ArrowRight: 'RIGHT',
      };
      const direction = directions[event.key];
      if (direction) {
        event.preventDefault();
        controller.move(direction);
      } else if ((event.key === ' ' || event.key === 'Enter') && snapshot.mode === 'PLAYER_TURN') {
        event.preventDefault();
        controller.endTurn();
      } else if (event.key.toLowerCase() === 'e' && snapshot.mode === 'VICTORY') {
        controller.unlockSeal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controller, snapshot.mode]);

  const administrator = snapshot.state.units.find((unit) => unit.id === 'administrator-01');
  const ally = snapshot.state.units.find((unit) => unit.id === 'archer-companion-01');
  const boss = snapshot.state.units.find((unit) => unit.id === 'barrier-guardian-01');
  const intent = snapshot.state.intents.find((candidate) => candidate.sourceId === boss?.id);

  return (
    <main className={`game-shell mode-${snapshot.mode.toLowerCase()}`}>
      <section className="game-stage" aria-label="아마존 결계문 보스 전투">
        <PhaserCanvas controller={controller} />
        <div className="stage-vignette" aria-hidden="true" />

        <header className="combat-hud">
          <div className="party-hud">
            <CombatantPortrait
              unit={administrator}
              name="관리자"
              image="assets/slice1/administrator.png"
              tone="administrator"
            />
            <CombatantPortrait
              unit={ally}
              name="원거리 동료"
              image="assets/slice1/archer.png"
              tone="ally"
            />
          </div>
          <BossHud unit={boss} turn={snapshot.state.turn} intentAbility={intent?.abilityId} />
          <button className="restart-button" type="button" onClick={controller.restart}>
            ↻ <span>다시 시작</span>
          </button>
        </header>

        {snapshot.mode !== 'INTRO' && (
          <TurnBanner key={`${snapshot.phaseSerial}-${snapshot.mode}`} mode={snapshot.mode} turn={snapshot.state.turn} />
        )}

        {intent && snapshot.mode !== 'INTRO' && (
          <div className={`intent-callout ${intent.abilityId === 'guardian-rupture' ? 'is-wide' : ''}`}>
            <span className="intent-eye" aria-hidden="true">◉</span>
            <div>
              <small>적 행동 고정</small>
              <strong>{intentName(intent.abilityId)}</strong>
            </div>
            <i>{intent.abilityId === 'guardian-rupture' ? '중단 가능' : '← 1칸'}</i>
          </div>
        )}

        {snapshot.mode === 'ALLY_TURN' && (
          <AllyTurnReadout snapshot={snapshot} />
        )}

        {snapshot.mode !== 'INTRO' && snapshot.mode !== 'SEAL_UNLOCKED' && (
          <div className="combat-notice" role="status">
            <span />{snapshot.notice}
          </div>
        )}

        {snapshot.mode === 'PLAYER_TURN' && (
          <PlayerControls snapshot={snapshot} controller={controller} />
        )}

        {snapshot.mode === 'INTRO' && (
          <EncounterOverlay onStart={controller.startEncounter} attempt={snapshot.attempt} />
        )}
        {snapshot.mode === 'VICTORY' && (
          <ResultOverlay
            eyebrow="BARRIER GUARDIAN DEFEATED"
            title="봉인이 드러났다"
            copy="관리자만 이 오브젝트의 봉인을 해제할 수 있다."
            actionLabel="E  봉인 해제"
            onAction={controller.unlockSeal}
          />
        )}
        {snapshot.mode === 'DEFEAT' && (
          <ResultOverlay
            eyebrow="EXPEDITION BROKEN"
            title="원정대가 무너졌다"
            copy="수호자의 행동을 다시 읽어야 한다."
            actionLabel="다시 시도"
            onAction={controller.restart}
          />
        )}
        {snapshot.mode === 'SEAL_UNLOCKED' && (
          <ResultOverlay
            eyebrow="SEAL RELEASED"
            title="결계문이 열렸다"
            copy="전투 수직 슬라이스 종료"
            actionLabel="다시 플레이"
            onAction={controller.restart}
          />
        )}
      </section>
    </main>
  );
}

function CombatantPortrait({
  unit,
  name,
  image,
  tone,
}: {
  readonly unit?: Unit;
  readonly name: string;
  readonly image: string;
  readonly tone: 'administrator' | 'ally';
}) {
  const ratio = Math.max(0, (unit?.hp ?? 0) / Math.max(1, unit?.maxHp ?? 1));
  return (
    <article className={`portrait portrait-${tone}`}>
      <div className="portrait-image"><img src={`${BASE_URL}${image}`} alt="" /></div>
      <div className="portrait-data">
        <strong>{name}</strong>
        <div className="compact-hp"><i style={{ width: `${ratio * 100}%` }} /></div>
        <small>{unit?.hp ?? 0}<span>/ {unit?.maxHp ?? 0}</span></small>
      </div>
    </article>
  );
}

function BossHud({
  unit,
  turn,
  intentAbility,
}: {
  readonly unit?: Unit;
  readonly turn: number;
  readonly intentAbility?: string;
}) {
  const ratio = Math.max(0, (unit?.hp ?? 0) / Math.max(1, unit?.maxHp ?? 1));
  return (
    <div className="boss-hud">
      <div className="boss-title">
        <small>아마존 결계문</small>
        <strong>결계 수호자</strong>
        <span>TURN {Math.max(1, turn)}</span>
      </div>
      <div className="boss-health"><i style={{ width: `${ratio * 100}%` }} /></div>
      <div className="boss-phase">
        <span className={turn <= 1 ? 'is-current' : 'is-done'}>Ⅰ 짧은 타격</span>
        <span className={turn >= 2 ? 'is-current' : ''}>Ⅱ 광범위 공격</span>
        <em>{intentAbility === 'guardian-rupture' ? '⚠ 중단 가능' : '대상 고정'}</em>
      </div>
    </div>
  );
}

function TurnBanner({ mode, turn }: { readonly mode: SliceMode; readonly turn: number }) {
  const copy: Partial<Record<SliceMode, { label: string; sub: string }>> = {
    PLAYER_TURN: { label: '<내 턴>', sub: `TURN ${turn} · 이동과 공격을 선택` },
    ALLY_TURN: { label: '<아군 턴>', sub: '전술 우선순 자동 실행' },
    ENEMY_TURN: { label: '<적 턴>', sub: '고정된 행동 해결' },
    VICTORY: { label: '<승리>', sub: '결계 수호자 제압' },
    DEFEAT: { label: '<전멸>', sub: '원정대 전투 불능' },
  };
  const current = copy[mode];
  if (!current) return null;
  return (
    <div className={`turn-banner turn-banner-${mode.toLowerCase()}`}>
      <span />
      <div><strong>{current.label}</strong><small>{current.sub}</small></div>
      <span />
    </div>
  );
}

function PlayerControls({
  snapshot,
  controller,
}: {
  readonly snapshot: SliceSnapshot;
  readonly controller: SliceController;
}) {
  const administrator = snapshot.state.units.find((unit) => unit.id === 'administrator-01');
  return (
    <section className={`player-controls ${snapshot.isBusy ? 'is-busy' : ''}`} aria-label="관리자 조작">
      <div className="movement-control">
        <span className="control-caption">이동 <small>AP 1</small></span>
        <div className="wasd-grid" aria-label="WASD 이동">
          <button type="button" onClick={() => controller.move('UP')}>W</button>
          <button type="button" onClick={() => controller.move('LEFT')}>A</button>
          <button type="button" onClick={() => controller.move('DOWN')}>S</button>
          <button type="button" onClick={() => controller.move('RIGHT')}>D</button>
        </div>
      </div>
      <div className="action-control">
        <span className="control-caption">공격 <small>이동과 별개</small></span>
        <div className="skill-row">
          {snapshot.actions.map((action, index) => (
            <button
              key={action.id}
              type="button"
              className={`skill-button skill-${action.id.toLowerCase()}`}
              disabled={!action.executable || snapshot.isBusy}
              onClick={() => controller.useAction(action.id)}
            >
              <kbd>{index + 1}</kbd>
              <i aria-hidden="true">{action.glyph}</i>
              <strong>{action.label}</strong>
              <small>AP {action.apCost}</small>
              <span className="skill-tooltip">{action.tags.join('  ')}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="turn-control">
        <div className="ap-readout">
          <small>ACTION POINT</small>
          <strong>{'◆'.repeat(administrator?.ap ?? 0)}<i>{'◇'.repeat(Math.max(0, (administrator?.maxAp ?? 0) - (administrator?.ap ?? 0)))}</i></strong>
        </div>
        <button type="button" className="end-turn-button" disabled={snapshot.isBusy} onClick={controller.endTurn}>
          <span>턴 종료</span><kbd>SPACE</kbd>
        </button>
      </div>
    </section>
  );
}

function AllyTurnReadout({ snapshot }: { readonly snapshot: SliceSnapshot }) {
  return (
    <div className="ally-turn-readout">
      <div className="ally-policy-slots">
        {snapshot.policy.map((policyId, index) => (
          <span
            key={`${policyId}-${index}`}
            className={snapshot.activePolicyStep?.selectedPolicyId === policyId ? 'is-active' : policyId === 'EMPTY' ? 'is-empty' : ''}
          >
            <i>{index + 1}</i>{POLICY_COPY[policyId].name}
          </span>
        ))}
      </div>
      {snapshot.activePolicyStep && (
        <div className="ally-action-result">
          <strong>{snapshot.activePolicyStep.selectedName}</strong>
          <small>{snapshot.activePolicyStep.reason}</small>
        </div>
      )}
    </div>
  );
}

function EncounterOverlay({ onStart, attempt }: { readonly onStart: () => void; readonly attempt: number }) {
  return (
    <div className="encounter-overlay">
      <div className="encounter-rule" />
      <p>AMAZON BARRIER GATE · ATTEMPT {String(attempt).padStart(2, '0')}</p>
      <h1>결계 수호자</h1>
      <span>길을 막고 있는 고대의 파수꾼</span>
      <button type="button" onClick={onStart}>전투 시작</button>
    </div>
  );
}

function ResultOverlay({
  eyebrow,
  title,
  copy,
  actionLabel,
  onAction,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly copy: string;
  readonly actionLabel: string;
  readonly onAction: () => void;
}) {
  return (
    <div className="result-overlay">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      <span>{copy}</span>
      <button type="button" onClick={onAction}>{actionLabel}</button>
    </div>
  );
}

function intentName(abilityId: string | undefined): string {
  if (abilityId === 'guardian-rupture') return '광범위 공격';
  if (abilityId === 'guardian-crush') return '짧은 타격';
  return '알 수 없는 행동';
}
