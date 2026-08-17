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
    if (!import.meta.env.DEV) return;
    window.__ISEKAI_COACH_COMBAT__ = { snapshot };
    return () => {
      delete window.__ISEKAI_COACH_COMBAT__;
    };
  }, [snapshot]);
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
      } else if (event.key === ' ' && snapshot.mode === 'PLAYER_TURN') {
        event.preventDefault();
        controller.confirmPlan();
      } else if (event.key.toLowerCase() === 'z' && snapshot.mode === 'PLAYER_TURN') {
        event.preventDefault();
        controller.undoLastAction();
      } else if (event.key.toLowerCase() === 'e' && snapshot.mode === 'VICTORY') {
        controller.unlockSeal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controller, snapshot.mode]);

  const displayState = snapshot.mode === 'PLAYER_TURN' ? snapshot.previewState : snapshot.state;
  const administrator = displayState.units.find((unit) => unit.id === 'administrator-01');
  const ally = displayState.units.find((unit) => unit.id === 'archer-companion-01');
  const boss = displayState.units.find((unit) => unit.id === 'barrier-guardian-01');
  const intent = displayState.intents.find((candidate) => candidate.sourceId === boss?.id);

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
              image="assets/slice1/administrator-v2.png"
              tone="administrator"
            />
            <CombatantPortrait
              unit={ally}
              name="원거리 동료"
              image="assets/slice1/archer-v2.png"
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
          <button type="button" className={`intent-callout ${intent.abilityId === 'guardian-rupture' ? 'is-wide' : ''}`}>
            <img className="intent-icon" src={`${BASE_URL}${intentIconPath(intent.abilityId)}`} alt="" />
            <div>
              <small>적 행동 고정</small>
              <strong>{intentName(intent.abilityId)}</strong>
            </div>
            <i>{intentDetail(intent.abilityId)}</i>
            <span className="intent-tooltip" role="tooltip">{intentTooltip(intent.abilityId)}</span>
          </button>
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
  const pattern = ((Math.max(1, turn) - 1) % 3) + 1;
  return (
    <div className="boss-hud">
      <div className="boss-title">
        <small>아마존 결계문</small>
        <strong>결계 수호자</strong>
        <span>TURN {Math.max(1, turn)}</span>
      </div>
      <div className="boss-health"><i style={{ width: `${ratio * 100}%` }} /></div>
      <div className="boss-phase">
        <span className={pattern === 1 ? 'is-current' : ''}>Ⅰ 이동→제압</span>
        <span className={pattern === 2 ? 'is-current' : ''}>Ⅱ 외침</span>
        <span className={pattern === 3 ? 'is-current' : ''}>Ⅲ 소환</span>
        <em>{intentAbility === 'guardian-rupture' ? '⚠ 중단 가능' : '1→2→3 반복'}</em>
      </div>
    </div>
  );
}

function TurnBanner({ mode, turn }: { readonly mode: SliceMode; readonly turn: number }) {
  const copy: Partial<Record<SliceMode, { label: string; sub: string }>> = {
    PLAYER_TURN: { label: '<내 턴>', sub: `TURN ${turn} · 행동 계획 후 SPACE로 확정` },
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
  const administrator = snapshot.previewState.units.find((unit) => unit.id === 'administrator-01');
  const livingEnemies = snapshot.previewState.units.filter((unit) => unit.faction === 'ENEMY' && unit.hp > 0);
  return (
    <section className={`player-controls ${snapshot.isBusy ? 'is-busy' : ''}`} aria-label="관리자 조작">
      <div className="plan-strip" aria-label="예정 행동">
        <small>예정 행동</small>
        <div className="target-picker" aria-label="공격 대상">
          <small>대상</small>
          {livingEnemies.map((enemy) => (
            <button
              key={enemy.id}
              type="button"
              className={enemy.id === snapshot.selectedTargetId ? 'is-selected' : ''}
              aria-pressed={enemy.id === snapshot.selectedTargetId}
              onClick={() => controller.selectTarget(enemy.id)}
            >
              {unitName(enemy)}
            </button>
          ))}
        </div>
        <div>
          {snapshot.plannedActions.length === 0
            ? <span className="plan-empty">이동 또는 공격을 선택</span>
            : snapshot.plannedActions.map((action, index) => (
              <span key={action.id} className="plan-chip"><i>{index + 1}</i>{action.label}</span>
            ))}
        </div>
      </div>
      <div className="movement-control">
        <span className="control-caption">이동 <small>AP 1</small></span>
        <div className="wasd-grid" aria-label="WASD 이동">
          <button type="button" disabled={!snapshot.canConfirm} onClick={() => controller.move('UP')}>W</button>
          <button type="button" disabled={!snapshot.canConfirm} onClick={() => controller.move('LEFT')}>A</button>
          <button type="button" disabled={!snapshot.canConfirm} onClick={() => controller.move('DOWN')}>S</button>
          <button type="button" disabled={!snapshot.canConfirm} onClick={() => controller.move('RIGHT')}>D</button>
        </div>
      </div>
      <div className="action-control">
        <span className="control-caption">공격 <small>이동과 별개</small></span>
        <div className="skill-row">
          {snapshot.actions.map((action, index) => (
            <button
              key={action.id}
              type="button"
              className={`skill-button skill-${action.id.toLowerCase()} ${action.executable ? '' : 'is-disabled'}`}
              disabled={snapshot.isBusy}
              aria-disabled={!action.executable}
              onClick={() => controller.useAction(action.id)}
              onMouseEnter={() => controller.setActionHover(action.id)}
              onMouseLeave={() => controller.setActionHover()}
              onFocus={() => controller.setActionHover(action.id)}
              onBlur={() => controller.setActionHover()}
            >
              <kbd>{index + 1}</kbd>
              <img src={`${BASE_URL}assets/ui/intent-${action.icon.toLowerCase()}.svg`} alt="" />
              <strong>{action.label}</strong>
              <small>AP {action.apCost}</small>
              <span className="skill-tooltip">
                <b>{action.label}</b>{action.description}
                {!action.executable && <em>{actionFailureCopy(action.failureReason)}</em>}
                <small>{action.tags.join('  ')}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="turn-control">
        <div className="ap-readout">
          <small>ACTION POINT</small>
          <strong>{'◆'.repeat(administrator?.ap ?? 0)}<i>{'◇'.repeat(Math.max(0, (administrator?.maxAp ?? 0) - (administrator?.ap ?? 0)))}</i></strong>
        </div>
        <div className="plan-actions">
          <button type="button" className="undo-button" disabled={!snapshot.canUndo} onClick={controller.undoLastAction}>
            <span>하나 되돌리기</span><kbd>Z</kbd>
          </button>
          <button type="button" className="end-turn-button" disabled={!snapshot.canConfirm} onClick={controller.confirmPlan}>
            <span>{snapshot.plannedActions.length === 0 ? '대기 · 턴 종료' : '행동 확정'}</span><kbd>SPACE</kbd>
          </button>
        </div>
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
  if (abilityId === 'guardian-rupture') return '외침';
  if (abilityId === 'guardian-crush') return '이동 → 제압';
  if (abilityId === 'guardian-summon') return '하수인 소환';
  if (abilityId === 'minion-charge') return '돌진';
  return '알 수 없는 행동';
}

function intentDetail(abilityId: string | undefined): string {
  if (abilityId === 'guardian-rupture') return '5×3 · 피해 2 · 중단 가능';
  if (abilityId === 'guardian-crush') return '2칸 이동 · 피해 6';
  if (abilityId === 'guardian-summon') return '원거리 동료 추적';
  if (abilityId === 'minion-charge') return '3×1 · 피해 2';
  return '행동 고정';
}

function intentIconPath(abilityId: string | undefined): string {
  if (abilityId === 'guardian-summon') return 'assets/ui/intent-summon.svg';
  if (abilityId === 'minion-charge') return 'assets/ui/intent-push.svg';
  return 'assets/ui/intent-attack.svg';
}

function intentTooltip(abilityId: string | undefined): string {
  if (abilityId === 'guardian-crush') {
    return '제압 · 이동 후 공격\n왼쪽으로 2칸 이동한 뒤 전방 1칸에 피해 6을 줍니다. 이 행동은 스턴으로 중단할 수 없습니다.';
  }
  if (abilityId === 'guardian-rupture') {
    return '외침 · 광역 공격\n현재 위치에서 왼쪽 5칸과 3개 행에 피해 2를 줍니다. 내려찍기의 스턴으로 중단할 수 있습니다.';
  }
  if (abilityId === 'guardian-summon') {
    return '하수인 소환\n빈 인접 칸에 원거리 동료를 추적하는 적 하수인을 소환합니다.';
  }
  if (abilityId === 'minion-charge') {
    return '돌진 · 이동 공격\n원거리 동료 방향으로 최대 3칸 이동하며 처음 만난 대상에게 피해 2를 줍니다.';
  }
  return '고정된 적 행동입니다.';
}

function unitName(unit: Unit): string {
  if (unit.combatRole === 'BOSS') return '결계 수호자';
  if (unit.combatRole === 'MINION') return '추적 하수인';
  return unit.faction === 'ENEMY' ? '적' : '아군';
}

function actionFailureCopy(reason: SliceSnapshot['actions'][number]['failureReason']): string {
  if (reason === 'INSUFFICIENT_AP') return '현재 AP가 부족합니다.';
  if (reason === 'INVALID_TARGET') return '선택한 적이 사거리 밖에 있습니다.';
  if (reason === 'BLOCKED_KNOCKBACK') return '대상 뒤의 칸이 막혀 밀칠 수 없습니다.';
  if (reason === 'OCCUPIED') return '다른 전투원이 해당 칸을 점유하고 있습니다.';
  return '현재 계획에서는 실행할 수 없습니다.';
}
