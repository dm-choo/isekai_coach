import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Unit } from '../game/combat';
import { POLICY_COPY, type SliceActionId, type SliceSnapshot } from '../game/slice';
import {
  Slice2RunController,
  SLICE2_LATE_START_MINUTE,
  PATROL_RETURN_MINUTE,
  TRAVEL_MINUTES_PER_SEGMENT,
  encounterAt,
  formatWorldTime,
  isEncounterVisible,
  type EncounterContent,
  type WorldTileState,
} from '../game/slice2';
import { PhaserCanvas } from './PhaserCanvas';

const BASE_URL = import.meta.env.BASE_URL;

export function Slice2App() {
  const [controller] = useState(() => {
    const query = new URLSearchParams(window.location.search);
    const verification = import.meta.env.DEV && query.has('verify');
    const debugStart = import.meta.env.DEV ? Number(query.get('start')) : Number.NaN;
    return new Slice2RunController({
      ...(verification ? { playbackSpeed: 12, phaseDelayScale: 0.03 } : {}),
      ...(Number.isFinite(debugStart) && debugStart > 0
        ? { startMinute: debugStart }
        : query.has('late') ? { startMinute: SLICE2_LATE_START_MINUTE } : {}),
    });
  });
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  useEffect(() => () => controller.destroy(), [controller]);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__ISEKAI_COACH_SLICE2__ = { snapshot };
    return () => { delete window.__ISEKAI_COACH_SLICE2__; };
  }, [snapshot]);
  useEffect(() => {
    if (!import.meta.env.DEV || !snapshot.combat) return;
    window.__ISEKAI_COACH_COMBAT__ = { snapshot: snapshot.combat };
    return () => { delete window.__ISEKAI_COACH_COMBAT__; };
  }, [snapshot.combat]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || snapshot.mode !== 'COMBAT' || !snapshot.combat) return;
      const directions = { w: 'UP', ArrowUp: 'UP', a: 'LEFT', ArrowLeft: 'LEFT', s: 'DOWN', ArrowDown: 'DOWN', d: 'RIGHT', ArrowRight: 'RIGHT' } as const;
      const direction = directions[event.key as keyof typeof directions];
      if (direction) {
        event.preventDefault();
        controller.move(direction);
      } else if (['1', 'q', 'Q'].includes(event.key)) {
        event.preventDefault();
        const action = snapshot.combat.actions[0];
        if (action) controller.useAction(action.id as SliceActionId);
      } else if (['2', 'e', 'E'].includes(event.key)) {
        event.preventDefault();
        const action = snapshot.combat.actions[1];
        if (action) controller.useAction(action.id as SliceActionId);
      } else if (event.key === ' ') {
        event.preventDefault();
        controller.confirmPlan();
      } else if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        controller.undoLastAction();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controller, snapshot.combat, snapshot.mode]);

  return (
    <main className="slice2-shell">
      <section className="slice2-stage" aria-label="네 월드 타일 원정">
        {snapshot.mode === 'COMBAT' && snapshot.combat
          ? <CombatStage snapshot={snapshot.combat} run={snapshot} controller={controller} encounter={snapshot.currentEncounter?.content} />
          : <ExplorationStage snapshot={snapshot} controller={controller} />}
        <RunHud snapshot={snapshot} />
      </section>
    </main>
  );
}

function ExplorationStage({ snapshot, controller }: {
  readonly snapshot: ReturnType<Slice2RunController['getSnapshot']>;
  readonly controller: Slice2RunController;
}) {
  if (snapshot.mode === 'INTRO') {
    return (
      <div className="slice2-intro">
        <div className="slice2-intro-copy">
          <p>EXPEDITION 02 · FOUR WORLD TILES</p>
          <h1>고블린 봉쇄선</h1>
          <span>중앙 방을 확보하고 통로를 정찰해 네 개의 월드 타일을 돌파하십시오.</span>
          <div className="enemy-brief">
            <b>장거리 사격</b><b>고속 접근</b><b>고정 지면 폭격</b>
          </div>
          <button type="button" onClick={controller.startRun}>원정 시작</button>
        </div>
      </div>
    );
  }
  if (snapshot.mode === 'POLICY_REVIEW') {
    const last = snapshot.lastPolicyTrace.at(-1);
    const skipped = last?.evaluations.find((evaluation) => !evaluation.executable);
    return (
      <div className="policy-review-screen">
        <p>AFTER ACTION · TILE 02</p>
        <h2>동료 전술 순서 검토</h2>
        <span>{last ? `마지막 선택: ${last.selectedName} · ${last.reason}` : '두 타일의 전투 기록을 확인했다.'}</span>
        {skipped && <em>상위 슬롯 미실행: {POLICY_COPY[skipped.policyId].name} · {skipped.reason}</em>}
        <div className="policy-choice-grid">
          <PolicyChoice title="기존 순서 유지" policy={snapshot.policy} onClick={() => controller.choosePolicy('KEEP')} />
          <PolicyChoice title="사격 우선으로 변경" policy={['SHOOT', 'EVADE', 'POSITION', 'PUSH', 'EMPTY']} onClick={() => controller.choosePolicy('AGGRESSIVE')} />
        </div>
      </div>
    );
  }
  if (snapshot.mode === 'VICTORY' || snapshot.mode === 'DEFEAT') {
    return (
      <div className={`slice2-result ${snapshot.mode === 'DEFEAT' ? 'is-defeat' : ''}`}>
        <p>{snapshot.mode === 'VICTORY' ? 'EXPEDITION COMPLETE' : 'EXPEDITION BROKEN'}</p>
        <h2>{snapshot.mode === 'VICTORY' ? '네 개의 안전 경로 확보' : '원정대 전투 불능'}</h2>
        <span>도착 {snapshot.worldTime} · 이동 {snapshot.elapsedTravel} · 전투 {snapshot.elapsedBattleTurns}턴 · 사건 {snapshot.elapsedEventMinutes}분 · 휴식 {snapshot.restCount}회 · 관리자 HP {snapshot.vitals.administratorHp} · 동료 HP {snapshot.vitals.allyHp}</span>
        <button type="button" onClick={snapshot.mode === 'DEFEAT' ? controller.retryEncounter : controller.restartRun}>
          {snapshot.mode === 'DEFEAT' ? '같은 인카운터 재시도' : '다시 원정'}
        </button>
      </div>
    );
  }
  return (
    <div className="local-scene">
      <div className="local-backdrop" />
      <div className="local-copy">
        <small>WORLD TILE {snapshot.currentTileIndex + 1} / 4</small>
        <h1>{snapshot.tile.name}</h1>
        <p>{snapshot.tile.corridorsScouted ? '중앙 방 확보 · 모든 통로 정찰 완료' : '중앙 방 미확보 · 통로 정보 불명'}</p>
        <em>{snapshot.worldMinute < PATROL_RETURN_MINUTE ? `순찰대 복귀 ${formatWorldTime(PATROL_RETURN_MINUTE)} · 그 전 도착 시 증원 없음` : '순찰대 활동 중 · 소규모 조우에 전사 증원'}</em>
      </div>
      <WorldTileMap tile={snapshot.tile} currentNodeId={snapshot.currentNodeId} currentMinute={snapshot.worldMinute} available={snapshot.availableNodeIds} onMove={controller.moveTo} />
      <div className="local-notice" role="status">{snapshot.notice}</div>
      <button type="button" className="rest-button" disabled={!snapshot.canRest} onClick={controller.rest}>
        휴식 20분 · 물 1 · 식량 1 · HP +3
      </button>
      {snapshot.canAdvanceTile && (
        <button type="button" className="advance-world-button" onClick={controller.advanceTile}>
          {snapshot.currentTileIndex === 3 ? '원정 완료' : `월드 타일 ${snapshot.currentTileIndex + 2}로 이동`} →
        </button>
      )}
    </div>
  );
}

function WorldTileMap({ tile, currentNodeId, currentMinute, available, onMove }: {
  readonly tile: WorldTileState;
  readonly currentNodeId: string;
  readonly currentMinute: number;
  readonly available: readonly string[];
  readonly onMove: (nodeId: string) => void;
}) {
  const nodeIds = [
    'room-center', 'room-north', 'room-east', 'room-south', 'room-west',
    ...(['north', 'east', 'south', 'west'] as const).flatMap((direction) => [1, 2, 3, 4].map((index) => `${direction}-${index}`)),
  ];
  return (
    <div className="world-tile-map" aria-label="월드 타일 방과 통로">
      <div className="map-cross" />
      {nodeIds.map((nodeId) => {
        const encounter = encounterAt(tile, nodeId);
        const visible = isEncounterVisible(tile, nodeId);
        const isRoom = nodeId.startsWith('room-');
        const isCurrent = nodeId === currentNodeId;
        const canMove = available.includes(nodeId);
        const label = nodeLabel(nodeId, encounter?.content, visible);
        return (
          <button
            key={nodeId}
            type="button"
            className={`map-node node-${nodeId} ${isRoom ? 'is-room' : 'is-segment'} ${isCurrent ? 'is-current' : ''} ${encounter?.resolved ? 'is-resolved' : ''}`}
            disabled={!canMove}
            onClick={() => onMove(nodeId)}
            aria-label={label}
            title={canMove ? `${label} · 이동 2분 · 예상 ${formatWorldTime(currentMinute + TRAVEL_MINUTES_PER_SEGMENT)}` : label}
          >
            <span>{nodeGlyph(nodeId, encounter?.content, visible, encounter?.resolved ?? true)}</span>
            {isCurrent && <i>현재</i>}
            {canMove && !isCurrent && <em>+2분</em>}
          </button>
        );
      })}
      <span className="map-direction north">북</span><span className="map-direction east">동 · 다음</span>
      <span className="map-direction south">남</span><span className="map-direction west">서 · 진입</span>
    </div>
  );
}

function CombatStage({ snapshot, run, controller, encounter }: {
  readonly snapshot: SliceSnapshot;
  readonly run: ReturnType<Slice2RunController['getSnapshot']>;
  readonly controller: Slice2RunController;
  readonly encounter?: EncounterContent;
}) {
  const state = snapshot.mode === 'PLAYER_TURN' ? snapshot.previewState : snapshot.state;
  const party = state.units.filter((unit) => unit.faction === 'STUDENT');
  const enemies = state.units.filter((unit) => unit.faction === 'ENEMY' && unit.hp > 0);
  return (
    <div className={`slice2-combat ${run.isNight ? 'is-night' : ''}`}>
      <PhaserCanvas controller={controller} />
      <div className="stage-vignette" />
      <header className="slice2-combat-hud">
        <div className="slice2-party-bars">{party.map((unit) => <UnitBar key={unit.id} unit={unit} />)}</div>
        <div className="encounter-title"><small>통로 인카운터</small><strong>{encounterTitle(encounter)}{enemies.some((enemy) => enemy.id.includes('patrol')) ? ' · 순찰 증원' : ''}</strong><span>TURN {snapshot.state.turn}</span></div>
        <div className="enemy-bars">{enemies.map((unit) => <UnitBar key={unit.id} unit={unit} enemy />)}</div>
      </header>
      <IntentStack snapshot={snapshot} />
      {run.canUseLight && <button type="button" className="light-button" onClick={controller.useLight}>휴대용 조명 사용 · Intent 공개</button>}
      {snapshot.mode !== 'INTRO' && <CombatTurnBanner snapshot={snapshot} />}
      {snapshot.mode !== 'INTRO' && <div className="combat-notice"><span />{snapshot.notice}</div>}
      {snapshot.mode === 'ALLY_TURN' && <PolicyReadout snapshot={snapshot} />}
      {snapshot.mode === 'PLAYER_TURN' && <CombatControls snapshot={snapshot} controller={controller} />}
      {snapshot.mode === 'INTRO' && (
        <div className="encounter-overlay"><div className="encounter-rule" /><p>SCOUTED ENCOUNTER</p><h1>{encounterTitle(encounter)}</h1><span>Intent를 확인하고 진형을 결정하십시오.</span><button type="button" onClick={controller.startEncounter}>전투 시작</button></div>
      )}
      {snapshot.mode === 'VICTORY' && (
        <div className="result-overlay"><p>PATH SECURED</p><h2>인카운터 해결</h2><span>현재 HP와 소요 턴이 원정에 유지됩니다.</span><button type="button" onClick={controller.completeEncounter}>통로로 복귀</button></div>
      )}
      {snapshot.mode === 'DEFEAT' && (
        <div className="result-overlay"><p>EXPEDITION BROKEN</p><h2>전투 불능</h2><span>인카운터 진입 직전 상태로 복원합니다.</span><button type="button" onClick={controller.retryEncounter}>같은 인카운터 재시도</button></div>
      )}
    </div>
  );
}

function CombatControls({ snapshot, controller }: { readonly snapshot: SliceSnapshot; readonly controller: Slice2RunController }) {
  const administrator = snapshot.previewState.units.find((unit) => unit.id === 'administrator-slice2');
  const enemies = snapshot.previewState.units.filter((unit) => unit.faction === 'ENEMY' && unit.hp > 0);
  return (
    <section className={`player-controls ${snapshot.isBusy ? 'is-busy' : ''}`}>
      <div className="plan-strip"><small>대상</small><div className="target-picker">{enemies.map((enemy) => <button key={enemy.id} type="button" className={snapshot.selectedTargetId === enemy.id ? 'is-selected' : ''} onClick={() => controller.selectTarget(enemy.id)}>{unitName(enemy)}</button>)}</div><div>{snapshot.plannedActions.length ? snapshot.plannedActions.map((action, index) => <span key={action.id} className="plan-chip"><i>{index + 1}</i>{action.label}</span>) : <span className="plan-empty">이동 또는 공격을 선택</span>}</div></div>
      <div className="movement-control"><span className="control-caption">이동 <small>AP 1</small></span><div className="wasd-grid"><button type="button" onClick={() => controller.move('UP')}>W</button><button type="button" onClick={() => controller.move('LEFT')}>A</button><button type="button" onClick={() => controller.move('DOWN')}>S</button><button type="button" onClick={() => controller.move('RIGHT')}>D</button></div></div>
      <div className="action-control"><span className="control-caption">공격</span><div className="skill-row">{snapshot.actions.map((action, index) => <ActionButton key={action.id} action={action} index={index} controller={controller} />)}</div></div>
      <div className="turn-control"><div className="ap-readout"><small>ACTION POINT</small><strong>{'◆'.repeat(administrator?.ap ?? 0)}<i>{'◇'.repeat(Math.max(0, (administrator?.maxAp ?? 0) - (administrator?.ap ?? 0)))}</i></strong></div><div className="plan-actions"><button type="button" className="undo-button" disabled={!snapshot.canUndo} onClick={controller.undoLastAction}><span>되돌리기</span><kbd>Z</kbd></button><button type="button" className="end-turn-button" disabled={!snapshot.canConfirm} onClick={controller.confirmPlan}><span>{snapshot.plannedActions.length ? '행동 확정' : '대기'}</span><kbd>SPACE</kbd></button></div></div>
    </section>
  );
}

function ActionButton({ action, index, controller }: { readonly action: SliceSnapshot['actions'][number]; readonly index: number; readonly controller: Slice2RunController }) {
  return <button type="button" className={`skill-button ${action.executable ? '' : 'is-disabled'}`} disabled={false} aria-disabled={!action.executable} onClick={() => controller.useAction(action.id as SliceActionId)} onMouseEnter={() => controller.setActionHover(action.id as SliceActionId)} onMouseLeave={() => controller.setActionHover()}><kbd>{index === 0 ? '1 / Q' : index === 1 ? '2 / E' : index + 1}</kbd><img src={`${BASE_URL}assets/ui/intent-${action.icon.toLowerCase()}.svg`} alt="" /><strong>{action.label}</strong><small>AP {action.apCost}</small><span className="skill-tooltip"><b>{action.label}</b>{action.description}{!action.executable && <em>현재 계획에서 실행할 수 없습니다.</em>}<small>{action.tags.join(' ')}</small></span></button>;
}

function IntentStack({ snapshot }: { readonly snapshot: SliceSnapshot }) {
  const hidden = new Set(snapshot.concealedIntentIds);
  return <div className="intent-stack">{snapshot.previewState.intents.map((intent) => hidden.has(intent.id)
    ? <article key={intent.id} className="enemy-intent-card is-concealed" tabIndex={0}><span className="concealed-glyph">?</span><div><small>{unitName(snapshot.previewState.units.find((unit) => unit.id === intent.sourceId))}</small><strong>{intent.direction === 'LEFT' ? '서쪽' : intent.direction === 'RIGHT' ? '동쪽' : intent.direction === 'UP' ? '북쪽' : '남쪽'}을 노림</strong></div><span>행동·범위 불명</span><span className="intent-card-tooltip" role="tooltip">어둠 때문에 행동 하나가 숨겨졌습니다. 휴대용 조명을 사용하면 이번 전투의 모든 Intent가 공개됩니다.</span></article>
    : <article key={intent.id} className={`enemy-intent-card ${intent.anchor === 'GROUND' ? 'is-ground' : ''}`} tabIndex={0}><img src={`${BASE_URL}${intentIcon(intent.abilityId)}`} alt="" /><div><small>{unitName(snapshot.previewState.units.find((unit) => unit.id === intent.sourceId))}</small><strong>{intentName(intent.abilityId)}</strong></div><span>{intent.anchor} · {intent.effectCells.length}칸</span><span className="intent-card-tooltip" role="tooltip">{intentDetail(intent.abilityId)} · {intent.direction === 'LEFT' ? '서쪽' : intent.direction === 'RIGHT' ? '동쪽' : intent.direction === 'UP' ? '북쪽' : '남쪽'} 방향. 붉은 칸은 현재 고정된 피해 범위입니다.</span></article>)}</div>;
}

function PolicyReadout({ snapshot }: { readonly snapshot: SliceSnapshot }) {
  return <div className="ally-turn-readout"><div className="ally-policy-slots">{snapshot.policy.map((id, index) => <span key={`${id}-${index}`} className={snapshot.activePolicyStep?.selectedPolicyId === id ? 'is-active' : id === 'EMPTY' ? 'is-empty' : ''}><i>{index + 1}</i>{POLICY_COPY[id].name}</span>)}</div>{snapshot.activePolicyStep && <div className="ally-action-result"><strong>{snapshot.activePolicyStep.selectedName}</strong><small>{snapshot.activePolicyStep.reason}</small></div>}</div>;
}

function CombatTurnBanner({ snapshot }: { readonly snapshot: SliceSnapshot }) {
  const labels = { PLAYER_TURN: '<내 턴>', ALLY_TURN: '<아군 턴>', ENEMY_TURN: '<적 턴>', VICTORY: '<승리>', DEFEAT: '<전멸>' } as const;
  const label = labels[snapshot.mode as keyof typeof labels];
  return label ? <div className={`turn-banner turn-banner-${snapshot.mode.toLowerCase()}`}><span /><div><strong>{label}</strong><small>TURN {snapshot.state.turn}</small></div><span /></div> : null;
}

function RunHud({ snapshot }: { readonly snapshot: ReturnType<Slice2RunController['getSnapshot']> }) {
  return <aside className="run-hud"><div className="run-route">{snapshot.world.tiles.map((tile, index) => <span key={tile.id} className={`${index === snapshot.currentTileIndex ? 'is-current' : ''} ${tile.cleared ? 'is-cleared' : ''}`}><i>{index + 1}</i>{tile.name}</span>)}</div><div className="run-stats"><strong className={snapshot.isNight ? 'is-night' : ''}>{snapshot.worldTime}</strong><b>물 {snapshot.supplies.water}/2</b><b>식량 {snapshot.supplies.food}/2</b><b>조명 {snapshot.supplies.light}</b><small>이동 {snapshot.elapsedTravel} · 전투 {snapshot.elapsedBattleTurns}턴 · 사건 {snapshot.elapsedEventMinutes}분</small></div></aside>;
}

function UnitBar({ unit, enemy = false }: { readonly unit: Unit; readonly enemy?: boolean }) {
  const ratio = Math.max(0, unit.hp / Math.max(1, unit.maxHp));
  return <article className={`slice2-unit-bar ${enemy ? 'is-enemy' : ''}`}><strong>{unitName(unit)}</strong><div><i style={{ width: `${ratio * 100}%` }} /></div><small>{unit.hp}/{unit.maxHp}</small></article>;
}

function PolicyChoice({ title, policy, onClick }: { readonly title: string; readonly policy: readonly (keyof typeof POLICY_COPY)[]; readonly onClick: () => void }) {
  return <button type="button" onClick={onClick}><strong>{title}</strong><span>{policy.map((id, index) => <i key={`${id}-${index}`}>{index + 1}. {POLICY_COPY[id].name}</i>)}</span></button>;
}

function nodeGlyph(nodeId: string, content: EncounterContent | undefined, visible: boolean, resolved: boolean): string {
  if (nodeId === 'room-center') return resolved ? '✓' : '⌂';
  if (nodeId === 'room-east') return '🚪';
  if (nodeId === 'room-west') return '↩';
  if (nodeId.startsWith('room-')) return '⌂';
  if (!visible) return '?';
  if (resolved || content === 'NONE') return '·';
  if (content === 'RECOVERY_CACHE') return '+';
  if (content === 'WATER_CACHE') return '水';
  if (content === 'RATION_CACHE') return '食';
  if (content === 'ROOT_SNARE') return '!';
  return '⚔';
}

function nodeLabel(nodeId: string, content: EncounterContent | undefined, visible: boolean): string {
  if (nodeId === 'room-east') return '동쪽 출구, 다음 월드 타일로 향하는 문';
  if (nodeId === 'room-west') return '서쪽 입구, 이전 월드 타일에서 들어온 문';
  if (nodeId === 'room-center') return '중앙 방, 통로 정찰 거점';
  if (!visible) return `${nodeId}, 미정찰`;
  return `${nodeId}, ${content === 'NONE' ? '안전' : content === 'WATER_CACHE' ? '물 보급' : content === 'RATION_CACHE' ? '식량 보급' : content === 'RECOVERY_CACHE' || content === 'ROOT_SNARE' ? '사건' : '전투'}`;
}

function encounterTitle(content?: EncounterContent): string {
  const copy: Partial<Record<EncounterContent, string>> = { GOBLIN_ARCHER: '고블린 궁수', GOBLIN_WARRIOR: '고블린 전사', GOBLIN_BOMBER: '고블린 투척병', GOBLIN_ARCHER_WARRIOR: '궁수와 단검 전사', GOBLIN_ARCHER_BOMBER: '궁수와 투척병', GOBLIN_TRIO: '고블린 봉쇄조', GOBLIN_RUSH_SQUAD: '쌍단검 돌격대', GOBLIN_BOMBARDMENT: '포자 포격 호위대', GOBLIN_FIRELINE: '이중 사격 봉쇄선' };
  return content ? copy[content] ?? '통로 조우' : '통로 조우';
}

function unitName(unit?: Unit): string {
  if (!unit) return '적';
  if (unit.id.includes('administrator')) return '관리자';
  if (unit.id.includes('companion')) return '원거리 동료';
  if (unit.id.includes('patrol')) return '순찰 고블린 전사';
  if (unit.id.includes('archer')) return `고블린 궁수${unit.id.endsWith('-1') ? ' A' : unit.id.endsWith('-2') ? ' B' : ''}`;
  if (unit.id.includes('warrior')) return `고블린 전사${unit.id.endsWith('-1') ? ' A' : unit.id.endsWith('-2') ? ' B' : ''}`;
  if (unit.id.includes('bomber')) return `고블린 투척병${unit.id.endsWith('-1') ? ' A' : unit.id.endsWith('-2') ? ' B' : ''}`;
  return unit.faction === 'ENEMY' ? '적' : '아군';
}

function intentName(id?: string): string {
  if (id === 'goblin-long-shot') return '장거리 사격';
  if (id === 'goblin-rush') return '단검 쇄도';
  if (id === 'goblin-bomb') return '포자 폭탄';
  return '공격';
}

function intentDetail(id?: string): string {
  if (id === 'goblin-long-shot') return '사거리 안의 첫 대상에게 피해 2';
  if (id === 'goblin-rush') return '표시 경로로 접근한 뒤 전방을 공격';
  if (id === 'goblin-bomb') return '표시된 지면을 다음 적 턴에 폭격';
  return '표시된 범위에 공격';
}

function intentIcon(id?: string): string {
  if (id === 'goblin-long-shot') return 'assets/ui/intent-shoot.svg';
  if (id === 'goblin-rush') return 'assets/ui/intent-move.svg';
  return 'assets/ui/intent-attack.svg';
}
