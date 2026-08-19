---
title: P18 Delegation Result Contract
status: under-validation
last_updated: 2026-08-19
related:
  - p17-delegation-route-contract.md
  - sector-1-golden-run.md
  - acceptance-evidence-matrix.md
---

# P18 위임 결과의 공간 기록 계약

## Goal

위임 실행 뒤 플레이어가 결과 설명 대시보드를 읽는 대신 `선택 정책 → 실제 전투 좌표와 행동 → 피해·시간 → 경로 확보 또는 중단`을 한 장면에서 역추적하고 다음 행동을 고른다.

## Authoritative boundary

- `DelegatedOperationResult`의 outcome, turns, damageTaken, elapsedMinutes, finalHp, route, policySteps, finalState와 eventCount만 실제 결과를 만든다.
- world 400m route는 확보 여부만 표시한다. simulation에 없는 중단 거리·성공 확률·예상 HP는 만들지 않는다.
- actual grid는 위임도 직접 관전과 같은 12×3 BattleEngine 좌표를 사용했음을 보인다.
- TIME_LIMIT·RETREATED·DEFEAT는 routeSafe를 만들지 않고 policy review로, SECURED만 경계 거점 접근으로 이어진다.
- 공유 시간은 주인공 작업과 별동대 elapsed의 합이 아니라 `max()`다.

## Scene contract

1. 상단 world route는 선택 정책 source, 알려진 두 위협, 400m 경계 방과 실제 routeSafe/paused verdict를 잇는다.
2. 중앙 12×3 grid는 실제 이동 trace cell, 최종 ally/enemy 좌표와 HP·사망 상태를 렌더한다.
3. 실제 policy step 최대 6개를 turn·icon·도착 좌표로 grid 아래에 잇고 상세 reason은 demand title이 소유한다.
4. 우측 metric은 turns, damage, elapsed, finalHp 네 개만 표시한다.
5. 하단 병렬 lane은 실제 protagonist minutes와 operation minutes가 갈라졌다 합쳐지며 shared `max()`를 보여 준다.
6. 대형 outcome heading, 설명 문단, 세 장 causality card, table log, 별도 time 설명문은 0개다.
7. primary는 SECURED면 `주인공→경계 거점→SPACE`, 그 외는 `pause→선택 정책→SPACE` 하나다.

## Acceptance

- TIME_LIMIT 장면은 routeSafe false, living enemy 1 이상, turn 12, review-policy primary다.
- SECURED 장면은 routeSafe true, known threat 2가 cleared, living enemy 0, approach-anchor primary다.
- 양쪽 모두 grid cell 36, final unit 3, traced cell 1 이상, action token 1 이상, metric 4를 가진다.
- DOM의 outcome·turn·damage·elapsed·finalHp·route trace length가 `DelegatedOperationResult`와 같다.
- shared minutes가 `Math.max(protagonistTaskMinutes, elapsedMinutes)`와 같다.
- 1280×720과 960×720에서 route, grid, metrics, shared time과 primary가 viewport 안이고 overflow 0이다.
- text-off frame에도 policy source, route threat/goal state, actual grid/trace, four metrics, parallel time과 next action이 남는다.
- browser error 0이다.

자동 검증은 실제 결과와 표현의 parity를 판정한다. 신규 사용자가 TIME_LIMIT의 안전하지만 느린 손익과 SECURED의 빠르지만 피해가 큰 손익을 설명하는지는 human gate 전까지 REQUIRED다.
