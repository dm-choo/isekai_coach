import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { type SliceActionId } from '../game/slice';
import {
  SubmissionController,
  SUBMISSION_FRONTIER_ROUTES,
  computeBarrierContour,
  parseSubmissionSave,
  type SubmissionFrontierChoiceSnapshot,
  type SubmissionFrontierRouteSpec,
  type SubmissionSnapshot,
  type SubmissionPolicyChoice,
  type SubmissionTileState,
} from '../game/submission';
import { CombatStage, preloadCombatPresentation } from './Slice2App';

const BASE_URL = import.meta.env.BASE_URL;
const SUBMISSION_SAVE_KEY = 'isekai-coach:submission:v3';
const LEGACY_SUBMISSION_SAVE_KEY = 'isekai-coach:submission:v2';

export function SubmissionApp() {
  const combatPresentationReady = useRef(false);
  const handleCombatPresentationReadyChange = useCallback((ready: boolean) => {
    combatPresentationReady.current = ready;
  }, []);
  const query = new URLSearchParams(window.location.search);
  const verification = import.meta.env.DEV && query.has('verify');
  const failureFixture = verification && query.has('failure');
  const policyFixture = verification && query.has('policy');
  const [controller] = useState(() => {
    const saveData = verification
      ? undefined
      : parseSubmissionSave(window.localStorage.getItem(SUBMISSION_SAVE_KEY))
        ?? parseSubmissionSave(window.localStorage.getItem(LEGACY_SUBMISSION_SAVE_KEY));
    return new SubmissionController(verification
      ? { playbackSpeed: 12, phaseDelayScale: policyFixture ? 1 : 0.03, ...(failureFixture ? { initialVitals: { administratorHp: 1, allyHp: 1 } } : {}) }
      : saveData ? { saveData } : {});
  });
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  useEffect(() => () => controller.destroy(), [controller]);
  useEffect(() => {
    if (snapshot.mode !== 'SOLO_APPROACH') return;
    preloadCombatPresentation('SUBMISSION');
  }, [snapshot.mode]);
  useEffect(() => {
    if (snapshot.mode !== 'COMBAT') combatPresentationReady.current = false;
  }, [snapshot.mode]);
  useEffect(() => {
    if (verification) return;
    const save = controller.exportSave();
    if (save) window.localStorage.setItem(SUBMISSION_SAVE_KEY, JSON.stringify(save));
  }, [controller, snapshot, verification]);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__ISEKAI_COACH_SUBMISSION__ = { snapshot };
    return () => { delete window.__ISEKAI_COACH_SUBMISSION__; };
  }, [snapshot]);
  useEffect(() => {
    if (!import.meta.env.DEV || !snapshot.combat) return;
    window.__ISEKAI_COACH_COMBAT__ = { snapshot: snapshot.combat };
    return () => { delete window.__ISEKAI_COACH_COMBAT__; };
  }, [snapshot.combat]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const current = snapshotRef.current;
      if (event.repeat) return;
      if (current.mode === 'COMBAT' && !combatPresentationReady.current) return;
      if (event.key === ' ') {
        if (controller.performPrimaryAction()) event.preventDefault();
        return;
      }
      if (current.mode === 'POLICY_REVIEW') {
        if (['1', 'q', 'Q'].includes(event.key)) {
          event.preventDefault();
          controller.choosePolicy('PUSH_FIRST');
        } else if (['2', 'e', 'E'].includes(event.key)) {
          event.preventDefault();
          controller.choosePolicy('KEEP_RANGE');
        }
        return;
      }
      if (current.mode === 'EXPANDED') {
        if (['w', 'W', 'ArrowUp'].includes(event.key)) {
          if (controller.selectFrontier('frontier-north')) event.preventDefault();
        } else if (['d', 'D', 'ArrowRight'].includes(event.key)) {
          if (controller.selectFrontier('next-east')) event.preventDefault();
        }
        return;
      }
      if (current.mode !== 'COMBAT' || current.combat?.mode !== 'PLAYER_TURN') return;
      const directions = { w: 'UP', ArrowUp: 'UP', a: 'LEFT', ArrowLeft: 'LEFT', s: 'DOWN', ArrowDown: 'DOWN', d: 'RIGHT', ArrowRight: 'RIGHT' } as const;
      const direction = directions[event.key as keyof typeof directions];
      if (direction) {
        event.preventDefault();
        controller.move(direction);
      } else if (['1', 'q', 'Q'].includes(event.key)) {
        event.preventDefault();
        const action = current.combat.actions[0];
        if (action) controller.useAction(action.id as SliceActionId);
      } else if (['2', 'e', 'E'].includes(event.key)) {
        event.preventDefault();
        const action = current.combat.actions[1];
        if (action) controller.useAction(action.id as SliceActionId);
      } else if (['3', 'r', 'R'].includes(event.key)) {
        event.preventDefault();
        const action = current.combat.actions[2];
        if (action) controller.useAction(action.id as SliceActionId);
      } else if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        controller.undoLastAction();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controller]);

  return (
    <main className="submission-shell">
      <section className="submission-world" aria-label="결계를 확장하는 첫 원정">
        {snapshot.mode === 'COMBAT' && snapshot.combat
          ? <CombatStage
              snapshot={snapshot.combat}
              run={snapshot}
              controller={controller}
              encounter={snapshot.encounterContent}
              visualTheme="SUBMISSION"
              prologueEncounter={snapshot.encounterId === 'SOLO_WARRIOR'}
              onPresentationReadyChange={handleCombatPresentationReadyChange}
            />
          : snapshot.mode === 'AWAKENING' || snapshot.mode === 'SOLO_APPROACH'
            ? <PrologueStage snapshot={snapshot} controller={controller} />
            : snapshot.mode === 'COMPANION_SEALED' || snapshot.mode === 'COMPANION_JOINED'
              ? <CompanionStage snapshot={snapshot} controller={controller} />
          : snapshot.mode === 'CORRIDOR' || snapshot.mode === 'CENTER_GATE'
            ? <CorridorStage snapshot={snapshot} controller={controller} />
            : snapshot.mode === 'SCOUTED'
              ? <ScoutedStage snapshot={snapshot} controller={controller} />
              : snapshot.mode === 'POLICY_REVIEW'
                ? <PolicyReviewStage snapshot={snapshot} controller={controller} />
                : snapshot.mode === 'DELEGATION_PLAN'
                  ? <DelegationPlanStage snapshot={snapshot} controller={controller} />
                  : snapshot.mode === 'DELEGATION_RESULT'
                    ? <DelegationResultStage snapshot={snapshot} controller={controller} />
                    : snapshot.mode === 'ANCHOR_APPROACH' || snapshot.mode === 'ANCHOR_READY'
                      ? <AnchorApproachStage snapshot={snapshot} controller={controller} />
                      : snapshot.mode === 'EXPANDED'
                        ? <ExpandedStage snapshot={snapshot} controller={controller} />
                        : snapshot.mode === 'COMPLETE'
                          ? <CompleteStage snapshot={snapshot} controller={controller} />
                        : <TerritoryStage snapshot={snapshot} onStart={controller.performPrimaryAction} />}
        {snapshot.mode !== 'COMBAT' && snapshot.companionJoined && <SubmissionHud snapshot={snapshot} />}
      </section>
    </main>
  );
}

function PrologueStage({ snapshot, controller }: {
  readonly snapshot: SubmissionSnapshot;
  readonly controller: SubmissionController;
}) {
  const activeTimer = useRef<number | undefined>(undefined);
  const stop = () => {
    if (activeTimer.current !== undefined) window.clearInterval(activeTimer.current);
    activeTimer.current = undefined;
  };
  const start = () => {
    stop();
    controller.advancePrologue();
    activeTimer.current = window.setInterval(controller.advancePrologue, 92);
  };
  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.repeat || (event.key.toLowerCase() !== 'd' && event.key !== 'ArrowRight')) return;
      event.preventDefault();
      start();
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'd' || event.key === 'ArrowRight') stop();
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', stop);
    return () => {
      stop();
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', stop);
    };
  }, [controller]);

  const progress = snapshot.prologueProgress / 100;
  return <div className="submission-prologue" data-submission-stage="awakening">
    <div className="prologue-background" style={{ backgroundPositionX: `${progress * -6}%` }} />
    <div className="prologue-depth" />
    <div className="prologue-safe-pulse" aria-hidden="true" />
    <div className="prologue-protagonist" style={{ left: `${22 + progress * 31}%` }}>
      <img src={`${BASE_URL}assets/submission/administrator-v1.png`} alt="주인공" />
      <i aria-hidden="true" />
    </div>
    <button
      type="button"
      className="prologue-move-control"
      data-submission-primary="advance-prologue"
      data-primary-key="D"
      aria-label="오른쪽 길로 이동"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
    ><kbd>D</kbd><span aria-hidden="true">→</span></button>
    <div className="prologue-distance" aria-label={`바깥 경로 ${snapshot.prologueProgress}% 이동`}><i style={{ width: `${snapshot.prologueProgress}%` }} /></div>
  </div>;
}

function CompanionStage({ snapshot, controller }: {
  readonly snapshot: SubmissionSnapshot;
  readonly controller: SubmissionController;
}) {
  const sealed = snapshot.mode === 'COMPANION_SEALED';
  useEffect(() => {
    if (sealed) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || (event.key.toLowerCase() !== 'd' && event.key !== 'ArrowRight')) return;
      event.preventDefault();
      controller.startExpedition();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controller, sealed]);

  return <div className={`submission-companion ${sealed ? 'is-sealed' : 'is-joined'}`} data-submission-stage={sealed ? 'companion-sealed' : 'companion-joined'}>
    <div className="companion-background" />
    <div className="companion-depth" />
    <div className="companion-protagonist"><img src={`${BASE_URL}assets/submission/administrator-v1.png`} alt="주인공" /><i /></div>
    <div className="companion-archer"><img src={`${BASE_URL}assets/submission/archer-v1.png`} alt="원거리 동료" /><i /></div>
    {sealed
      ? <button type="button" className="companion-seal-control" data-submission-primary="release-companion" data-primary-key="SPACE" aria-label="봉인된 동료 해방" onClick={controller.releaseCompanion}>
          <span aria-hidden="true"><i /><i /><i /></span><kbd>SPACE</kbd>
        </button>
      : <button type="button" className="companion-depart-control" data-submission-primary="depart-with-companion" data-primary-key="D" aria-label="동료와 함께 오른쪽 길로 이동" onClick={controller.startExpedition}><kbd>D</kbd><span aria-hidden="true">→</span></button>}
  </div>;
}

function TerritoryStage({ snapshot, onStart }: { readonly snapshot: SubmissionSnapshot; readonly onStart: () => void }) {
  const contour = useMemo(() => computeBarrierContour(snapshot.world), [snapshot.world]);
  const retreated = snapshot.defeatCount > 0 && snapshot.lastDefeatCost;
  return <div className="territory-stage is-intro">
    <div className="submission-sky" />
    <div className="submission-canopy" />
    <div className="world-copy">
      <small>{retreated ? 'SAFE TERRITORY · RETREAT' : 'THE FIRST BOUNDARY'}</small>
      <h1>{retreated ? <>상처를 안고<br />돌아왔다.</> : <>이 선 안이<br />지금의 세계다.</>}</h1>
      <p>{retreated ? '같은 위협은 같은 위치에 남아 있다.' : '동쪽에서 오래 멈춘 물소리가 들린다.'}</p>
    </div>
    <div className="tile-field">
      {snapshot.world.tiles.map((tile) => <WorldTile key={tile.id} tile={tile} />)}
      {contour.map((segment) => <i key={segment.id} className={`barrier-edge is-${segment.edge.toLowerCase()}`} style={tilePosition(segment.x, segment.y)} />)}
      <div className="world-party" style={tilePosition(0, 0)}>
        <img src={`${BASE_URL}assets/submission/administrator-v1.png`} alt="관리자" />
        <img src={`${BASE_URL}assets/submission/archer-v1.png`} alt="원거리 동료" />
        <span>현재 위치</span>
      </div>
    </div>
    <button type="button" className="primary-expedition" data-submission-primary="start-expedition" data-primary-key="SPACE" aria-label={retreated ? '동쪽 경계 재진입' : '동쪽 경계 조사 시작'} onClick={onStart}>
      <span><small>{retreated ? '같은 경로 · 위협 재추첨 없음' : '다음 행동'}</small><strong>{retreated ? '동쪽 경계 재진입' : '동쪽 경계 조사'}</strong></span><kbd>SPACE</kbd>
    </button>
    <footer className="submission-footer"><p><i /> 결계 안 · 안전</p><span>{retreated ? `${snapshot.lastDefeatCost?.elapsedMinutes}분 · 물 ${snapshot.lastDefeatCost?.waterSpent} · 식량 ${snapshot.lastDefeatCost?.foodSpent} · 부상 유지` : '보이는 땅도 확보하기 전에는 내 영토가 아니다.'}</span></footer>
  </div>;
}

function CorridorStage({ snapshot, controller }: { readonly snapshot: SubmissionSnapshot; readonly controller: SubmissionController }) {
  const activeTimer = useRef<number | undefined>(undefined);
  const stop = () => {
    if (activeTimer.current !== undefined) window.clearInterval(activeTimer.current);
    activeTimer.current = undefined;
  };
  const start = () => {
    stop();
    controller.advanceCorridor();
    activeTimer.current = window.setInterval(controller.advanceCorridor, 78);
  };
  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.repeat || (event.key.toLowerCase() !== 'd' && event.key !== 'ArrowRight')) return;
      event.preventDefault();
      start();
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'd' || event.key === 'ArrowRight') stop();
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', stop);
    return () => {
      stop();
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', stop);
    };
  }, [controller]);
  useEffect(() => stop, [snapshot.mode]);

  const route = snapshot.currentRoute;
  const progress = snapshot.corridorProgress / route.distanceMeters;
  const remainingMeters = route.distanceMeters - snapshot.corridorProgress;
  const distanceMarks = routeDistanceMarks(route.distanceMeters);
  const directionName = routeDirectionName(route);
  const atGate = snapshot.mode === 'CENTER_GATE';
  return <div className={`submission-corridor is-${route.direction.toLowerCase()} ${atGate ? 'is-gate' : ''}`} data-route-id={route.id} data-route-distance={route.distanceMeters} data-route-threats={route.threatCount}>
    <div className="corridor-moving-backdrop" style={{ backgroundPositionX: `${progress * -980}px` }} />
    <div className="corridor-moving-ground" style={{ backgroundPositionX: `${progress * -720}px` }} />
    <div className="corridor-shade" />
    <div className="submission-travel-copy"><small>{directionName} 통로 · {route.distanceMeters}m</small><strong>{atGate ? '중앙 방 도착' : '미정찰 통로'}</strong></div>
    <div className="submission-travel-party"><img src={`${BASE_URL}assets/submission/administrator-v1.png`} alt="관리자" /><img src={`${BASE_URL}assets/submission/archer-v1.png`} alt="원거리 동료" /></div>
    <div className="submission-destination"><i>◇</i><span>{atGate ? '중앙 방' : `${remainingMeters}m`}</span></div>
    <div className="submission-distance" aria-label={`${directionName} ${route.distanceMeters}미터 통로 중 ${snapshot.corridorProgress}미터 이동`}><i style={{ width: `${progress * 100}%` }} />{distanceMarks.map((meter) => <b key={meter} style={{ left: `${meter / route.distanceMeters * 100}%` }} />)}<span>{snapshot.corridorProgress} / {route.distanceMeters}m</span></div>
    {atGate
      ? <button type="button" className="corridor-primary" data-submission-primary="enter-center" data-primary-key="SPACE" onClick={controller.performPrimaryAction}><span><small>발소리 {route.threatCount} · 출구 4</small><strong>중앙 방 진입</strong></span><kbd>SPACE</kbd></button>
      : <button type="button" className="corridor-primary hold-control" data-submission-primary="advance-corridor" data-primary-key="D" onPointerDown={start} onPointerUp={stop} onPointerLeave={stop}><span><small>누르는 동안 이동</small><strong>{directionName}으로 전진</strong></span><kbd>D</kbd></button>}
    <div className="submission-travel-notice" role="status"><i />{snapshot.notice}</div>
  </div>;
}

function ScoutedStage({ snapshot, controller }: { readonly snapshot: SubmissionSnapshot; readonly controller: SubmissionController }) {
  const restRequired = snapshot.preDelegationRestRequired;
  const route = snapshot.currentRoute;
  const threatDirections = route.threatCount === 1 ? [route.direction] : ['EAST', 'NORTH'] as const;
  return <div className="submission-scouted">
    <div className="submission-sky" /><div className="submission-canopy" />
    <div className="scout-map" data-scout-map-state="FOUR_CORRIDORS_SCOUTED" data-route-id={route.id} data-known-threats={route.threatCount} aria-label={`확보한 중앙 방에서 정찰된 북쪽, 동쪽, 남쪽, 서쪽 통로와 위협 ${route.threatCount}개`}>
      <span className="scout-line is-north" /><span className="scout-line is-east" /><span className="scout-line is-south" /><span className="scout-line is-west" />
      <i className="scout-room is-north" aria-label="북쪽 방"><span /></i><i className="scout-room is-east" aria-label="동쪽 방"><span /></i><i className="scout-room is-south" aria-label="남쪽 방"><span /></i><i className="scout-room is-west" aria-label="서쪽 방"><span /></i>
      <strong className="scout-center"><b>✓</b><small>중앙 방</small></strong>
      {threatDirections.map((direction, index) => <em key={`${direction}:${index}`} className={`scout-threat is-${direction.toLowerCase()}`} aria-label={`${direction === 'NORTH' ? '북쪽' : '동쪽'}에서 발견한 위협`}><img src={`${BASE_URL}assets/ui/intent-attack.svg`} alt="" /></em>)}
    </div>
    <aside className="scout-policy-hook" aria-label="인접한 적 때문에 동료 사격이 막힌 전투 기록">
      <span className="scout-hook-ally"><img src={`${BASE_URL}assets/submission/archer-v1.png`} alt="원거리 동료" /></span>
      <i className="scout-hook-distance" aria-hidden="true">1</i>
      <span className="scout-hook-enemy"><img src={`${BASE_URL}assets/submission/goblin-warrior-v1.png`} alt="인접한 고블린 전사" /></span>
      <b className="scout-hook-blocked" aria-hidden="true"><img src={`${BASE_URL}assets/ui/intent-shoot.svg`} alt="" /><i /></b>
      <em aria-hidden="true" />
      <span className="scout-record-glyph" aria-hidden="true"><i /><i /><b /></span>
    </aside>
    {restRequired
      ? <button type="button" className="submission-flow-primary is-icon-first scout-rest-primary" data-submission-primary="rest-at-center" data-primary-key="SPACE" data-rest-minutes="20" data-rest-heal="3" aria-label="안전한 중앙 방에서 물과 식량 하나씩 사용하고 20분 동안 휴식해 체력을 3 회복" onClick={controller.performPrimaryAction}><span className="scout-rest-costs"><span className="scout-rest-supplies"><img src={`${BASE_URL}assets/ui/supply-water.svg`} alt="" /><img src={`${BASE_URL}assets/ui/supply-ration.svg`} alt="" /><b>−1</b></span><span className="scout-rest-time"><i className="delegation-clock-glyph" /><b>20</b></span></span><i className="flow-forward" aria-hidden="true" /><span className="scout-rest-heart"><i /><b>+3</b></span><kbd>SPACE</kbd></button>
      : <button type="button" className="submission-flow-primary is-icon-first" data-submission-primary="review-record" data-primary-key="SPACE" aria-label="전투 기록을 열어 동료 정책 검토" onClick={controller.performPrimaryAction}><span className="scout-record-glyph" aria-hidden="true"><i /><i /><b /></span><i className="flow-forward" aria-hidden="true" /><kbd>SPACE</kbd></button>}
  </div>;
}

function PolicyReviewStage({ snapshot, controller }: { readonly snapshot: SubmissionSnapshot; readonly controller: SubmissionController }) {
  const shootBlocked = snapshot.lastCombatSummary?.blockedByPolicy.SHOOT;
  const choices: readonly { id: SubmissionPolicyChoice; key: string; title: string; icon: string; effect: string }[] = [
    { id: 'PUSH_FIRST', key: '1', title: '가까우면 먼저 밀친다', icon: 'intent-push.svg', effect: 'PUSH_4_TO_1' },
    { id: 'KEEP_RANGE', key: '2', title: '사격 거리를 계속 지킨다', icon: 'intent-move.svg', effect: 'KEEP_DISTANCE_3' },
  ];
  const defaultPolicy = ['EVADE', 'POSITION', 'SHOOT', 'PUSH', 'EMPTY'] as const;
  const changedPolicyId = snapshot.policyChoice === 'PUSH_FIRST' ? 'PUSH' : snapshot.policyChoice === 'KEEP_RANGE' ? 'POSITION' : undefined;
  return <div className="submission-policy-review">
    <div className="submission-sky" /><div className="submission-canopy" />
    <section className="policy-record-scene" data-policy-evidence="ADJACENT_SHOOT_BLOCKED" data-blocked-count={shootBlocked?.count ?? 0} aria-label={`직전 전투에서 적이 거리 1까지 접근해 사격이 ${shootBlocked?.count ?? 0}회 막힘`}>
      <header aria-hidden="true"><span className="scout-record-glyph"><i /><i /><b /></span><i /><b>×{shootBlocked?.count ?? 0}</b></header>
      <div className="policy-spatial-lane is-record" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => <i key={index} />)}
        <span className="policy-lane-unit is-ally"><img src={`${BASE_URL}assets/submission/archer-v1.png`} alt="" /></span>
        <span className="policy-lane-unit is-enemy"><img src={`${BASE_URL}assets/submission/goblin-warrior-v1.png`} alt="" /></span>
        <b className="policy-one-cell">1</b>
        <span className="policy-blocked-shot"><img src={`${BASE_URL}assets/ui/intent-shoot.svg`} alt="" /><i /></span>
      </div>
      <output className="policy-record-fact"><span><img src={`${BASE_URL}assets/ui/intent-shoot.svg`} alt="" /><i /></span><b>1 &lt; 3</b><small>{shootBlocked?.reason ?? '유효 사거리에 적이 없음'}</small></output>
    </section>
    <section className="policy-spatial-choices" data-policy-selection={snapshot.policyChoice ?? 'NONE'}>
      <div className="policy-choice-list">{choices.map((choice) => <button key={choice.id} type="button" data-policy-choice={choice.id} data-policy-effect={choice.effect} className={snapshot.policyChoice === choice.id ? 'is-selected' : ''} aria-pressed={snapshot.policyChoice === choice.id} onClick={() => controller.choosePolicy(choice.id)}>
        <kbd>{choice.key}</kbd>
        <div className={`policy-spatial-lane is-choice is-${choice.id.toLowerCase()}`} aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => <i key={index} />)}
          <span className="policy-choice-ally is-before"><img src={`${BASE_URL}assets/submission/archer-v1.png`} alt="" /></span>
          <span className="policy-choice-ally is-after"><img src={`${BASE_URL}assets/submission/archer-v1.png`} alt="" /></span>
          <span className="policy-choice-enemy is-before"><img src={`${BASE_URL}assets/submission/goblin-warrior-v1.png`} alt="" /></span>
          <span className="policy-choice-enemy is-after"><img src={`${BASE_URL}assets/submission/goblin-warrior-v1.png`} alt="" /></span>
          <b><img src={`${BASE_URL}assets/ui/${choice.icon}`} alt="" /></b><em />
        </div>
        <span className="policy-choice-label"><img src={`${BASE_URL}assets/ui/${choice.icon}`} alt="" /><strong>{choice.title}</strong><small>{choice.id === 'PUSH_FIRST' ? '4 → 1' : '1 → 3+'}</small></span>
        <b className="policy-choice-check" aria-hidden="true">{snapshot.policyChoice === choice.id ? '✓' : ''}</b>
      </button>)}</div>
      <div className="policy-order-delta" data-policy-order={snapshot.policy.join('>')} data-policy-directive={snapshot.policyDirectives.keepRange ? 'KEEP_RANGE' : 'NONE'}>
        <span className="policy-order-row is-before"><small>NOW</small>{defaultPolicy.map((policyId, index) => <PolicySlot key={policyId} policyId={policyId} rank={index + 1} changed={changedPolicyId === policyId} />)}</span>
        <i aria-hidden="true" />
        <span className={`policy-order-row is-after ${snapshot.policyChoice ? '' : 'is-pending'}`}><small>NEXT</small>{snapshot.policyChoice ? snapshot.policy.map((policyId, index) => <PolicySlot key={policyId} policyId={policyId} rank={index + 1} changed={changedPolicyId === policyId} directive={policyId === 'POSITION' && snapshot.policyDirectives.keepRange} />) : defaultPolicy.map((policyId, index) => <b key={policyId} aria-hidden="true">{index + 1}</b>)}</span>
      </div>
    </section>
    <button type="button" className="submission-flow-primary is-icon-first policy-review-primary" data-submission-primary="open-delegation" data-primary-key="SPACE" disabled={!snapshot.policyChoice} aria-label={snapshot.policyChoice ? '선택한 정책으로 위임 경로 확인' : '정책 대응 하나를 먼저 선택'} onClick={controller.performPrimaryAction}>{snapshot.policyChoice ? <img src={`${BASE_URL}assets/ui/${snapshot.policyChoice === 'PUSH_FIRST' ? 'intent-push.svg' : 'intent-move.svg'}`} alt="" /> : <b aria-hidden="true">?</b>}<i className="flow-forward" aria-hidden="true" /><span className="policy-route-glyph" aria-hidden="true"><i /><i /><b /></span><kbd>SPACE</kbd></button>
  </div>;
}

function PolicySlot({ policyId, rank, changed, directive = false }: { readonly policyId: SubmissionSnapshot['policy'][number]; readonly rank: number; readonly changed: boolean; readonly directive?: boolean }) {
  const icon = policyId === 'SHOOT' ? 'intent-shoot.svg' : policyId === 'PUSH' ? 'intent-push.svg' : 'intent-move.svg';
  return <span className={`policy-symbol is-${policyId.toLowerCase()} ${changed ? 'is-changed' : ''} ${directive ? 'has-range-directive' : ''}`} data-policy-slot={policyId} data-policy-rank={rank} aria-label={`${rank}순위 ${policyName(policyId)}${directive ? ', 최소 사거리 유지' : ''}`}><i>{rank}</i>{policyId === 'EMPTY' ? <b /> : <img src={`${BASE_URL}assets/ui/${icon}`} alt="" />}{directive && <em>3+</em>}</span>;
}

function DelegationPlanStage({ snapshot, controller }: { readonly snapshot: SubmissionSnapshot; readonly controller: SubmissionController }) {
  const policyIcon = snapshot.policyChoice === 'PUSH_FIRST' ? 'intent-push.svg' : 'intent-move.svg';
  const route = snapshot.currentRoute;
  const directionName = routeDirectionName(route);
  const threats = routeThreatVisuals(route);
  return <div className="submission-delegation-plan is-map-first" data-delegation-policy={snapshot.policyChoice} data-route-id={route.id} data-route-distance={route.distanceMeters} data-route-travel-minutes={route.travelMinutes} data-route-water-cost={route.waterCost} data-known-threats={route.threatCount}>
    <div className="submission-sky" /><div className="submission-canopy" />
    <section className="delegation-route is-map-first" aria-label={`원거리 동료에게 ${snapshot.policyChoice === 'PUSH_FIRST' ? '밀치기 우선' : '사거리 유지'} 정책으로 맡길 정찰된 ${directionName} ${route.distanceMeters}미터 통로`}>
      <div className="route-line"><i /><b style={{ left: '0%' }}>0m</b><b style={{ left: '50%' }}>{route.distanceMeters / 2}m</b><b style={{ left: '100%' }}>{route.distanceMeters}m</b></div>
      <span className="route-party"><img src={`${BASE_URL}assets/submission/archer-v1.png`} alt="원거리 동료" /><i className="route-party-vitals"><b style={{ width: `${snapshot.vitals.allyHp / 12 * 100}%` }} /></i><em className="route-policy-badge"><img src={`${BASE_URL}assets/ui/${policyIcon}`} alt="" /><b>{snapshot.policyChoice === 'PUSH_FIRST' ? '4→1' : '3+'}</b></em></span>
      {threats.map((threat, index) => <span key={`${threat.kind}:${index}`} className={`route-threat is-${threat.kind}`} style={{ left: `${threat.left}%` }} aria-label={`${Math.round(route.distanceMeters * threat.progress)}미터 부근 ${threat.kind === 'archer' ? '고블린 궁수' : '고블린 전사'}`}><img src={`${BASE_URL}assets/submission/goblin-${threat.kind}-v1.png`} alt="" /><i><img src={`${BASE_URL}assets/ui/intent-${threat.kind === 'archer' ? 'shoot' : 'attack'}.svg`} alt="" /></i></span>)}
      <span className="route-goal" aria-label={`${route.distanceMeters}미터 경계 방`}><i /><small>{route.distanceMeters}m</small></span>
    </section>
    <aside className="delegation-stop-strip" data-retreat-at-hp={snapshot.retreatAtHp} data-turn-limit="12" aria-label="위임 중단 조건: 체력 2 이하, 전투 12턴, 미확인 규칙. 물과 식량은 사용하지 않음">
      <span data-stop-condition="HP"><i className="stop-hp-glyph"><b /></i><strong>≤ {snapshot.retreatAtHp}</strong><em className="stop-pause-glyph" /></span>
      <span data-stop-condition="TURN"><i className="delegation-clock-glyph" /><strong>12</strong><em className="stop-pause-glyph" /></span>
      <span data-stop-condition="UNKNOWN"><i className="stop-unknown-glyph">?</i><strong>!</strong><em className="stop-pause-glyph" /></span>
      <span data-supply-use="0"><i className="stop-supply-icons"><img src={`${BASE_URL}assets/ui/supply-water.svg`} alt="" /><img src={`${BASE_URL}assets/ui/supply-ration.svg`} alt="" /></i><strong>×0</strong></span>
    </aside>
    <section className="delegation-parallel-time" data-time-rule="MAX_NOT_SUM" data-protagonist-minutes={snapshot.protagonistTaskMinutes} data-ally-travel-minutes={route.travelMinutes} aria-label={`같은 세계 시간에 주인공은 중앙 방에서 ${snapshot.protagonistTaskMinutes || 0}분 준비하고 동료는 ${route.travelMinutes}분 이동 뒤 실제 전투를 수행`}>
      <i className="parallel-origin"><span className="delegation-clock-glyph" /></i>
      <span className="parallel-task is-protagonist"><img src={`${BASE_URL}assets/submission/administrator-v1.png`} alt="주인공" /><i /><b>{snapshot.protagonistTaskMinutes ? `${snapshot.protagonistTaskMinutes}` : '✓'}</b></span>
      <span className="parallel-task is-ally"><img src={`${BASE_URL}assets/submission/archer-v1.png`} alt="원거리 동료" /><i /><b>{route.travelMinutes} + ?</b></span>
      <em aria-hidden="true"><i /><i /></em>
    </section>
    <button type="button" className="submission-flow-primary is-icon-first delegation-start-primary" data-submission-primary="run-delegation" data-primary-key="SPACE" aria-label="표시된 정책과 중단 조건으로 위임 작전 시작" onClick={controller.performPrimaryAction}><img src={`${BASE_URL}assets/ui/${policyIcon}`} alt="" /><i className="flow-forward" aria-hidden="true" /><span className="delegation-play-glyph" aria-hidden="true" /><kbd>SPACE</kbd></button>
  </div>;
}

function DelegationResultStage({ snapshot, controller }: { readonly snapshot: SubmissionSnapshot; readonly controller: SubmissionController }) {
  const result = snapshot.delegationResult;
  if (!result) return null;
  const secured = result.outcome === 'SECURED';
  const recoveryRequired = snapshot.delegationRecoveryRequired;
  const route = snapshot.currentRoute;
  const directionName = routeDirectionName(route);
  const policyIcon = snapshot.policyChoice === 'PUSH_FIRST' ? 'intent-push.svg' : 'intent-move.svg';
  const resultThreats = routeThreatVisuals(route);
  const traceCells = new Map<string, number>();
  result.route.forEach((position, index) => traceCells.set(`${position.x}:${position.y}`, index + 1));
  const actionSteps = result.policySteps
    .filter((step) => step.action)
    .filter((step, index, steps) => index === 0 || step.turn !== steps[index - 1]?.turn || step.selectedPolicyId !== steps[index - 1]?.selectedPolicyId)
    .slice(0, 6);
  const sharedMinutes = Math.max(snapshot.protagonistTaskMinutes, result.elapsedMinutes);
  return <div className={`submission-delegation-result is-map-result ${secured ? 'is-secured' : 'is-paused'}`} data-operation-outcome={result.outcome} data-route-safe={secured} data-selected-policy={snapshot.policyChoice} data-route-id={result.frontierId} data-route-distance={result.distanceMeters} data-route-travel-minutes={result.travelMinutes} data-route-water-cost={result.waterCost}>
    <div className="submission-sky" /><div className="submission-canopy" />
    <section className="operation-route-result" data-route-meters={result.distanceMeters} data-known-threats={route.threatCount} aria-label={secured ? `선택한 정책으로 ${directionName} ${result.distanceMeters}미터 통로의 위협 ${route.threatCount}개를 제거해 경계 방까지 안전해짐` : `선택한 정책으로 작전했지만 중단되어 ${directionName} ${result.distanceMeters}미터 통로의 위협이 남음`}>
      <span className="operation-policy-source"><img src={`${BASE_URL}assets/ui/${policyIcon}`} alt="" /><b>{snapshot.policyChoice === 'PUSH_FIRST' ? '4→1' : '3+'}</b></span>
      <div className="operation-world-track"><i />
        {resultThreats.map((threat, index) => <span key={`${threat.kind}:${index}`} className={`route-result-threat is-${threat.kind} ${secured ? 'is-cleared' : ''}`} style={{ left: `${threat.left}%` }} data-route-threat={index + 1}><img src={`${BASE_URL}assets/submission/goblin-${threat.kind}-v1.png`} alt="" />{secured && <i />}</span>)}
        <span className={`route-result-goal ${secured ? 'is-open' : ''}`}><i />{secured && <b>✓</b>}</span>
      </div>
      <span className="operation-route-verdict">{secured ? <i className="operation-check-glyph">✓</i> : <><i className="delegation-clock-glyph" /><b>{result.turns}</b><em className="stop-pause-glyph" /></>}</span>
    </section>
    <section className="operation-grid-record" data-final-turn={result.turns} data-route-trace-length={result.route.length} data-event-count={result.eventCount} aria-label="동료 위임 전투의 실제 12칸 3열 최종 좌표와 행동 기록">
      <div className="operation-result-board">{Array.from({ length: 36 }, (_, index) => {
        const x = index % 12;
        const y = Math.floor(index / 12);
        const traceOrder = traceCells.get(`${x}:${y}`);
        return <i key={`${x}:${y}`} className={traceOrder ? 'is-traced' : ''} data-trace-cell={traceOrder || undefined} />;
      })}{result.finalState.units.map((unit) => <span key={unit.id} className={`operation-result-unit is-${unit.faction.toLowerCase()} ${unit.hp <= 0 ? 'is-defeated' : ''}`} data-unit-id={unit.id} data-unit-hp={unit.hp} style={{ left: `${(unit.position.x + .5) / 12 * 100}%`, top: `${(unit.position.y + .5) / 3 * 100}%` }} aria-label={`${unit.id}, ${unit.position.x},${unit.position.y}, 체력 ${unit.hp}`}><img src={`${BASE_URL}assets/submission/${unit.faction === 'STUDENT' ? 'archer-v1.png' : unit.id.includes('archer') ? 'goblin-archer-v1.png' : 'goblin-warrior-v1.png'}`} alt="" /><i><b style={{ width: `${unit.hp / unit.maxHp * 100}%` }} /></i>{unit.hp <= 0 && <em />}</span>)}</div>
      <div className="operation-action-trace">{actionSteps.map((step, index) => <span key={`${step.turn}:${step.cycle}:${index}`} data-policy-id={step.selectedPolicyId} title={`${step.action?.label ?? policyName(step.selectedPolicyId ?? 'EMPTY')} · ${step.reason}`}><small>T{step.turn}</small><img src={`${BASE_URL}assets/ui/intent-${step.selectedPolicyId === 'PUSH' ? 'push' : step.selectedPolicyId === 'SHOOT' ? 'shoot' : 'move'}.svg`} alt="" /><b>{step.action?.to ? `${step.action.to.x},${step.action.to.y}` : '•'}</b></span>)}</div>
    </section>
    <aside className="operation-result-metrics" data-damage={result.damageTaken} data-elapsed-minutes={result.elapsedMinutes} data-final-hp={result.finalHp}>
      <span aria-label={`${result.turns} 전투 턴`}><img src={`${BASE_URL}assets/ui/intent-attack.svg`} alt="" /><b>{result.turns}T</b></span>
      <span aria-label={`피해 ${result.damageTaken}`}><i className="result-damage-glyph" /><b>−{result.damageTaken}</b></span>
      <span aria-label={`별동대 작전 ${result.elapsedMinutes}분`}><i className="delegation-clock-glyph" /><b>+{result.elapsedMinutes}</b></span>
      <span aria-label={`동료 체력 ${result.finalHp} / ${result.initialHp}`}><img src={`${BASE_URL}assets/submission/archer-v1.png`} alt="" /><i className="result-hp-track"><b style={{ width: `${result.finalHp / result.initialHp * 100}%` }} /></i><strong>{result.finalHp}</strong></span>
    </aside>
    <section className="delegation-parallel-time operation-shared-time" data-time-rule="MAX_NOT_SUM" data-protagonist-minutes={snapshot.protagonistTaskMinutes} data-operation-minutes={result.elapsedMinutes} data-shared-minutes={sharedMinutes} aria-label={`주인공 ${snapshot.protagonistTaskMinutes}분과 동료 ${result.elapsedMinutes}분 중 더 긴 ${sharedMinutes}분만큼 세계 시간이 흐름`}>
      <i className="parallel-origin"><span className="delegation-clock-glyph" /></i>
      <span className="parallel-task is-protagonist"><img src={`${BASE_URL}assets/submission/administrator-v1.png`} alt="" /><i /><b>{snapshot.protagonistTaskMinutes || '✓'}</b></span>
      <span className="parallel-task is-ally"><img src={`${BASE_URL}assets/submission/archer-v1.png`} alt="" /><i /><b>{result.elapsedMinutes}</b></span>
      <em aria-hidden="true"><i /><i /></em><strong className="operation-shared-total">+{sharedMinutes}</strong>
    </section>
    <button type="button" className={`submission-flow-primary is-icon-first operation-result-primary ${secured ? 'is-secured' : recoveryRequired ? 'is-paused is-recovery' : 'is-paused'}`} data-submission-primary={secured ? 'approach-anchor' : recoveryRequired ? 'recover-delegation' : 'review-policy'} data-primary-key="SPACE" data-recovery-minutes={recoveryRequired ? snapshot.delegationRecoveryMinutes : undefined} aria-label={secured ? '주인공으로 확보된 경계 거점에 이동' : recoveryRequired ? `결계 안으로 후송해 ${snapshot.delegationRecoveryMinutes}분 회복한 뒤 정책을 다시 조정` : '중단된 작전의 정책을 다시 조정'} onClick={controller.performPrimaryAction}>{secured ? <img src={`${BASE_URL}assets/submission/administrator-v1.png`} alt="" /> : recoveryRequired ? <span className="delegation-recovery-glyph"><span className="delegation-clock-glyph" /><b>{snapshot.delegationRecoveryMinutes}</b><span className="scout-rest-heart"><i /><b>+</b></span></span> : <i className="stop-pause-glyph" />}<i className="flow-forward" aria-hidden="true" />{secured ? <span className="operation-mini-goal"><i /></span> : <img src={`${BASE_URL}assets/ui/${policyIcon}`} alt="" />}<kbd>SPACE</kbd></button>
  </div>;
}

function AnchorApproachStage({ snapshot, controller }: { readonly snapshot: SubmissionSnapshot; readonly controller: SubmissionController }) {
  const activeTimer = useRef<number | undefined>(undefined);
  const stop = () => {
    if (activeTimer.current !== undefined) window.clearInterval(activeTimer.current);
    activeTimer.current = undefined;
  };
  const start = () => {
    stop();
    controller.advanceAnchorApproach();
    activeTimer.current = window.setInterval(controller.advanceAnchorApproach, 78);
  };
  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.repeat || (event.key.toLowerCase() !== 'd' && event.key !== 'ArrowRight')) return;
      event.preventDefault();
      start();
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'd' || event.key === 'ArrowRight') stop();
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', stop);
    return () => {
      stop();
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', stop);
    };
  }, [controller]);
  useEffect(() => stop, [snapshot.mode]);

  const route = snapshot.currentRoute;
  const ready = snapshot.mode === 'ANCHOR_READY';
  const progress = snapshot.anchorProgress / route.distanceMeters;
  const frontier = snapshot.world.tiles.find((tile) => tile.id === route.targetTileId);
  const distanceMarks = routeDistanceMarks(route.distanceMeters);
  const remainingMeters = route.distanceMeters - snapshot.anchorProgress;
  const directionName = routeDirectionName(route);
  return <div className={`submission-anchor-approach is-spatial is-${route.direction.toLowerCase()} ${ready ? 'is-ready' : ''}`} data-anchor-state={ready ? 'READY' : 'TRAVELING'} data-anchor-progress={snapshot.anchorProgress} data-route-id={route.id} data-route-distance={route.distanceMeters} data-route-direction={route.direction} data-route-safe={Boolean(frontier?.routeSafe)} data-anchor-prepared={Boolean(frontier?.anchorPrepared)} data-protagonist-at-anchor={Boolean(frontier?.protagonistAtAnchor)} data-territory={frontier?.territory}>
    <div className="corridor-moving-backdrop" style={{ backgroundPositionX: `${progress * -980}px` }} />
    <div className="corridor-moving-ground" style={{ backgroundPositionX: `${progress * -720}px` }} />
    <div className="safe-route-glow" /><div className="corridor-shade" />
    <div className="anchor-travel-party"><img src={`${BASE_URL}assets/submission/administrator-v1.png`} alt="주인공" /><i /></div>
    <div className="anchor-destination is-spatial" aria-label={ready ? `주인공이 도착했지만 아직 결계 밖인 ${directionName} 비활성 확장 거점` : `확보된 길 끝의 비활성 확장 거점까지 ${remainingMeters}미터`}><i className="anchor-seal-glyph"><b /><em /></i></div>
    <div className="anchor-route-progress" data-route-progress={snapshot.anchorProgress} aria-label={`동료가 확보한 ${directionName} ${route.distanceMeters}미터 길을 주인공이 ${snapshot.anchorProgress}미터 이동`}>
      <span className="anchor-route-ally"><img src={`${BASE_URL}assets/submission/archer-v1.png`} alt="" /><b>✓</b></span>
      <i className="anchor-route-track"><b style={{ width: `${progress * 100}%` }} />{distanceMarks.map((meter) => <em key={meter} style={{ left: `${meter / route.distanceMeters * 100}%` }} />)}</i>
      <span className="anchor-route-protagonist" style={{ left: `${8 + progress * 82}%` }}><img src={`${BASE_URL}assets/submission/administrator-v1.png`} alt="" /></span>
      <span className={`anchor-route-goal ${ready ? 'is-ready' : ''}`}><i /></span>
      <strong>{ready ? '✓' : `${remainingMeters}m`}</strong>
    </div>
    {ready
      ? <button type="button" className="submission-flow-primary is-icon-first anchor-spatial-primary is-ready" data-submission-primary="activate-anchor" data-primary-key="SPACE" aria-label="도착한 주인공이 비활성 확장 거점을 결계에 연결" onClick={controller.performPrimaryAction}><img src={`${BASE_URL}assets/submission/administrator-v1.png`} alt="" /><i className="flow-forward" aria-hidden="true" /><span className="anchor-button-goal is-ready"><i /></span><kbd>SPACE</kbd></button>
      : <button type="button" className="submission-flow-primary is-icon-first anchor-spatial-primary hold-control" data-submission-primary="approach-anchor" data-primary-key="D" aria-label={`누르는 동안 주인공이 확보된 ${directionName} 경로를 따라 확장 거점으로 이동`} onPointerDown={start} onPointerUp={stop} onPointerLeave={stop}><img src={`${BASE_URL}assets/submission/administrator-v1.png`} alt="" /><i className="flow-forward" aria-hidden="true" /><span className="anchor-button-goal"><i /></span><kbd>D</kbd></button>}
  </div>;
}

function ExpandedStage({ snapshot, controller }: { readonly snapshot: SubmissionSnapshot; readonly controller: SubmissionController }) {
  const contour = useMemo(() => computeBarrierContour(snapshot.world), [snapshot.world]);
  const incorporated = snapshot.world.tiles.filter((tile) => tile.territory === 'INCORPORATED');
  const revealedOutside = snapshot.world.tiles.filter((tile) => tile.territory === 'OUTSIDE' && tile.knowledge === 'REVEALED');
  const frontier = snapshot.world.tiles.find((tile) => tile.id === 'frontier-east');
  const choices = SUBMISSION_FRONTIER_ROUTES.map((route) => ({
    route,
    state: snapshot.frontierChoices.find((choice) => choice.id === route.id),
  })).filter((choice): choice is FrontierTileChoice => Boolean(choice.state));
  const choiceByTile = new Map<string, FrontierTileChoice>(choices.map((choice) => [choice.route.targetTileId, choice]));
  const selectedChoice = choices.find((choice) => choice.state.selected);
  return <div className="submission-expanded is-spatial" data-world-revision={snapshot.world.revision} data-incorporated-tiles={incorporated.map((tile) => tile.id).join(',')} data-revealed-outside={revealedOutside.map((tile) => tile.id).join(',')} data-contour-count={contour.length} data-frontier-utility={frontier?.utility} data-water={snapshot.supplies.water} data-frontier-selection={selectedChoice?.route.id ?? 'NONE'}>
    <div className="submission-sky" /><div className="submission-canopy" /><div className="expansion-radiance" />
    <div className={`expanded-tile-field is-spatial ${selectedChoice ? 'has-frontier-selection' : ''}`} data-expanded-map data-critical-fit>
      <div className="expansion-next-links" style={tilePosition(1, 0)} aria-hidden="true">{choices.map(({ route, state }) => <i key={route.id} className={`is-${route.direction.toLowerCase()} is-choice-link ${state.selected ? 'is-selected' : ''} ${state.available ? '' : 'is-blocked'}`} data-frontier-link={route.id} />)}</div>
      <i className="expansion-owned-bridge" style={tilePosition(0.5, 0)} aria-hidden="true" />
      {snapshot.world.tiles.filter((tile) => tile.knowledge !== 'UNSEEN').map((tile) => <WorldTile key={tile.id} tile={tile} choice={choiceByTile.get(tile.id)} onSelect={controller.selectFrontier} />)}
      {contour.map((segment) => <i key={segment.id} className={`barrier-edge is-${segment.edge.toLowerCase()}`} data-contour-tile={segment.tileId} data-contour-edge={segment.edge} style={tilePosition(segment.x, segment.y)} />)}
      <i className="expansion-old-seam" style={tilePosition(0, 0)} aria-hidden="true" />
      <div className="expansion-anchor-node" style={tilePosition(1, 0)} aria-label="주인공이 활성화한 편입 거점"><i><b /></i></div>
      <div className="world-party is-expanded" style={tilePosition(1, 0)}><img src={`${BASE_URL}assets/submission/administrator-v1.png`} alt="주인공" /></div>
      <div className="active-spring is-spatial" style={tilePosition(1, 0)} data-water-gain="1"><img src={`${BASE_URL}assets/ui/supply-water.svg`} alt="활성화된 샘" /><b>+1</b></div>
    </div>
    {selectedChoice && <button type="button" className={`submission-flow-primary is-icon-first frontier-confirm is-${selectedChoice.route.direction.toLowerCase()}`} data-submission-primary="confirm-frontier" data-primary-key="SPACE" data-frontier-id={selectedChoice.route.id} data-water-cost={selectedChoice.route.waterCost} data-water-paid={selectedChoice.state.waterPaid} data-critical-fit aria-label={`${routeDirectionName(selectedChoice.route)} ${selectedChoice.route.distanceMeters}미터 경로를 확정${selectedChoice.route.waterCost ? `하고 물 ${selectedChoice.route.waterCost} 사용` : ''}`} onClick={controller.performPrimaryAction}>
      <span className={`frontier-confirm-direction is-${selectedChoice.route.direction.toLowerCase()}`} aria-hidden="true"><i /><b /></span>
      {selectedChoice.route.waterCost > 0 && <span className="frontier-confirm-water" aria-hidden="true"><img src={`${BASE_URL}assets/ui/supply-water.svg`} alt="" /><i /></span>}
      <i className="flow-forward" aria-hidden="true" /><kbd>SPACE</kbd>
    </button>}
  </div>;
}

function CompleteStage({ snapshot, controller }: { readonly snapshot: SubmissionSnapshot; readonly controller: SubmissionController }) {
  const contour = useMemo(() => computeBarrierContour(snapshot.world), [snapshot.world]);
  const incorporated = snapshot.world.tiles.filter((tile) => tile.territory === 'INCORPORATED');
  const revealedOutside = snapshot.world.tiles.filter((tile) => tile.territory === 'OUTSIDE' && tile.knowledge === 'REVEALED');
  const frontier = snapshot.world.tiles.find((tile) => tile.id === 'frontier-east');
  const route = snapshot.currentRoute;
  const target = snapshot.world.tiles.find((tile) => tile.id === route.targetTileId);
  const targetCoordinate = target?.coordinate ?? { x: 1, y: 0 };
  const bridgeCoordinate = { x: (1 + targetCoordinate.x) / 2, y: targetCoordinate.y / 2 };
  return <div className="submission-complete is-spatial" data-submission-stage="complete" data-world-revision={snapshot.world.revision} data-incorporated-tiles={incorporated.map((tile) => tile.id).join(',')} data-revealed-outside={revealedOutside.map((tile) => tile.id).join(',')} data-contour-count={contour.length} data-frontier-utility={frontier?.utility} data-water={snapshot.supplies.water} data-active-frontier={snapshot.activeFrontierId}>
    <div className="submission-sky" /><div className="submission-canopy" /><div className="expansion-radiance" />
    <div className="expanded-tile-field is-spatial is-complete" data-complete-map data-critical-fit>
      <i className="expansion-owned-bridge is-established" style={tilePosition(.5, 0)} aria-hidden="true" />
      <i className={`expansion-owned-bridge is-established is-${route.direction.toLowerCase()}`} style={tilePosition(bridgeCoordinate.x, bridgeCoordinate.y)} aria-hidden="true" />
      {snapshot.world.tiles.filter((tile) => tile.knowledge !== 'UNSEEN').map((tile) => <WorldTile key={tile.id} tile={tile} />)}
      {contour.map((segment) => <i key={segment.id} className={`barrier-edge is-${segment.edge.toLowerCase()}`} data-contour-tile={segment.tileId} data-contour-edge={segment.edge} style={tilePosition(segment.x, segment.y)} />)}
      <div className="expansion-anchor-node is-settled" style={tilePosition(targetCoordinate.x, targetCoordinate.y)} aria-label="주인공이 활성화한 두 번째 편입 거점"><i><b /></i></div>
      <div className="world-party is-expanded is-settled" style={tilePosition(targetCoordinate.x, targetCoordinate.y)}><img src={`${BASE_URL}assets/submission/administrator-v1.png`} alt="주인공" /></div>
    </div>
    <button type="button" className="submission-flow-primary is-icon-first expanded-restart is-spatial" data-submission-primary="restart-submission" data-primary-key="SPACE" data-critical-fit aria-label="두 번째 영역 확장 결과를 확인하고 처음부터 다시 시작" onClick={controller.performPrimaryAction}><span className="expanded-owned-glyph"><i /><i /></span><i className="expanded-restart-glyph" aria-hidden="true" /><kbd>SPACE</kbd></button>
  </div>;
}

function SubmissionHud({ snapshot }: { readonly snapshot: SubmissionSnapshot }) {
  const frontierKnown = !['INTRO', 'CORRIDOR', 'CENTER_GATE', 'COMBAT'].includes(snapshot.mode);
  const activeFrontierName = snapshot.activeFrontierId
    ? snapshot.world.tiles.find((tile) => tile.id === snapshot.activeFrontierId)?.name
    : undefined;
  const locationName = activeFrontierName
    ?? (snapshot.mode === 'EXPANDED' ? snapshot.world.tiles.find((tile) => tile.id === 'frontier-east')?.name : undefined)
    ?? (frontierKnown ? '물안개 전초지' : '깨어난 정원');
  return <header className="submission-topbar">
    <div className="submission-mark"><i /><span><small>{snapshot.worldTime} · DAY 1</small><strong>{locationName}</strong></span></div>
    <div className="submission-resources" aria-label="원정 보급"><em className="submission-autosave"><i />자동 저장</em><span><img src={`${BASE_URL}assets/ui/supply-water.svg`} alt="물" /><b>{snapshot.supplies.water}</b></span><span><img src={`${BASE_URL}assets/ui/supply-ration.svg`} alt="식량" /><b>{snapshot.supplies.food}</b></span></div>
  </header>;
}

interface FrontierTileChoice {
  readonly route: SubmissionFrontierRouteSpec;
  readonly state: SubmissionFrontierChoiceSnapshot;
}

function WorldTile({ tile, choice, onSelect }: {
  readonly tile: SubmissionTileState;
  readonly choice?: FrontierTileChoice;
  readonly onSelect?: SubmissionController['selectFrontier'];
}) {
  const state = tile.knowledge === 'UNSEEN' ? 'unseen' : tile.territory === 'INCORPORATED' ? 'owned' : 'frontier';
  const contents = <>
    <div className="tile-terrain" />
    {state === 'owned' && <span className="tile-heart">✦</span>}
    {state === 'frontier' && !choice && <span className="tile-question">?</span>}
    {tile.utilityKind === 'SPRING' && tile.utility === 'ACTIVE' && <span className="tile-utility"><img src={`${BASE_URL}assets/ui/supply-water.svg`} alt="샘" /></span>}
    <strong>{state === 'unseen' ? '' : tile.name}</strong>
    <small>{state === 'owned' ? '결계 안' : state === 'frontier' ? '미확보' : ''}</small>
    {choice && <FrontierChoiceFace choice={choice} />}
  </>;
  const common = {
    className: `submission-tile is-${state} ${choice ? `is-choice is-${choice.route.direction.toLowerCase()} ${choice.state.selected ? 'is-selected' : ''} ${choice.state.available ? '' : 'is-blocked'}` : ''}`,
    'data-world-tile': tile.id,
    'data-knowledge': tile.knowledge,
    'data-territory': tile.territory,
    'data-utility': tile.utility,
    style: tilePosition(tile.coordinate.x, tile.coordinate.y),
  };
  if (choice) return <button type="button" {...common} data-frontier-choice={choice.route.id} data-available={choice.state.available} data-selected={choice.state.selected} data-water-paid={choice.state.waterPaid} data-water-cost={choice.route.waterCost} data-route-distance={choice.route.distanceMeters} data-route-minutes={choice.route.travelMinutes} data-route-threats={choice.route.threatCount} data-blocker={choice.state.blocker} disabled={!choice.state.available} aria-pressed={choice.state.selected} aria-label={`${tile.name}, ${routeDirectionName(choice.route)} ${choice.route.distanceMeters}미터, 이동 ${choice.route.travelMinutes}분, 위협 ${choice.route.threatCount}, 물 ${choice.route.waterCost}${choice.state.blocker ? `, 선택 불가 ${choice.state.blocker}` : ''}`} onClick={() => onSelect?.(choice.route.id)}>{contents}</button>;
  return <article {...common} aria-label={`${tile.name}: ${tile.knowledge}, ${tile.territory}`}>{contents}</article>;
}

function FrontierChoiceFace({ choice }: { readonly choice: FrontierTileChoice }) {
  const distanceSegments = choice.route.distanceMeters / 200;
  return <span className="frontier-choice-face" aria-hidden="true">
    <kbd>{choice.route.direction === 'NORTH' ? 'W' : 'D'}</kbd>
    <span className="frontier-route-facts">
      <span className="frontier-distance-fact"><img src={`${BASE_URL}assets/ui/intent-move.svg`} alt="" /><i>{Array.from({ length: distanceSegments }, (_, index) => <em key={index} />)}</i><b>{choice.route.distanceMeters}m</b><span className="frontier-time-fact"><i /><b>{choice.route.travelMinutes}</b></span></span>
      <span className="frontier-threat-fact">{Array.from({ length: choice.route.threatCount }, (_, index) => <img key={index} src={`${BASE_URL}assets/ui/intent-attack.svg`} alt="" />)}</span>
      {choice.route.waterCost > 0 && <span className="frontier-water-fact"><img src={`${BASE_URL}assets/ui/supply-water.svg`} alt="" /><i /><b>−{choice.route.waterCost}</b></span>}
    </span>
    <i className="frontier-choice-check" />
  </span>;
}

function tilePosition(x: number, y: number): React.CSSProperties {
  return { left: `calc(38% + ${x * 224}px)`, top: `calc(50% + ${y * 148}px)` };
}

function routeDirectionName(route: { readonly direction: 'EAST' | 'NORTH' }): string {
  return route.direction === 'NORTH' ? '북쪽' : '동쪽';
}

function routeDistanceMarks(distanceMeters: number): readonly number[] {
  return Array.from({ length: Math.max(0, distanceMeters / 100 - 1) }, (_, index) => (index + 1) * 100);
}

function routeThreatVisuals(route: { readonly threatCount: number }): readonly {
  readonly kind: 'warrior' | 'archer';
  readonly progress: number;
  readonly left: number;
}[] {
  if (route.threatCount === 1) return [{ kind: 'archer', progress: .67, left: 64 }];
  return [
    { kind: 'warrior', progress: .5, left: 47 },
    { kind: 'archer', progress: .75, left: 68 },
  ];
}

function policyName(policyId: SubmissionSnapshot['policy'][number]): string {
  return ({ EVADE: '회피', POSITION: '포지셔닝', SHOOT: '사격', PUSH: '밀치기', EMPTY: '빈 슬롯' })[policyId];
}
