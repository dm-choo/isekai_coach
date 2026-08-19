---
title: P18 Delegation Result Retrospective
status: technical-candidate
last_updated: 2026-08-19
related:
  - p18-delegation-result-contract.md
  - p17-retrospective.md
  - acceptance-evidence-matrix.md
---

# P18 위임 결과의 공간 기록 회고

## Result

위임 결과의 대형 outcome 제목, 설명 문단, source/decision/result 세 card, table형 policy log와 별도 공유 시간 설명을 제거했다. 상단 400m world route는 선택 정책에서 알려진 두 위협과 경계 방까지 이어지고, 실제 `routeSafe`에 따라 TIME_LIMIT은 주황 점선·살아있는 위협·12턴 pause, SECURED는 청록 실선·제거 표식·열린 경계 방·check가 된다.

중앙은 위임에 사용된 동일 BattleEngine의 실제 12×3 최종 상태다. `result.route`의 이동 좌표를 보라 trace cell로, ally와 두 enemy의 최종 위치·HP·사망 상태를 sprite와 bar로 렌더한다. 아래에는 실제 policy step 최대 6개의 turn·action icon·도착 좌표가 이어지고 reason은 hover title로 남는다. 우측 네 metric은 turns·damage·elapsed·finalHp만, 하단은 실제 주인공 작업과 별동대 elapsed가 갈라졌다 shared `max()`로 합쳐지는 결과만 소유한다.

primary는 TIME_LIMIT에서 `pause→선택 정책→SPACE`, SECURED에서 `주인공→경계 거점→SPACE` 하나다. 결과에 없는 중단 world 거리·성공률·예상 손익은 만들지 않았다.

## Verification evidence

- `npm run typecheck`: pass
- 13 files, 93 unit tests: pass
- `npm run verify:submission:encounter-transition`: `ENCOUNTER_TRANSITION_PASS`; TIME_LIMIT 12턴·피해 2·HP 8·20분, final unit 3·living enemy 1, trace length 32, routeSafe false, shared 20, text panel 0, 4:3 overflow 0, browser error 0
- `npm run verify:submission:p3`: KEEP_RANGE TIME_LIMIT/HP 8/20분과 PUSH_FIRST SECURED/HP 4/14분, routeSafe·anchorPrepared true와 territory OUTSIDE 유지, 두 결과의 actual grid/state parity, 4:3 overflow 0, browser error 0
- production build: pass; P17 공개본 대비 CSS `113,059→117,391` bytes(+4,332), SubmissionApp JS `113,332→115,778` bytes(+2,446)
- 직접 비교: focused `19-delegation-time-limit-result`, `20-delegation-time-limit-text-off`, `21-delegation-time-limit-4x3`; golden `10-delegation-result`, `10-delegation-result-text-off`, `11-delegation-result-4x3`

exact-SHA 누적 RC와 공개 배포 증거는 implementation commit 뒤 현재 SHA에서 새로 수집한다. 자동·시각 증거는 결과 parity와 공간 인과를 닫지만, 신규 사용자가 KEEP_RANGE를 안전하지만 느린 실패, PUSH_FIRST를 빠르지만 피해가 큰 성공으로 설명하는지는 human gate 전까지 REQUIRED다.

## Initial model

- **사실:** result는 outcome·turn·damage·elapsed·finalHp뿐 아니라 12×3 finalState, movement route, policySteps와 actionTrace를 이미 소유한다.
- **문제:** 기존 UI는 가장 강한 실제 좌표 증거를 숨기고 요약 문장·card·로그를 읽게 했다.
- **가설:** P17의 world route와 직접 전투에서 학습한 12×3 grid를 위·아래에 놓으면, `맡긴 길의 상태`와 `그 안에서 실제로 일어난 일`을 같은 공간 문법으로 복원할 수 있다.
- **제약:** `result.route`는 world meter progress가 아니라 combat grid movement다. 둘을 같은 좌표처럼 그리지 않는다.

## Judgment log

1. 상단 world route는 400m와 routeSafe만 소유하고, TIME_LIMIT의 중단 위치는 표시하지 않았다. simulation에 그 값이 없기 때문이다.
2. 중앙 actual grid는 36 cell을 직접 렌더하고 finalState unit을 좌표 백분율로 배치했다. 별도 재연용 state를 만들지 않았다.
3. 죽은 적은 제거하지 않고 흐린 sprite+slash로 남겼다. SECURED의 route threat 제거 표식이 어떤 실제 적 결과에서 나왔는지 연결하기 위해서다.
4. 전체 event log 대신 정책이 실제 action을 가진 step 중 turn 또는 policy가 바뀌는 지점을 최대 6개 골랐다. 인과를 남기되 읽기 경쟁을 막기 위해서다.
5. TIME_LIMIT과 SECURED에 같은 layout을 사용하고 색·route·enemy state·primary만 결과에 맞게 변하게 했다. 결과마다 새 화면 문법을 학습시키지 않기 위해서다.
6. P17 회고의 규칙에 따라 구현 직후 state assertion보다 text-off를 먼저 비교했다. policy source, route verdict, actual grid, four metrics, branch/merge와 next action이 모두 남는 것을 확인했다.

## Cognitive errors and misses

- `result.route`라는 이름만 보면 400m world route의 진행 거리로 오해하기 쉽다. 구현 전에 타입과 simulation을 감사해 이것이 동료의 combat grid 이동 history임을 확인했고, world track에는 확보 여부만 사용했다. 이 감사를 생략했다면 TIME_LIMIT이 특정 meter에서 멈췄다는 허위 표현을 만들었을 것이다.
- SECURED 장면의 제거된 적 sprite는 의도적으로 매우 흐려 text-off에서 slash가 먼저 보인다. 자동화는 cleared count와 living enemy 0을 검증하지만, 사람이 이것을 `위협 제거`로 읽는지는 아직 증거가 없다.
- action token의 좌표는 실제지만 `1,0` 같은 수치를 읽지 않는 사람에게는 icon sequence만 남는다. 상세 policy reason은 title에 있으므로 기본 화면의 부담은 줄었지만, 손익 설명 가능성은 human gate가 필요하다.
- P18은 기존 결과 CSS를 제거했지만 actual grid와 두 결과 문법 때문에 bundle이 CSS +4,332, JS +2,446 bytes 늘었다. 제출 범위에서는 수용하되 이후 장면에서 또 다른 grid나 metric vocabulary를 만들 근거는 없다.

## User and delegation boundary

사용자가 정한 방향은 공간 좌표가 고유한 정책 오토배틀러, 텍스트를 몰라도 거친 의미가 보이는 UI, 같은 규칙의 직접/위임, 결과에서 영역 확장으로 이어지는 경험이다. 12×3 actual record, world route verdict와 four metric 배치는 그 방향 안에서 자율 결정했다. 정책 손익·전투 수치·경로 안전화 조건은 변경하지 않았다.

## Process and efficiency

P17 다음 state를 같은 focused lifecycle에서 즉시 실행해 TIME_LIMIT 검증 비용을 거의 늘리지 않았다. 기존 P3 golden에는 공통 `assertOperationResultPresentation`을 만들어 TIME_LIMIT과 SECURED를 같은 규칙으로 비교했고, public verifier도 저장된 `delegationResult`를 직접 source로 사용하도록 했다. P17 공개 검증에서 생긴 evidence-source 오류를 반복하지 않기 위해 production에서 저장되는 값만 public assertion에 사용했다.

별도 fixture나 새 simulation은 만들지 않았고, 93개 rule test와 두 기존 browser lifecycle을 재사용했다. 반면 CSS는 한 줄 압축 파일에 관계형 스타일이 계속 누적되어 수정·삭제 비용이 높아지고 있다. P19에서는 먼저 P17/P18 route·parallel·goal primitive를 class 조합으로 재사용하며, 새 시각 vocabulary가 필요하면 독립 component stylesheet로 이동하는 편이 총 비용이 낮은지 판단한다.

## Next rules

1. 이름이 같은 `route`라도 world 거리와 combat 좌표의 authority를 구현 전에 구분한다.
2. 결과 화면은 예상치가 아니라 실제 finalState·trace·state transition만 사용한다.
3. 성공/중단은 같은 layout에서 route·unit state·primary 차이로 표현한다.
4. public 검증은 exportSave에 실제 저장된 결과만 authoritative 비교에 사용한다.
5. 새 장면은 P17/P18의 route·goal·parallel·metric vocabulary를 우선 조합한다.

## Next task

P19는 SECURED 결과 뒤 주인공이 경계 거점까지 직접 이동하고 활성화하는 장면을 소유한다. 현재 화면은 다시 큰 영문 label·제목·설명 문단이 앞서고, D 이동과 `안전 경로`, `주인공 현장 도착`, `아직 내 영토 아님`의 차이를 텍스트로 설명한다. 확보된 route 위에 주인공의 실제 0→400m 이동, 아직 닫힌 결계 거점, 도착 뒤 SPACE 활성화만 남겨 `동료가 길을 열고 주인공이 영역을 연결한다`는 역할 분리를 행동으로 읽히게 해야 한다.
