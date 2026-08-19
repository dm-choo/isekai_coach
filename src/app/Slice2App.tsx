import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { Intent, Unit } from '../game/combat';
import type { BattleVisualTheme } from '../game/assets/AssetManifest';
import { POLICY_COPY, type SliceActionId, type SliceSnapshot } from '../game/slice';
import {
  Slice2RunController,
  SLICE2_LATE_START_MINUTE,
  PATROL_RETURN_MINUTE,
  formatWorldTime,
  isEncounterVisible,
  type EncounterContent,
  type WorldDirection,
} from '../game/slice2';

const BASE_URL = import.meta.env.BASE_URL;
const PhaserCanvas = lazy(async () => {
  const module = await import('./PhaserCanvas');
  return { default: module.PhaserCanvas };
});

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
      if (event.repeat) return;
      if (event.key === ' ') {
        if (snapshot.mode === 'INTRO') controller.startRun();
        else if (snapshot.mode === 'COMBAT' && snapshot.combat?.mode === 'INTRO') controller.startEncounter();
        else if (snapshot.mode === 'COMBAT' && snapshot.combat?.mode === 'PLAYER_TURN') controller.confirmPlan();
        else if (snapshot.mode === 'COMBAT' && snapshot.combat?.mode === 'VICTORY') snapshot.isBossEncounter ? controller.unlockSeal() : controller.completeEncounter();
        else if (snapshot.mode === 'COMBAT' && snapshot.combat?.mode === 'SEAL_UNLOCKED') controller.completeEncounter();
        else if (snapshot.mode === 'COMBAT' && snapshot.combat?.mode === 'DEFEAT') controller.retryEncounter();
        else if (snapshot.mode === 'EXPLORE' && snapshot.canAdvanceTile) controller.advanceTile();
        else if (snapshot.mode === 'DEFEAT') controller.retryEncounter();
        else if (snapshot.mode === 'VICTORY') controller.restartRun();
        else return;
        event.preventDefault();
        return;
      }
      if (snapshot.mode === 'COMBAT' && snapshot.isBossEncounter && snapshot.combat?.mode === 'VICTORY' && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        controller.unlockSeal();
        return;
      }
      if (snapshot.mode !== 'COMBAT' || !snapshot.combat || snapshot.combat.mode !== 'PLAYER_TURN') return;
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
      } else if (['3', 'r', 'R'].includes(event.key)) {
        event.preventDefault();
        const action = snapshot.combat.actions[2];
        if (action) controller.useAction(action.id as SliceActionId);
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
        {snapshot.mode !== 'INTRO' && snapshot.mode !== 'COMBAT' && snapshot.elapsedBattleTurns > 0 && <ExpeditionPartyPanel snapshot={snapshot} controller={controller} />}
        {snapshot.mode !== 'INTRO' && <RunHud snapshot={snapshot} />}
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
          <button type="button" onClick={controller.startRun}>원정 시작 <kbd>SPACE</kbd></button>
        </div>
      </div>
    );
  }
  if (snapshot.mode === 'VICTORY' || snapshot.mode === 'DEFEAT') {
    return (
      <div className={`slice2-result ${snapshot.mode === 'DEFEAT' ? 'is-defeat' : ''}`}>
        <p>{snapshot.mode === 'VICTORY' ? 'EXPEDITION COMPLETE' : 'EXPEDITION BROKEN'}</p>
        <h2>{snapshot.mode === 'VICTORY' ? (snapshot.demoComplete ? '결계문 해제 · 데모 완료' : '네 개의 안전 경로 확보') : '원정대 전투 불능'}</h2>
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
      {snapshot.traversal
        ? <CorridorTraversalScene snapshot={snapshot} controller={controller} />
        : <RoomScene currentNodeId={snapshot.currentNodeId} doors={snapshot.availableDoorDirections} onEnter={controller.enterCorridor} />}
      {snapshot.tile.corridorsScouted && <DungeonMiniMap snapshot={snapshot} />}
      {!snapshot.traversal && <div className="local-notice" role="status">{snapshot.notice}</div>}
      {!snapshot.traversal && snapshot.canRest && <button type="button" className="rest-button" onClick={controller.rest}>
        휴식 20분 · 물 1 · 식량 1 · HP +3
      </button>}
      {snapshot.canAdvanceTile && (
        <button type="button" className="advance-world-button" onClick={controller.advanceTile}>
          {snapshot.currentTileIndex === 3 ? '결계문으로 이동' : `월드 타일 ${snapshot.currentTileIndex + 2}로 이동`} →
        </button>
      )}
    </div>
  );
}

function CorridorTraversalScene({ snapshot, controller }: {
  readonly snapshot: ReturnType<Slice2RunController['getSnapshot']>;
  readonly controller: Slice2RunController;
}) {
  const activeTimer = useRef<number | undefined>(undefined);
  const traversal = snapshot.traversal;
  useEffect(() => {
    const stop = () => {
      if (activeTimer.current !== undefined) window.clearInterval(activeTimer.current);
      activeTimer.current = undefined;
    };
    const start = (direction: 'FORWARD' | 'BACK') => {
      stop();
      controller.advanceTravel(direction);
      activeTimer.current = window.setInterval(() => controller.advanceTravel(direction), 85);
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key.toLowerCase() === 'd' || event.key === 'ArrowRight') { event.preventDefault(); start('FORWARD'); }
      if (event.key.toLowerCase() === 'a' || event.key === 'ArrowLeft') { event.preventDefault(); start('BACK'); }
    };
    const keyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'd' || key === 'a' || event.key === 'ArrowRight' || event.key === 'ArrowLeft') stop();
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', stop);
    return () => { stop(); window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', stop); };
  }, [controller]);
  if (!traversal) return null;
  const progress = traversal.progressMeters / traversal.distanceMeters;
  const startPointer = (direction: 'FORWARD' | 'BACK') => {
    if (activeTimer.current !== undefined) window.clearInterval(activeTimer.current);
    controller.advanceTravel(direction);
    activeTimer.current = window.setInterval(() => controller.advanceTravel(direction), 85);
  };
  const stopPointer = () => { if (activeTimer.current !== undefined) window.clearInterval(activeTimer.current); activeTimer.current = undefined; };
  const remaining = traversal.distanceMeters - traversal.progressMeters;
  return <section className="corridor-traversal" aria-label="400미터 통로 이동">
    <div className="corridor-depth" style={{ backgroundPositionX: `${progress * -1280}px` }} />
    <div className="corridor-ground" style={{ backgroundPositionX: `${progress * -920}px` }} />
    <div className="travel-party"><img src={`${BASE_URL}assets/slice1/administrator-v2.png`} alt="관리자" /><img src={`${BASE_URL}assets/slice1/archer-v2.png`} alt="원거리 동료" /></div>
    <div className="travel-destination"><span aria-hidden="true">▯</span><small>{remaining}m</small></div>
    <div className="travel-progress"><i style={{ width: `${progress * 100}%` }} />{[1, 2, 3].map((tick) => <b key={tick} style={{ left: `${tick * 25}%` }} />)}<span>{traversal.progressMeters} / 400m</span></div>
    <div className="travel-controls"><button type="button" onPointerDown={() => startPointer('BACK')} onPointerUp={stopPointer} onPointerLeave={stopPointer}><kbd>A</kbd> 후퇴</button><p role="status">{snapshot.notice}</p><button type="button" onPointerDown={() => startPointer('FORWARD')} onPointerUp={stopPointer} onPointerLeave={stopPointer}>전진 <kbd>D</kbd></button></div>
  </section>;
}

function RoomScene({ currentNodeId, doors, onEnter }: {
  readonly currentNodeId: string;
  readonly doors: readonly WorldDirection[];
  readonly onEnter: (direction: WorldDirection) => void;
}) {
  useEffect(() => {
    const keys: Record<string, WorldDirection> = { w: 'NORTH', ArrowUp: 'NORTH', d: 'EAST', ArrowRight: 'EAST', s: 'SOUTH', ArrowDown: 'SOUTH', a: 'WEST', ArrowLeft: 'WEST' };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const direction = keys[event.key] ?? keys[event.key.toLowerCase()];
      if (!direction || !doors.includes(direction)) return;
      event.preventDefault();
      onEnter(direction);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [doors, onEnter]);
  return (
    <section className="room-scene" aria-label={currentNodeId === 'room-center' ? '중앙 방' : '경계 방'}>
      <div className="room-floor" />
      <div className="room-party"><img src={`${BASE_URL}assets/slice1/administrator-v2.png`} alt="관리자" /><img src={`${BASE_URL}assets/slice1/archer-v2.png`} alt="원거리 동료" /></div>
      {doors.map((direction) => <button key={direction} type="button" data-direction={direction} className={`room-door is-${direction.toLowerCase()}`} onClick={() => onEnter(direction)} aria-label={`${direction} 문으로 통로 진입`}><i aria-hidden="true" /><span>{directionArrow(direction)}</span><kbd>{directionKey(direction)}</kbd></button>)}
    </section>
  );
}

function DungeonMiniMap({ snapshot }: { readonly snapshot: ReturnType<Slice2RunController['getSnapshot']> }) {
  const directions: readonly WorldDirection[] = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
  const activeRoom = snapshot.traversal ? undefined : snapshot.currentNodeId;
  return <aside className="dungeon-minimap" aria-label="현재 월드 타일 구조. 조작할 수 없는 상태 지도">
    <div className="mini-layout"><div className={`mini-room room-center ${activeRoom === 'room-center' ? 'is-current' : ''}`} />
      {directions.map((direction) => {
        const name = direction.toLowerCase();
        return <div key={direction} className={`mini-branch is-${name}`}>
          <div className="mini-corridor">{snapshot.tile.corridors[direction].map((segment) => {
            const visible = isEncounterVisible(snapshot.tile, segment.id);
            const current = snapshot.currentNodeId === segment.id;
            return <i key={segment.id} className={`${current ? 'is-current' : ''} ${segment.encounter.resolved ? 'is-resolved' : ''}`}>{nodeGlyph(segment.id, segment.encounter.content, visible, segment.encounter.resolved)}</i>;
          })}</div>
          <div className={`mini-room ${activeRoom === `room-${name}` ? 'is-current' : ''}`} />
        </div>;
      })}
    </div>
    <div className="mini-next-tile" aria-label={snapshot.currentTileIndex === 3 ? '원정 종점' : `동쪽으로 월드 타일 ${snapshot.currentTileIndex + 2}`}><b>→</b><span>{snapshot.currentTileIndex === 3 ? '⚑' : snapshot.currentTileIndex + 2}</span></div>
  </aside>;
}

function directionArrow(direction: WorldDirection): string { return ({ NORTH: '↑', EAST: '→', SOUTH: '↓', WEST: '←' })[direction]; }
function directionKey(direction: WorldDirection): string { return ({ NORTH: 'W', EAST: 'D', SOUTH: 'S', WEST: 'A' })[direction]; }

export interface CombatViewController {
  attachPresentation: Slice2RunController['attachPresentation'];
  selectTarget: Slice2RunController['selectTarget'];
  startEncounter: Slice2RunController['startEncounter'];
  move: Slice2RunController['move'];
  useAction: Slice2RunController['useAction'];
  setActionHover: Slice2RunController['setActionHover'];
  undoLastAction: Slice2RunController['undoLastAction'];
  confirmPlan: Slice2RunController['confirmPlan'];
  useLight: Slice2RunController['useLight'];
  unlockSeal: Slice2RunController['unlockSeal'];
  completeEncounter: Slice2RunController['completeEncounter'];
  retryEncounter: Slice2RunController['retryEncounter'];
}

export interface CombatRunView {
  readonly isNight: boolean;
  readonly canUseLight: boolean;
  readonly elapsedBattleTurns: number;
  readonly isBossEncounter: boolean;
  readonly defeatReturnsToTerritory?: boolean;
}

export function CombatStage({ snapshot, run, controller, encounter, visualTheme, prologueEncounter = false }: {
  readonly snapshot: SliceSnapshot;
  readonly run: CombatRunView;
  readonly controller: CombatViewController;
  readonly encounter?: EncounterContent;
  readonly visualTheme?: BattleVisualTheme;
  readonly prologueEncounter?: boolean;
}) {
  const state = snapshot.mode === 'PLAYER_TURN' ? snapshot.previewState : snapshot.state;
  const party = state.units.filter((unit) => unit.faction === 'STUDENT');
  const enemies = state.units.filter((unit) => unit.faction === 'ENEMY' && unit.hp > 0);
  const firstLearningTurn = snapshot.mode === 'PLAYER_TURN' && run.elapsedBattleTurns === 0 && snapshot.state.turn === 1;
  const soloLearningTurn = prologueEncounter && firstLearningTurn;
  const soloLearningPhase = soloLearningTurn && snapshot.plannedActions.length > 0 ? 'outcome' : 'threat';
  return (
    <div className={`slice2-combat ${run.isNight ? 'is-night' : ''} ${soloLearningTurn ? `is-solo-learning is-${soloLearningPhase}` : ''}`}>
      <Suspense fallback={<div className="phaser-host phaser-loading" aria-label="전장 불러오는 중"><i /><span>전장 불러오는 중</span></div>}>
        <PhaserCanvas controller={controller} visualTheme={visualTheme} />
      </Suspense>
      <div className="stage-vignette" />
      <header className="slice2-combat-hud">
        <div className="slice2-party-bars">{party.map((unit) => <UnitBar key={unit.id} unit={unit} />)}</div>
        {snapshot.mode === 'INTRO'
          ? <div className="encounter-title"><small>통로 인카운터</small><strong>{encounterTitle(encounter)}{enemies.some((enemy) => enemy.id.includes('patrol')) ? ' · 순찰 증원' : ''}</strong></div>
          : <div aria-hidden="true" />}
        <div className="enemy-bars">{enemies.map((unit) => <UnitBar key={unit.id} unit={unit} enemy />)}</div>
      </header>
      <IntentStack snapshot={snapshot} focused={soloLearningTurn} />
      {snapshot.mode === 'PLAYER_TURN' && party.length > 1 && <AllyIntentPanel snapshot={snapshot} />}
      {run.canUseLight && <button type="button" className="light-button" onClick={controller.useLight}>휴대용 조명 사용 · Intent 공개</button>}
      {snapshot.mode !== 'INTRO' && !soloLearningTurn && <CombatTurnBanner snapshot={snapshot} />}
      {snapshot.mode !== 'INTRO' && snapshot.mode !== 'PLAYER_TURN' && snapshot.mode !== 'SEAL_UNLOCKED' && <div className="combat-notice"><span />{snapshot.notice}</div>}
      {snapshot.mode === 'ALLY_TURN' && party.length > 1 && <PolicyReadout snapshot={snapshot} />}
      {firstLearningTurn && (soloLearningTurn ? <SoloCombatGuide snapshot={snapshot} /> : <FirstCombatCue snapshot={snapshot} />)}
      {snapshot.mode === 'PLAYER_TURN' && <CombatControls snapshot={snapshot} controller={controller} onboarding={soloLearningTurn} />}
      {snapshot.mode === 'INTRO' && (prologueEncounter
        ? <div className="encounter-overlay is-prologue"><button type="button" aria-label="첫 전투 시작" onClick={controller.startEncounter}><img src={`${BASE_URL}assets/ui/intent-attack.svg`} alt="" /><kbd>SPACE</kbd></button></div>
        : <div className="encounter-overlay"><div className="encounter-rule" /><p>SCOUTED ENCOUNTER</p><h1>{encounterTitle(encounter)}</h1><span>{snapshot.notice}</span><button type="button" onClick={controller.startEncounter}>전투 시작 <kbd>SPACE</kbd></button></div>
      )}
      {snapshot.mode === 'VICTORY' && (run.isBossEncounter
        ? <div className="result-overlay"><p>BARRIER GUARDIAN DEFEATED</p><h2>봉인이 드러났다</h2><span>관리자만 이 오브젝트의 봉인을 해제할 수 있습니다.</span><button type="button" onClick={controller.unlockSeal}>봉인 해제 <kbd>E</kbd></button></div>
        : <div className="result-overlay"><p>{prologueEncounter ? 'FIRST THREAT BROKEN' : 'PATH SECURED'}</p><h2>{prologueEncounter ? '봉인이 드러났다' : '인카운터 해결'}</h2><span>{prologueEncounter ? '쓰러진 위협 너머의 빛이 다시 움직입니다.' : '현재 HP와 소요 턴이 원정에 유지됩니다.'}</span><button type="button" onClick={controller.completeEncounter}>{prologueEncounter ? '바깥 유적으로 이동' : '통로로 복귀'} <kbd>SPACE</kbd></button></div>
      )}
      {snapshot.mode === 'SEAL_UNLOCKED' && run.isBossEncounter && (
        <div className="result-overlay"><p>SEAL RELEASED</p><h2>결계문이 열렸다</h2><span>네 개 월드 타일의 선택과 전투 결과가 여기까지 이어졌습니다.</span><button type="button" onClick={controller.completeEncounter}>데모 완료 <kbd>SPACE</kbd></button></div>
      )}
      {snapshot.mode === 'DEFEAT' && (
        <div className="result-overlay"><p>EXPEDITION BROKEN</p><h2>전투 불능</h2><span>{run.defeatReturnsToTerritory ? '시간·보급·부상을 남기고 결계 안으로 후퇴합니다.' : '같은 조우를 다시 추첨하지 않고 재정비합니다.'}</span><button type="button" onClick={controller.retryEncounter}>{run.defeatReturnsToTerritory ? '안전 영토로 후퇴' : '같은 인카운터 재시도'} <kbd>SPACE</kbd></button></div>
      )}
    </div>
  );
}

function SoloCombatGuide({ snapshot }: { readonly snapshot: SliceSnapshot }) {
  const planning = snapshot.plannedActions.length > 0;
  if (planning) return null;
  return <aside
    className="solo-combat-guide is-threat"
    data-learning-phase="THREAT"
    aria-label="붉은 공격 범위를 피해 이동"
  >
    <span className="solo-danger-cell" aria-hidden="true"><b>A</b></span><i aria-hidden="true">→</i><span className="solo-move-glyph" aria-hidden="true"><img src={`${BASE_URL}assets/ui/intent-move.svg`} alt="" /></span>
  </aside>;
}

function FirstCombatCue({ snapshot }: { readonly snapshot: SliceSnapshot }) {
  const planning = snapshot.plannedActions.length > 0;
  return <aside className={`first-combat-cue ${planning ? 'is-planned' : ''}`} aria-live="polite">
    <i aria-hidden="true">{planning ? '✓' : '1'}</i>
    <div>{planning
      ? <><strong>반투명 실루엣이 행동 후 위치입니다</strong><small>안전한지 확인한 뒤 SPACE로 실행</small></>
      : <><strong>붉은 공격 칸에서 벗어날 위치를 선택</strong><small>W A S D · 누르면 예정 위치가 먼저 보입니다</small></>}
    </div>
  </aside>;
}

function CombatControls({ snapshot, controller, onboarding = false }: { readonly snapshot: SliceSnapshot; readonly controller: CombatViewController; readonly onboarding?: boolean }) {
  const administrator = snapshot.previewState.units.find((unit) => unit.id === 'administrator-slice2');
  const enemies = snapshot.previewState.units.filter((unit) => snapshot.targetableEnemyIds.includes(unit.id));
  const phase = snapshot.isBusy ? 'EXECUTING' : snapshot.plannedActions.length ? 'PLANNING' : 'INPUT';
  const phaseCopy = phase === 'EXECUTING'
    ? ['3 · 실행 중', '입력이 잠겼습니다']
    : phase === 'PLANNING'
      ? ['2 · 계획 확인', 'SPACE로 실행']
      : ['1 · 행동 선택', '이동 또는 기술을 입력'];
  if (onboarding) {
    const planning = snapshot.plannedActions.length > 0;
    const destinationThreatened = planning && administrator !== undefined && snapshot.previewState.intents.some((intent) => (
      intent.effectCells.some((cell) => cell.x === administrator.position.x && cell.y === administrator.position.y)
    ));
    return <section className={`player-controls solo-learning-controls is-${planning ? 'outcome' : 'threat'}`} data-onboarding-phase={planning ? 'OUTCOME' : 'THREAT'}>
      <div className="solo-learning-actor" aria-label={`주인공 체력 ${administrator?.hp ?? 0}`}>
        <img src={`${BASE_URL}assets/submission/administrator-v1.png`} alt="" />
        <i><b style={{ width: `${(administrator?.hp ?? 0) / Math.max(1, administrator?.maxHp ?? 1) * 100}%` }} /></i>
      </div>
      {!planning
        ? <MovementControl snapshot={snapshot} controller={controller} />
        : <div className={`solo-outcome-controls ${destinationThreatened ? 'is-unsafe' : 'is-safe'}`} data-outcome-safety={destinationThreatened ? 'UNSAFE' : 'SAFE'}>
            <span className="solo-outcome-token" aria-hidden="true">{destinationThreatened ? '!' : '◇'}</span>
            <button type="button" className={`solo-undo-button ${destinationThreatened ? 'is-primary' : ''}`} data-onboarding-primary={destinationThreatened ? 'revise-plan' : undefined} aria-label="예정 이동 되돌리기" onClick={controller.undoLastAction}><span aria-hidden="true">↶</span><kbd>Z</kbd></button>
            {!destinationThreatened && <button type="button" className="solo-execute-button" data-onboarding-primary="execute-plan" aria-label="예정 행동 실행" onClick={controller.confirmPlan}><span aria-hidden="true">▶</span><kbd>SPACE</kbd></button>}
          </div>}
      {snapshot.inputFeedback && <output key={snapshot.inputFeedback.serial} className={`solo-input-feedback is-${snapshot.inputFeedback.kind.toLowerCase()}`} aria-live="polite"><i aria-hidden="true">{snapshot.inputFeedback.kind === 'REJECTED' ? '!' : '✓'}</i><span>{snapshot.inputFeedback.message}</span></output>}
    </section>;
  }
  return (
    <section className={`player-controls phase-${phase.toLowerCase()} ${snapshot.isBusy ? 'is-busy' : ''}`}>
      <div className="plan-strip">
        <div className="plan-phase"><strong>{phaseCopy[0]}</strong><small>{phaseCopy[1]}</small></div>
        <div className="plan-sequence">{enemies.length > 0 && <div className="target-picker"><small>대상</small>{enemies.map((enemy) => <button key={enemy.id} type="button" className={snapshot.selectedTargetId === enemy.id ? 'is-selected' : ''} onClick={() => controller.selectTarget(enemy.id)}>{unitName(enemy)}</button>)}</div>}<div className="plan-actions-preview">{snapshot.plannedActions.length ? snapshot.plannedActions.map((action, index) => <span key={action.id} className="plan-chip"><i>{index + 1}</i>{action.label}</span>) : <span className="plan-empty">아직 입력된 행동 없음</span>}</div></div>
        {snapshot.inputFeedback && <output key={snapshot.inputFeedback.serial} className={`input-feedback is-${snapshot.inputFeedback.kind.toLowerCase()}`}><i aria-hidden="true">{snapshot.inputFeedback.kind === 'REJECTED' ? '!' : snapshot.inputFeedback.kind === 'COMMITTED' ? '▶' : '✓'}</i>{snapshot.inputFeedback.message}</output>}
      </div>
      <MovementControl snapshot={snapshot} controller={controller} caption />
      <div className="action-control"><span className="control-caption">기술</span><div className="skill-row">{snapshot.actions.map((action, index) => <ActionButton key={`${action.id}-${snapshot.inputFeedback?.actionId === action.id ? snapshot.inputFeedback.serial : 0}`} action={action} index={index} busy={snapshot.isBusy} feedbackKind={snapshot.inputFeedback?.actionId === action.id ? snapshot.inputFeedback.kind : undefined} controller={controller} />)}</div></div>
      <div className="turn-control"><div className="ap-readout"><small>ACTION POINT</small><strong>{'◆'.repeat(administrator?.ap ?? 0)}<i>{'◇'.repeat(Math.max(0, (administrator?.maxAp ?? 0) - (administrator?.ap ?? 0)))}</i></strong></div><div className="plan-actions"><button type="button" className="undo-button" disabled={!snapshot.canUndo} onClick={controller.undoLastAction}><span>되돌리기</span><kbd>Z</kbd></button><button type="button" className="end-turn-button" disabled={!snapshot.canConfirm} onClick={controller.confirmPlan}><span>{snapshot.plannedActions.length ? '행동 확정' : '대기'}</span><kbd>SPACE</kbd></button></div></div>
    </section>
  );
}

function MovementControl({ snapshot, controller, caption = false }: { readonly snapshot: SliceSnapshot; readonly controller: CombatViewController; readonly caption?: boolean }) {
  return <div className="movement-control">{caption && <span className="control-caption">이동 <small>AP 1</small></span>}<div className="wasd-grid"><button type="button" disabled={snapshot.isBusy} aria-label="위로 이동" onClick={() => controller.move('UP')}>W</button><button type="button" disabled={snapshot.isBusy} aria-label="왼쪽으로 이동" onClick={() => controller.move('LEFT')}>A</button><button type="button" disabled={snapshot.isBusy} aria-label="아래로 이동" onClick={() => controller.move('DOWN')}>S</button><button type="button" disabled={snapshot.isBusy} aria-label="오른쪽으로 이동" onClick={() => controller.move('RIGHT')}>D</button></div></div>;
}

function ActionButton({ action, index, busy, feedbackKind, controller }: { readonly action: SliceSnapshot['actions'][number]; readonly index: number; readonly busy: boolean; readonly feedbackKind?: 'ACCEPTED' | 'REJECTED' | 'COMMITTED'; readonly controller: CombatViewController }) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const reveal = () => {
    if (tooltipVisible) return;
    setTooltipVisible(true);
    controller.setActionHover(action.id as SliceActionId);
  };
  const conceal = () => {
    setTooltipVisible(false);
    controller.setActionHover();
  };
  return <button type="button" className={`skill-button ${action.executable ? 'is-ready' : 'is-disabled'} ${feedbackKind ? `feedback-${feedbackKind.toLowerCase()}` : ''} ${tooltipVisible ? 'is-tooltip-visible' : ''}`} disabled={busy} data-executable={action.executable} aria-label={`${action.label}, AP ${action.apCost}${action.executable ? ', 사용 가능' : `, ${action.failureMessage ?? '사용 불가'}`}`} onClick={() => controller.useAction(action.id as SliceActionId)} onPointerMove={reveal} onPointerLeave={conceal} onFocus={reveal} onBlur={conceal}><kbd>{index === 0 ? '1 / Q' : index === 1 ? '2 / E' : index === 2 ? '3 / R' : index + 1}</kbd><img src={`${BASE_URL}assets/ui/intent-${action.icon.toLowerCase()}.svg`} alt="" /><strong>{action.label}</strong><small>AP {action.apCost}</small><span className={`skill-state ${action.executable ? 'is-ready' : ''}`}>{action.executable ? '사용 가능' : action.failureMessage ?? '사용 불가'}</span><span className="skill-tooltip"><b>{action.label}</b>{action.description}{!action.executable && <em>{action.failureMessage ?? '현재 계획에서 실행할 수 없습니다.'}</em>}<small>{action.tags.join(' ')}</small></span></button>;
}

function IntentStack({ snapshot, focused = false }: { readonly snapshot: SliceSnapshot; readonly focused?: boolean }) {
  const hidden = new Set(snapshot.concealedIntentIds);
  return <div className={`intent-stack ${focused ? 'is-learning-focus' : ''}`}>{snapshot.previewState.intents.map((intent, index) => <EnemyIntentCard key={intent.id} intent={intent} owner={String.fromCharCode(65 + index)} unit={snapshot.previewState.units.find((unit) => unit.id === intent.sourceId)} concealed={hidden.has(intent.id)} />)}</div>;
}

function EnemyIntentCard({ intent, owner, unit, concealed }: { readonly intent: Intent; readonly owner: string; readonly unit?: Unit; readonly concealed: boolean }) {
  const direction = intent.direction === 'LEFT' ? '서쪽' : intent.direction === 'RIGHT' ? '동쪽' : intent.direction === 'UP' ? '북쪽' : '남쪽';
  if (concealed) {
    return <article className="enemy-intent-card is-concealed" tabIndex={0}><b className="intent-owner">{owner}</b><span className="concealed-glyph">?</span><div className="intent-name"><small>{unitName(unit)}</small><strong>{direction}을 노림</strong></div><span className="intent-anchor-rule">행동·범위 불명</span><span className="intent-card-tooltip" role="tooltip">{owner} 표식 적의 행동입니다. 어둠 때문에 행동 하나가 숨겨졌습니다.</span></article>;
  }
  const movement = intent.movementPath.length;
  const affected = intent.effectCells.length;
  return <article className={`enemy-intent-card ${intent.anchor === 'GROUND' ? 'is-ground' : ''}`} tabIndex={0} aria-label={`${owner} 적, ${intentName(intent.abilityId)}, ${movement ? `${movement}칸 이동 후 ` : ''}${affected}칸 공격`}>
    <b className="intent-owner">{owner}</b>
    <img className="intent-main-icon" src={`${BASE_URL}${intentIcon(intent.abilityId)}`} alt="" />
    <div className="intent-name"><small>{unitName(unit)}</small><strong>{intentName(intent.abilityId)}</strong></div>
    <div className="intent-sequence">
      {movement > 0 && <><span><img src={`${BASE_URL}assets/ui/intent-move.svg`} alt="" /><b>이동 {movement}</b></span><i>→</i></>}
      <span><img src={`${BASE_URL}${intentIcon(intent.abilityId)}`} alt="" /><b>{intent.anchor === 'GROUND' ? '착탄' : '공격'} {affected}</b></span>
    </div>
    <span className="intent-anchor-rule">{intent.anchor === 'GROUND' ? '표시된 땅에 고정' : '적의 도착점에서 발동'}</span>
    <span className="intent-card-tooltip" role="tooltip">{owner} 표식 적 · {intentDetail(intent.abilityId)} · {direction} 방향.</span>
  </article>;
}

function PolicyReadout({ snapshot }: { readonly snapshot: SliceSnapshot }) {
  return <div className="ally-turn-readout"><div className="ally-policy-slots">{snapshot.policy.map((id, index) => <span key={`${id}-${index}`} className={snapshot.activePolicyStep?.selectedPolicyId === id ? 'is-active' : id === 'EMPTY' ? 'is-empty' : ''}><i>{index + 1}</i>{POLICY_COPY[id].name}</span>)}</div>{snapshot.activePolicyStep && <div className="ally-action-result"><strong>{snapshot.activePolicyStep.selectedName}</strong><small>{snapshot.activePolicyStep.reason}</small></div>}</div>;
}

function AllyIntentPanel({ snapshot }: { readonly snapshot: SliceSnapshot }) {
  const steps = snapshot.allyIntent?.steps ?? [];
  return <details className="ally-intent-panel">
    <summary aria-label="동료 예정 행동 펼치기"><span>ALLY</span><div>{steps.length ? steps.map((step, index) => <img key={`${step.id}-${index}`} src={`${BASE_URL}assets/ui/intent-${step.icon.toLowerCase()}.svg`} alt={step.label} />) : <b>—</b>}</div><i aria-hidden="true">⌄</i></summary>
    <header><div><small>ALLY PLAN · LOCKED FORECAST</small><strong>원거리 동료</strong></div><span>{snapshot.plannedActions.length ? '내 계획 반영' : '현재 상태 기준'}</span></header>
    <div className="ally-intent-sequence">{steps.length
      ? steps.map((step, index) => <div key={`${step.id}-${index}`} className="ally-intent-step" tabIndex={0}><i>{index + 1}</i><img src={`${BASE_URL}assets/ui/intent-${step.icon.toLowerCase()}.svg`} alt="" /><div><strong>{step.label}</strong><small>{step.description}</small></div>{step.damage !== undefined && <b>피해 {step.damage}</b>}</div>)
      : <p>실행 가능한 전술이 없어 대기합니다.</p>}
    </div>
  </details>;
}

function CombatTurnBanner({ snapshot }: { readonly snapshot: SliceSnapshot }) {
  const labels = { PLAYER_TURN: '<내 턴>', ALLY_TURN: '<아군 턴>', ENEMY_TURN: '<적 턴>', VICTORY: '<승리>', DEFEAT: '<전멸>' } as const;
  const label = labels[snapshot.mode as keyof typeof labels];
  return label ? <div className={`turn-banner turn-banner-${snapshot.mode.toLowerCase()}`}><span /><div><strong>{label}</strong><small>TURN {snapshot.state.turn}</small></div><span /></div> : null;
}

function RunHud({ snapshot }: { readonly snapshot: ReturnType<Slice2RunController['getSnapshot']> }) {
  const learnedRun = snapshot.elapsedBattleTurns > 0 || snapshot.currentTileIndex > 0;
  return <aside className={`run-hud ${learnedRun ? 'is-expanded' : 'is-focused'}`}>
    {learnedRun && <div className="run-route">{snapshot.world.tiles.map((tile, index) => <span key={tile.id} className={`${index === snapshot.currentTileIndex ? 'is-current' : ''} ${tile.cleared ? 'is-cleared' : ''}`}><i>{index + 1}</i>{tile.name}</span>)}</div>}
    <div className="run-stats"><strong className={snapshot.isNight ? 'is-night' : ''}>{snapshot.worldTime}</strong>{learnedRun && <><b aria-label={`물 ${snapshot.supplies.water}/2`}><img src={`${BASE_URL}assets/ui/supply-water.svg`} alt="" />{snapshot.supplies.water}/2</b><b aria-label={`식량 ${snapshot.supplies.food}/2`}><img src={`${BASE_URL}assets/ui/supply-ration.svg`} alt="" />{snapshot.supplies.food}/2</b><b aria-label={`조명 ${snapshot.supplies.light}`}><img src={`${BASE_URL}assets/ui/supply-light.svg`} alt="" />{snapshot.supplies.light}</b><small>이동 {snapshot.elapsedTravel} · 전투 {snapshot.elapsedBattleTurns}턴 · 사건 {snapshot.elapsedEventMinutes}분</small></>}</div>
  </aside>;
}

function ExpeditionPartyPanel({ snapshot, controller }: {
  readonly snapshot: ReturnType<Slice2RunController['getSnapshot']>;
  readonly controller: Slice2RunController;
}) {
  const [open, setOpen] = useState(false);
  return <aside className={`expedition-party ${open ? 'is-open' : ''}`}>
    <button type="button" className="party-toggle" aria-label="파티 정보와 동료 전술 열기" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <img src={`${BASE_URL}assets/slice1/administrator-v2.png`} alt="관리자" />
      <img src={`${BASE_URL}assets/slice1/archer-v2.png`} alt="원거리 동료" />
      <span>☰</span>
    </button>
    {open && <div className="party-sheet">
      <header><b>PARTY</b><button type="button" aria-label="닫기" onClick={() => setOpen(false)}>×</button></header>
      <section className="party-member"><img src={`${BASE_URL}assets/slice1/administrator-v2.png`} alt="" /><div><strong>관리자</strong><span className="member-hp"><i style={{ width: `${snapshot.vitals.administratorHp / 14 * 100}%` }} /></span><small>{snapshot.vitals.administratorHp}/14</small><p><img src={`${BASE_URL}assets/ui/intent-push.svg`} alt="밀치기" /><img src={`${BASE_URL}assets/ui/intent-attack.svg`} alt="내려찍기" /><img src={`${BASE_URL}assets/ui/intent-intercept.svg`} alt="가로막기" /></p></div></section>
      <section className="party-member ally"><img src={`${BASE_URL}assets/slice1/archer-v2.png`} alt="" /><div><strong>원거리 동료</strong><span className="member-hp"><i style={{ width: `${snapshot.vitals.allyHp / 12 * 100}%` }} /></span><small>{snapshot.vitals.allyHp}/12</small></div></section>
      <PolicyEvidence snapshot={snapshot} />
      <p className="policy-rule"><b>1 → 5</b> 위에서부터 실행 가능한 첫 전술을 선택</p>
      <ol className="policy-editor" aria-label="동료 전술 우선순위">{snapshot.policy.map((id, index) => <li key={id}><b>{index + 1}</b>{id === 'EMPTY' ? <span className="policy-empty">—</span> : <img src={`${BASE_URL}assets/ui/intent-${policyIcon(id)}.svg`} alt="" />}<span>{POLICY_COPY[id].name}</span><div><button type="button" disabled={index === 0} aria-label={`${POLICY_COPY[id].name} 위로`} onClick={() => controller.movePolicy(index, -1)}>↑</button><button type="button" disabled={index === snapshot.policy.length - 1} aria-label={`${POLICY_COPY[id].name} 아래로`} onClick={() => controller.movePolicy(index, 1)}>↓</button></div></li>)}</ol>
    </div>}
  </aside>;
}

function PolicyEvidence({ snapshot }: { readonly snapshot: ReturnType<Slice2RunController['getSnapshot']> }) {
  const comparison = snapshot.policyComparison;
  const summary = snapshot.lastPolicySummary;
  if (!summary) return null;
  const ids = ['EVADE', 'POSITION', 'SHOOT', 'PUSH'] as const;
  if (comparison) {
    return <section className="policy-evidence policy-comparison" aria-label="정책 변경 전후 실제 행동 비교">
      <header><b>정책 변경 확인</b><small>서로 다른 조우의 실제 행동</small></header>
      <div className="policy-compare-row"><i>전</i>{ids.map((id) => <span key={id}><img src={`${BASE_URL}assets/ui/intent-${policyIcon(id)}.svg`} alt={POLICY_COPY[id].name} /><b>{comparison.before.selectedCounts[id] ?? 0}</b></span>)}<em>{comparison.before.turns}턴</em></div>
      <div className="policy-compare-row is-after"><i>후</i>{ids.map((id) => <span key={id}><img src={`${BASE_URL}assets/ui/intent-${policyIcon(id)}.svg`} alt={POLICY_COPY[id].name} /><b>{comparison.after.selectedCounts[id] ?? 0}</b></span>)}<em>{comparison.after.turns}턴</em></div>
    </section>;
  }
  return <section className="policy-evidence" aria-label="직전 전투 동료 행동 근거">
    <header><b>직전 전투 · {summary.turns}턴</b><small>실행 횟수</small></header>
    <div className="policy-counts">{ids.filter((id) => summary.selectedCounts[id]).map((id) => <span key={id}><img src={`${BASE_URL}assets/ui/intent-${policyIcon(id)}.svg`} alt="" />{POLICY_COPY[id].name} <b>{summary.selectedCounts[id]}</b></span>)}</div>
    {summary.primaryBlocked && <p><b>{POLICY_COPY[summary.primaryBlocked.policyId].name}</b> · {summary.primaryBlocked.reason} <em>×{summary.primaryBlocked.count}</em></p>}
  </section>;
}

function UnitBar({ unit, enemy = false }: { readonly unit: Unit; readonly enemy?: boolean }) {
  const ratio = Math.max(0, unit.hp / Math.max(1, unit.maxHp));
  return <article className={`slice2-unit-bar ${enemy ? 'is-enemy' : ''} ${unit.rank === 'ELITE' ? 'is-elite' : ''}`}><strong>{unit.rank === 'ELITE' ? `정예 · ${unitName(unit)}` : unitName(unit)}</strong><div><i style={{ width: `${ratio * 100}%` }} /></div><small>{unit.hp}/{unit.maxHp}</small></article>;
}

function policyIcon(id: keyof typeof POLICY_COPY): string {
  if (id === 'SHOOT') return 'shoot';
  if (id === 'PUSH') return 'push';
  return 'move';
}

function nodeGlyph(nodeId: string, content: EncounterContent | undefined, visible: boolean, resolved: boolean): ReactNode {
  if (nodeId === 'room-center') return resolved ? '✓' : '⌂';
  if (nodeId === 'room-east') return '🚪';
  if (nodeId === 'room-west') return '↩';
  if (nodeId.startsWith('room-')) return '⌂';
  if (!visible) return '?';
  if (resolved || content === 'NONE') return '·';
  if (content === 'RECOVERY_CACHE') return '+';
  if (content === 'WATER_CACHE') return <img src={`${BASE_URL}assets/ui/supply-water.svg`} alt="물 보급" />;
  if (content === 'RATION_CACHE') return <img src={`${BASE_URL}assets/ui/supply-ration.svg`} alt="식량 보급" />;
  if (content === 'ROOT_SNARE') return '!';
  return '⚔';
}

function encounterTitle(content?: EncounterContent): string {
  const copy: Partial<Record<EncounterContent, string>> = { GOBLIN_ARCHER: '고블린 궁수', GOBLIN_WARRIOR: '고블린 전사', GOBLIN_BOMBER: '고블린 투척병', GOBLIN_ARCHER_WARRIOR: '궁수와 단검 전사', GOBLIN_ARCHER_BOMBER: '궁수와 투척병', GOBLIN_TRIO: '고블린 봉쇄조', GOBLIN_RUSH_SQUAD: '쌍단검 돌격대', GOBLIN_BOMBARDMENT: '포자 포격 호위대', GOBLIN_FIRELINE: '이중 사격 봉쇄선', BARRIER_GUARDIAN: '결계 수호자' };
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
  if (unit.id.includes('barrier-guardian')) return '결계 수호자';
  if (unit.id.includes('guardian-hound')) return '추적 하수인';
  return unit.faction === 'ENEMY' ? '적' : '아군';
}

function intentName(id?: string): string {
  if (id === 'goblin-long-shot') return '장거리 사격';
  if (id === 'goblin-rush') return '단검 쇄도';
  if (id === 'goblin-bomb') return '포자 폭탄';
  if (id === 'guardian-crush') return '제압';
  if (id === 'guardian-rupture') return '외침';
  if (id === 'guardian-summon') return '하수인 소환';
  if (id === 'minion-charge') return '돌진';
  return '공격';
}

function intentDetail(id?: string): string {
  if (id === 'goblin-long-shot') return '최소 사거리 밖의 첫 노출 대상에게 피해 1';
  if (id === 'goblin-rush') return '표시 경로로 접근한 뒤 전방을 공격';
  if (id === 'goblin-bomb') return '표시된 지면을 다음 적 턴에 폭격';
  if (id === 'guardian-crush') return '2칸 이동 뒤 전방 한 칸에 피해 6';
  if (id === 'guardian-rupture') return '전방 5칸과 세 행을 덮으며 근거리 공격으로 중단 가능';
  if (id === 'guardian-summon') return '원거리 동료를 추적하는 하수인 소환';
  if (id === 'minion-charge') return '원거리 동료를 향해 3칸 돌진';
  return '표시된 범위에 공격';
}

function intentIcon(id?: string): string {
  if (id === 'goblin-long-shot') return 'assets/ui/intent-shoot.svg';
  if (id === 'goblin-rush') return 'assets/ui/intent-move.svg';
  return 'assets/ui/intent-attack.svg';
}
