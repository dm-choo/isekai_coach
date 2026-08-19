import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { type SliceActionId } from '../game/slice';
import {
  SubmissionController,
  computeBarrierContour,
  parseSubmissionSave,
  type SubmissionSnapshot,
  type SubmissionPolicyChoice,
  type SubmissionTileState,
} from '../game/submission';
import { CombatStage } from './Slice2App';

const BASE_URL = import.meta.env.BASE_URL;
const SUBMISSION_SAVE_KEY = 'isekai-coach:submission:v2';

export function SubmissionApp() {
  const query = new URLSearchParams(window.location.search);
  const verification = import.meta.env.DEV && query.has('verify');
  const failureFixture = verification && query.has('failure');
  const policyFixture = verification && query.has('policy');
  const [controller] = useState(() => {
    const saveData = verification ? undefined : parseSubmissionSave(window.localStorage.getItem(SUBMISSION_SAVE_KEY));
    return new SubmissionController(verification
      ? { playbackSpeed: 12, phaseDelayScale: policyFixture ? 1 : 0.03, ...(failureFixture ? { initialVitals: { administratorHp: 1, allyHp: 1 } } : {}) }
      : saveData ? { saveData } : {});
  });
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  useEffect(() => () => controller.destroy(), [controller]);
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
      if (event.repeat) return;
      if (event.key === ' ') {
        if (controller.performPrimaryAction()) event.preventDefault();
        return;
      }
      if (snapshot.mode !== 'COMBAT' || snapshot.combat?.mode !== 'PLAYER_TURN') return;
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
  }, [controller, snapshot]);

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

  const progress = snapshot.corridorProgress / 400;
  const atGate = snapshot.mode === 'CENTER_GATE';
  return <div className={`submission-corridor ${atGate ? 'is-gate' : ''}`}>
    <div className="corridor-moving-backdrop" style={{ backgroundPositionX: `${progress * -980}px` }} />
    <div className="corridor-moving-ground" style={{ backgroundPositionX: `${progress * -720}px` }} />
    <div className="corridor-shade" />
    <div className="submission-travel-copy"><small>물안개 전초지 · 서쪽 통로</small><strong>{atGate ? '중앙 방 도착' : '미정찰 통로'}</strong></div>
    <div className="submission-travel-party"><img src={`${BASE_URL}assets/submission/administrator-v1.png`} alt="관리자" /><img src={`${BASE_URL}assets/submission/archer-v1.png`} alt="원거리 동료" /></div>
    <div className="submission-destination"><i>◇</i><span>{atGate ? '중앙 방' : `${400 - snapshot.corridorProgress}m`}</span></div>
    <div className="submission-distance" aria-label={`${snapshot.corridorProgress}미터 이동`}><i style={{ width: `${progress * 100}%` }} />{[100, 200, 300].map((meter) => <b key={meter} style={{ left: `${meter / 4}%` }} />)}<span>{snapshot.corridorProgress} / 400m</span></div>
    {atGate
      ? <button type="button" className="corridor-primary" data-submission-primary="enter-center" data-primary-key="SPACE" onClick={controller.performPrimaryAction}><span><small>발소리 2 · 출구 4</small><strong>중앙 방 진입</strong></span><kbd>SPACE</kbd></button>
      : <button type="button" className="corridor-primary hold-control" data-submission-primary="advance-corridor" data-primary-key="D" onPointerDown={start} onPointerUp={stop} onPointerLeave={stop}><span><small>누르는 동안 이동</small><strong>동쪽으로 전진</strong></span><kbd>D</kbd></button>}
    <div className="submission-travel-notice" role="status"><i />{snapshot.notice}</div>
  </div>;
}

function ScoutedStage({ snapshot, controller }: { readonly snapshot: SubmissionSnapshot; readonly controller: SubmissionController }) {
  return <div className="submission-scouted">
    <div className="submission-sky" /><div className="submission-canopy" />
    <div className="scout-map" data-scout-map-state="FOUR_CORRIDORS_SCOUTED" aria-label="확보한 중앙 방에서 정찰된 북쪽, 동쪽, 남쪽, 서쪽 통로">
      <span className="scout-line is-north" /><span className="scout-line is-east" /><span className="scout-line is-south" /><span className="scout-line is-west" />
      <i className="scout-room is-north" aria-label="북쪽 방"><span /></i><i className="scout-room is-east" aria-label="동쪽 방"><span /></i><i className="scout-room is-south" aria-label="남쪽 방"><span /></i><i className="scout-room is-west" aria-label="서쪽 방"><span /></i>
      <strong className="scout-center"><b>✓</b><small>중앙 방</small></strong>
      <em className="scout-threat is-east" aria-label="동쪽에서 발견한 위협"><img src={`${BASE_URL}assets/ui/intent-attack.svg`} alt="" /></em><em className="scout-threat is-north" aria-label="북쪽에서 발견한 위협"><img src={`${BASE_URL}assets/ui/intent-attack.svg`} alt="" /></em>
    </div>
    <aside className="scout-policy-hook" aria-label="인접한 적 때문에 동료 사격이 막힌 전투 기록">
      <span className="scout-hook-ally"><img src={`${BASE_URL}assets/submission/archer-v1.png`} alt="원거리 동료" /></span>
      <i className="scout-hook-distance" aria-hidden="true">1</i>
      <span className="scout-hook-enemy"><img src={`${BASE_URL}assets/submission/goblin-warrior-v1.png`} alt="인접한 고블린 전사" /></span>
      <b className="scout-hook-blocked" aria-hidden="true"><img src={`${BASE_URL}assets/ui/intent-shoot.svg`} alt="" /><i /></b>
      <em aria-hidden="true" />
      <span className="scout-record-glyph" aria-hidden="true"><i /><i /><b /></span>
    </aside>
    <button type="button" className="submission-flow-primary is-icon-first" data-submission-primary="review-record" data-primary-key="SPACE" aria-label="전투 기록을 열어 동료 정책 검토" onClick={controller.performPrimaryAction}><span className="scout-record-glyph" aria-hidden="true"><i /><i /><b /></span><i className="flow-forward" aria-hidden="true" /><kbd>SPACE</kbd></button>
  </div>;
}

function PolicyReviewStage({ snapshot, controller }: { readonly snapshot: SubmissionSnapshot; readonly controller: SubmissionController }) {
  const shootBlocked = snapshot.lastCombatSummary?.blockedByPolicy.SHOOT;
  const choices: readonly { id: SubmissionPolicyChoice; eyebrow: string; title: string; detail: string; icon: string }[] = [
    { id: 'PUSH_FIRST', eyebrow: '접근 대응', title: '가까우면 먼저 밀친다', detail: '밀치기를 1순위로 올려 공간을 직접 되찾습니다.', icon: 'intent-push.svg' },
    { id: 'KEEP_RANGE', eyebrow: '거리 보존', title: '사격 거리를 계속 지킨다', detail: '최소 사거리 안으로 들어오면 공격보다 이동을 우선합니다.', icon: 'intent-move.svg' },
  ];
  return <div className="submission-policy-review">
    <div className="submission-sky" /><div className="submission-canopy" />
    <section className="policy-evidence-focus">
      <small>LAST COMBAT · ACTUAL RECORD</small><h1>왜 사격하지<br />못했을까?</h1>
      <div className="evidence-lane"><span className="evidence-ally"><img src={`${BASE_URL}assets/submission/archer-v1.png`} alt="원거리 동료" /><i /></span><b>1</b><span className="evidence-enemy"><img src={`${BASE_URL}assets/submission/goblin-warrior-v1.png`} alt="고블린 전사" /></span></div>
      <article className="evidence-reason"><img src={`${BASE_URL}assets/ui/intent-shoot.svg`} alt="" /><div><small>사격 판정 · {shootBlocked?.count ?? 0}회 막힘</small><strong>{shootBlocked?.reason ?? '유효 사거리에 적이 없음'}</strong></div></article>
      <p>활은 바로 앞 2칸을 쏠 수 없다. 바꾼 정책은 이전 기록을 고치지 않고 다음 작전부터 적용된다.</p>
    </section>
    <section className="policy-choice-panel">
      <header><small>CHANGE ONE RULE</small><h2>이 상황에 어떻게 대응할까?</h2><p>둘 다 안전과 시간을 다르게 바꾼다. 결과는 위임 작전에서 확인한다.</p></header>
      <div className="policy-choice-list">{choices.map((choice) => <button key={choice.id} type="button" className={snapshot.policyChoice === choice.id ? 'is-selected' : ''} onClick={() => controller.choosePolicy(choice.id)}>
        <i><img src={`${BASE_URL}assets/ui/${choice.icon}`} alt="" /></i><span><small>{choice.eyebrow}</small><strong>{choice.title}</strong><em>{choice.detail}</em></span><b>{snapshot.policyChoice === choice.id ? '✓' : '○'}</b>
      </button>)}</div>
      <div className="policy-order-preview"><small>현재 평가 순서</small>{snapshot.policy.map((policyId, index) => <span key={policyId} className={index === 0 ? 'is-first' : ''}><i>{index + 1}</i>{policyName(policyId)}</span>)}</div>
    </section>
    <button type="button" className="submission-flow-primary" data-submission-primary="open-delegation" data-primary-key="SPACE" disabled={!snapshot.policyChoice} onClick={controller.performPrimaryAction}><span><small>{snapshot.policyChoice ? '변경은 다음 작전부터 적용' : '대응 하나를 선택'}</small><strong>위임 경로 확인</strong></span><kbd>SPACE</kbd></button>
  </div>;
}

function DelegationPlanStage({ snapshot, controller }: { readonly snapshot: SubmissionSnapshot; readonly controller: SubmissionController }) {
  return <div className="submission-delegation-plan">
    <div className="submission-sky" /><div className="submission-canopy" />
    <section className="delegation-heading"><small>KNOWN ROUTE · DELEGATION</small><h1>아는 길은<br />동료에게 맡긴다.</h1><p>새 규칙이나 미확인 사건을 만나면 진행하지 않고 멈춘다.</p></section>
    <section className="delegation-route" aria-label="정찰된 동쪽 400미터 통로">
      <div className="route-line"><i /><b style={{ left: '0%' }}>0m</b><b style={{ left: '50%' }}>200m</b><b style={{ left: '100%' }}>400m</b></div>
      <span className="route-party"><img src={`${BASE_URL}assets/submission/archer-v1.png`} alt="원거리 동료" /><small>별동대</small></span>
      <span className="route-threat is-warrior"><img src={`${BASE_URL}assets/submission/goblin-warrior-v1.png`} alt="고블린 전사" /><small>관찰됨</small></span>
      <span className="route-threat is-archer"><img src={`${BASE_URL}assets/submission/goblin-archer-v1.png`} alt="고블린 궁수" /><small>관찰됨</small></span>
      <span className="route-goal">◇<small>경계 방</small></span>
    </section>
    <aside className="delegation-orders">
      <header><span><img src={`${BASE_URL}assets/submission/archer-v1.png`} alt="" /><b>원거리 동료</b></span><strong>HP {snapshot.vitals.allyHp}/12</strong></header>
      <dl><div><dt>경로</dt><dd>정찰된 동쪽 통로 · 400m</dd></div><div><dt>전술 변경</dt><dd>{snapshot.policyChoice === 'PUSH_FIRST' ? '접근 시 밀치기 우선' : '최소 사거리 유지'}</dd></div><div className="delegation-supply"><dt>보급</dt><dd><img src={`${BASE_URL}assets/ui/supply-water.svg`} alt="물" />{snapshot.supplies.water}<img src={`${BASE_URL}assets/ui/supply-ration.svg`} alt="식량" />{snapshot.supplies.food}<em>이번 위임 사용 안 함</em></dd></div><div><dt>후퇴</dt><dd>HP {snapshot.retreatAtHp} 이하</dd></div><div><dt>시간 한도</dt><dd>전투 12턴</dd></div><div><dt>미확인 규칙</dt><dd>즉시 Decision · 대기</dd></div></dl>
    </aside>
    <div className="concurrent-task"><span><b>주인공</b><small>중앙 방 · 확장 회로 준비</small><em>{snapshot.protagonistTaskMinutes ? `${snapshot.protagonistTaskMinutes}분` : '준비 완료'}</em></span><i>{snapshot.protagonistTaskMinutes ? '동시에' : '기완료'}</i><span><b>별동대</b><small>400m 이동 + 실제 전투 턴</small><em>8분 + ?</em></span></div>
    <button type="button" className="submission-flow-primary" data-submission-primary="run-delegation" data-primary-key="SPACE" onClick={controller.performPrimaryAction}><span><small>{snapshot.protagonistTaskMinutes ? '두 작전은 같은 세계 시간을 사용' : '주인공 준비는 이미 완료'}</small><strong>작전 시작</strong></span><kbd>SPACE</kbd></button>
  </div>;
}

function DelegationResultStage({ snapshot, controller }: { readonly snapshot: SubmissionSnapshot; readonly controller: SubmissionController }) {
  const result = snapshot.delegationResult;
  if (!result) return null;
  const secured = result.outcome === 'SECURED';
  const outcomeCopy = result.outcome === 'SECURED' ? ['ROUTE SECURED', '동쪽 통로 확보'] : result.outcome === 'TIME_LIMIT' ? ['OPERATION PAUSED', '시간 한도에서 중단'] : result.outcome === 'RETREATED' ? ['DETACHMENT RETURNED', '후퇴 조건 발동'] : ['DETACHMENT DOWN', '별동대 전투 불능'];
  const notableSteps = result.policySteps.filter((step) => step.selectedPolicyId === 'PUSH' || step.selectedPolicyId === 'SHOOT' || step.reason.includes('최소 사거리')).slice(0, 4);
  return <div className={`submission-delegation-result ${secured ? 'is-secured' : 'is-paused'}`}>
    <div className="submission-sky" /><div className="submission-canopy" />
    <section className="operation-outcome"><small>{outcomeCopy[0]}</small><h1>{outcomeCopy[1]}</h1><p>{snapshot.notice}</p><div><span><b>{result.turns}</b><small>전투 턴</small></span><span><b>{result.damageTaken}</b><small>받은 피해</small></span><span><b>{result.elapsedMinutes}</b><small>별동대 분</small></span><span><b>{result.finalHp}</b><small>남은 HP</small></span></div></section>
    <section className="operation-causality">
      <article><i>1</i><small>SOURCE</small><strong>정찰된 두 적</strong><p>궁수 + 접근 전사<br />400m 알려진 통로</p></article><b>→</b>
      <article><i>2</i><small>DECISION</small><strong>{snapshot.policyChoice === 'PUSH_FIRST' ? '밀치기 우선' : '사거리 유지'}</strong><p>HP {snapshot.retreatAtHp} 이하 후퇴<br />12턴 시간 한도</p></article><b>→</b>
      <article className="is-result"><i>3</i><small>RESULT</small><strong>{secured ? '안전 경로 생성' : '위협 잔존'}</strong><p>{secured ? '확장 거점까지 이동 가능' : '정책 조정 후 재시도 가능'}<br />세계 시각 {snapshot.worldTime}</p></article>
    </section>
    <section className="operation-log"><header><span><small>ACTUAL POLICY LOG</small><strong>같은 좌표 규칙의 실제 행동</strong></span><b>{result.eventCount} events</b></header>{notableSteps.map((step, index) => <div key={`${step.turn}-${step.cycle}-${index}`}><i>T{step.turn}</i><img src={`${BASE_URL}assets/ui/intent-${step.selectedPolicyId === 'PUSH' ? 'push' : step.selectedPolicyId === 'SHOOT' ? 'shoot' : 'move'}.svg`} alt="" /><span><strong>{step.action?.label ?? policyName(step.selectedPolicyId ?? 'EMPTY')}</strong><small>{step.reason}</small></span>{step.action?.to && <em>{step.action.from.x},{step.action.from.y} → {step.action.to.x},{step.action.to.y}</em>}</div>)}</section>
    <aside className="shared-time-result"><small>SHARED WORLD TIME</small><div><span>주인공 준비 <b>{snapshot.protagonistTaskMinutes ? `${snapshot.protagonistTaskMinutes}분` : '기완료'}</b></span><span>별동대 작전 <b>{result.elapsedMinutes}분</b></span></div><p>합산하지 않고 더 오래 걸린 작전만큼 세계 시간이 흘렀다.</p></aside>
    <button type="button" className="submission-flow-primary" data-submission-primary={secured ? 'approach-anchor' : 'review-policy'} data-primary-key="SPACE" onClick={controller.performPrimaryAction}><span><small>{secured ? '주인공만 활성화할 수 있음' : '이전 결과는 기록에 남음'}</small><strong>{secured ? '경계 거점으로 이동' : '정책 다시 조정'}</strong></span><kbd>SPACE</kbd></button>
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

  const ready = snapshot.mode === 'ANCHOR_READY';
  const progress = snapshot.anchorProgress / 400;
  return <div className={`submission-anchor-approach ${ready ? 'is-ready' : ''}`}>
    <div className="corridor-moving-backdrop" style={{ backgroundPositionX: `${progress * -980}px` }} />
    <div className="corridor-moving-ground" style={{ backgroundPositionX: `${progress * -720}px` }} />
    <div className="safe-route-glow" /><div className="corridor-shade" />
    <div className="submission-travel-copy"><small>SECURED ROUTE · EAST</small><strong>{ready ? '확장 거점 도착' : '되찾은 길을 걷는다'}</strong><p>{ready ? '이 땅은 아직 결계 밖이다. 주인공이 마지막 연결을 수행한다.' : '위협은 제거됐지만, 직접 도착하기 전에는 내 영토가 아니다.'}</p></div>
    <div className="anchor-travel-party"><img src={`${BASE_URL}assets/submission/administrator-v1.png`} alt="관리자" /><span>주인공</span></div>
    <div className="submission-destination anchor-destination"><i>✦</i><span data-korean-critical>{ready ? '확장 거점' : `${400 - snapshot.anchorProgress}m`}</span></div>
    <div className="submission-distance" aria-label={`${snapshot.anchorProgress}미터 이동`}><i style={{ width: `${progress * 100}%` }} />{[100, 200, 300].map((meter) => <b key={meter} style={{ left: `${meter / 4}%` }} />)}<span>{snapshot.anchorProgress} / 400m</span></div>
    {ready
      ? <button type="button" className="corridor-primary anchor-activate" data-submission-primary="activate-anchor" data-primary-key="SPACE" onClick={controller.performPrimaryAction}><span><small>조건 충족 · 주인공 현장 도착</small><strong>확장 거점 활성화</strong></span><kbd>SPACE</kbd></button>
      : <button type="button" className="corridor-primary hold-control" data-submission-primary="approach-anchor" data-primary-key="D" onPointerDown={start} onPointerUp={stop} onPointerLeave={stop}><span><small>누르는 동안 이동</small><strong>경계 방으로 전진</strong></span><kbd>D</kbd></button>}
    <div className="submission-travel-notice" role="status"><i />{snapshot.notice}</div>
  </div>;
}

function ExpandedStage({ snapshot, controller }: { readonly snapshot: SubmissionSnapshot; readonly controller: SubmissionController }) {
  const contour = useMemo(() => computeBarrierContour(snapshot.world), [snapshot.world]);
  return <div className="submission-expanded">
    <div className="submission-sky" /><div className="submission-canopy" /><div className="expansion-radiance" />
    <section className="expanded-copy" data-critical-fit><small>TERRITORY INCORPORATED</small><h1 data-korean-critical>내 세계가<br />한 칸 커졌다.</h1><p>되찾은 길과 주인공의 거점 활성화가 결계를 동쪽으로 밀어냈다.</p></section>
    <div className="expanded-tile-field" data-critical-fit>
      {snapshot.world.tiles.map((tile) => <WorldTile key={tile.id} tile={tile} />)}
      {contour.map((segment) => <i key={segment.id} className={`barrier-edge is-${segment.edge.toLowerCase()}`} style={tilePosition(segment.x, segment.y)} />)}
      <div className="world-party is-expanded" style={tilePosition(1, 0)}><img src={`${BASE_URL}assets/submission/administrator-v1.png`} alt="관리자" /><span>확장 거점</span></div>
      <div className="active-spring" style={tilePosition(1, 0)}><img src={`${BASE_URL}assets/ui/supply-water.svg`} alt="활성화된 샘" /><b>+1</b><small>샘 활성화</small></div>
    </div>
    <div className="expansion-causality" data-critical-fit><span><b>✓</b><small>안전 경로</small></span><i>→</i><span><b>✦</b><small>주인공 거점</small></span><i>→</i><span><b>◇</b><small>결계 확장</small></span><i>→</i><span><img src={`${BASE_URL}assets/ui/supply-water.svg`} alt="" /><small>다음 원정 +1</small></span></div>
    <section className="expansion-state-ledger" data-critical-fit aria-label="편입된 타일의 독립 상태"><span><small>소속</small><strong>결계 안</strong></span><i /><span><small>안정</small><strong>거점 안정화</strong></span><i /><span><small>효용</small><strong>샘 가동</strong></span></section>
    <aside className="next-coordinates" data-critical-fit><small>NEXT EXPEDITION · WATER +1</small><strong data-korean-critical>다음 원정 한 번이 열렸다.</strong><p>북쪽 성소 · 동쪽 수관림 · 남쪽 회랑</p></aside>
    <button type="button" className="submission-flow-primary expanded-restart" data-submission-primary="restart-submission" data-primary-key="SPACE" data-critical-fit onClick={controller.performPrimaryAction}><span><small>FIRST EXPANSION COMPLETE</small><strong data-korean-critical>처음부터 다시 보기</strong></span><kbd>SPACE</kbd></button>
  </div>;
}

function SubmissionHud({ snapshot }: { readonly snapshot: SubmissionSnapshot }) {
  const frontierKnown = !['INTRO', 'CORRIDOR', 'CENTER_GATE', 'COMBAT'].includes(snapshot.mode);
  return <header className="submission-topbar">
    <div className="submission-mark"><i /><span><small>{snapshot.worldTime} · DAY 1</small><strong>{frontierKnown ? '물안개 전초지' : '깨어난 정원'}</strong></span></div>
    <div className="submission-resources" aria-label="원정 보급"><em className="submission-autosave"><i />자동 저장</em><span><img src={`${BASE_URL}assets/ui/supply-water.svg`} alt="물" /><b>{snapshot.supplies.water}</b></span><span><img src={`${BASE_URL}assets/ui/supply-ration.svg`} alt="식량" /><b>{snapshot.supplies.food}</b></span></div>
  </header>;
}

function WorldTile({ tile }: { readonly tile: SubmissionTileState }) {
  const state = tile.knowledge === 'UNSEEN' ? 'unseen' : tile.territory === 'INCORPORATED' ? 'owned' : 'frontier';
  return <article className={`submission-tile is-${state}`} style={tilePosition(tile.coordinate.x, tile.coordinate.y)} aria-label={`${tile.name}: ${tile.knowledge}, ${tile.territory}`}>
    <div className="tile-terrain" />
    {state === 'owned' && <span className="tile-heart">✦</span>}
    {state === 'frontier' && <span className="tile-question">?</span>}
    {tile.utilityKind === 'SPRING' && tile.utility === 'ACTIVE' && <span className="tile-utility"><img src={`${BASE_URL}assets/ui/supply-water.svg`} alt="샘" /></span>}
    <strong>{state === 'unseen' ? '' : tile.name}</strong>
    <small>{state === 'owned' ? '결계 안' : state === 'frontier' ? '미확보' : ''}</small>
  </article>;
}

function tilePosition(x: number, y: number): React.CSSProperties {
  return { left: `calc(38% + ${x * 224}px)`, top: `calc(50% + ${y * 148}px)` };
}

function policyName(policyId: SubmissionSnapshot['policy'][number]): string {
  return ({ EVADE: '회피', POSITION: '포지셔닝', SHOOT: '사격', PUSH: '밀치기', EMPTY: '빈 슬롯' })[policyId];
}
