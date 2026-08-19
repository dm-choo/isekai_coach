---
title: P14 Encounter Return Retrospective
status: technical-candidate
last_updated: 2026-08-19
related:
  - p14-encounter-return-contract.md
  - acceptance-evidence-matrix.md
  - p13-retrospective.md
---

# P14 전투 결과와 복도 복귀 회고

## Result

첫 합동 전투 승리에서 대형 `PATH SECURED / 인카운터 해결 / HP와 소요 턴 유지` 결과 카드를 제거했다. 살아 있는 두 캐릭터와 현재 HP bar, 오른쪽 출구로 이어지는 청록 path·check, CSS로 그린 clock과 `+6`, 하단 `check → SPACE`만 남는다.

SPACE를 누르면 전투 최종 HP가 원정 vitals로, 전투 turn이 world minute로 반영되고 같은 복도의 200/400m 지점으로 돌아간다. 다음 primary action은 다시 `D`다. 첫 단독 승리, 중앙 방 승리와 기존 Slice2 결과 presentation은 변경하지 않았다.

## Verification evidence

- `npm run typecheck`: pass
- `npm run verify:submission:encounter-transition`: `ENCOUNTER_TRANSITION_PASS`, 전투 6턴, time applied 6, HP `12/10`, progress 200, next input D, 4:3 overflow 0, browser error 0
- 직접 비교: `04-path-secured`, `05-path-secured-4x3`, `06-corridor-resumed`
- 공개형 기본 속도/localStorage 경로: P14 결과와 복귀까지 통과, 단일 Vite 서버가 별도 `/slice1/` build를 제공하지 않아 마지막 route-title 회귀에서만 예상 중단

이 증거는 현재 working tree의 P14 focused/느린 로컬 경로다. exact-SHA 누적 RC와 실제 공개 다중 경로는 커밋·배포 뒤 별도로 판정한다. check와 clock의 의미 이해는 사람 증거가 아니다.

## Initial model

- **사실:** victory에서 적은 이미 사라졌고 파티 HP bar도 남았지만, 중앙 대형 결과 카드가 그 world 결과를 덮고 같은 내용을 문장으로 설명했다.
- **가설:** 빈 적 진영과 파티 상태를 그대로 두고 출구 방향의 checked path와 clock delta만 추가하면 결과와 비용이 설명문보다 먼저 읽힌다.
- **제약:** `completeEncounter`의 authoritative HP·turn·world time·200m 규칙을 바꾸지 않고 첫 합동 승리 presentation만 소유한다.
- **판정 기준:** 표시된 `+turn`과 실제 world-minute 증가, 전투 최종 HP와 복귀 vitals, 전투 전후 corridor progress가 정확히 일치해야 한다.

## Judgment log

1. 결과 화면을 새 summary panel로 만들지 않고 빈 적 진영 자체를 승리의 첫 증거로 사용했다. 이미 world가 가진 정보를 UI로 다시 번역하지 않기 위해서다.
2. 청록 line은 파티에서 오른쪽 출구로 이어지고 중앙 check를 지난다. `적 처치`보다 이 게임의 핵심인 `길을 다시 이용 가능하게 함`을 전경화하기 위해서다.
3. world time 전체를 전투 HUD에 추가하지 않고 clock `+turn`만 결과에 표시했다. 원정 clock은 복도 topbar가 다시 소유하고, 결과는 이번 전투가 더한 비용만 소유한다.
4. Unicode clock이 캡처에서 문자처럼 보여 CSS border와 두 바늘로 다시 그렸다. 낯선 glyph나 글꼴 차이에 의미가 의존하지 않게 하기 위해서다.
5. focused P13 verifier를 encounter lifecycle로 확장했다. 같은 실제 진입 경로를 중복 실행하는 새 스크립트보다 reveal→input→victory→return 한 route가 전이 전체를 소유하는 편이 경제적이기 때문이다.

## Cognitive errors and misses

- 첫 자동 통과 캡처에는 공용 `<승리>` banner와 `현재 조우의 모든 적이 무너졌다` notice가 남아 있었다. 새 result component 내부만 title 0을 검사해 화면 전체의 중복 의미를 놓쳤다. 직접 캡처 후 둘을 제거하고 assertion을 전역 banner/notice까지 넓혔다.
- 첫 report의 reveal enemy 수가 0으로 기록됐다. 조우 진입 때의 수를 저장하지 않고 복도 복귀 뒤 같은 DOM query를 실행했기 때문이다. P12에서 이미 `순간 사건과 마지막 DOM snapshot을 혼동하지 않는다`고 적었는데 같은 종류의 오류를 반복했다. 규칙을 기억하는 것만으로 부족했고, state 진입 즉시 immutable evidence object를 만드는 구조가 필요하다. reveal 시점에 count를 고정하도록 바꿨다.
- localStorage의 마지막 save가 combat 진입 직전 195m일 수 있어 이를 현재 전투 world minute로 간주하면 200m 경계의 travel 2분을 누락한다. 공개 검증은 CombatStage가 받은 현재 `worldMinute`를 stable data로 노출해 그 값과 결과 save를 비교하도록 했다.
- 느린 공개형 검증은 P14까지 성공했지만 로컬 단일 Vite가 production의 `/slice1/`·`/slice2/` 분리 build를 재현하지 않는다. 이를 전체 공개 PASS로 부르지 않고 P14 구간 증거로만 사용한다.
- 첫 exact-SHA RC는 P12 동료 실행 result를 찾은 직후 300ms phase가 끝나 enemy notice가 나타나는 경합으로 중단됐다. 제품 회귀가 아니라 순간 frame을 지나치게 짧게 만든 fixture 오류였다. P12 policy fixture의 phase delay를 production과 같은 배율로 늘리고 반복 실행해, 우연히 특정 frame을 잡아야만 통과하는 gate를 제거했다.

## User boundary and delegated judgment

사용자가 고정한 것은 월드 시간, 전투 한 턴=1분, 통로의 연속 이동, 설명 없이 읽히는 시각 인과와 레퍼런스 충실도다. 구현자가 결정한 것은 checked path의 위치, clock delta, 142px resume gate, 첫 합동 조우에만 적용하는 분기다. 보상·회복·시간 수치와 중앙 방 결과는 바꾸지 않았다.

## Efficiency

P13의 약 10초 route를 승리·복귀까지 확장해 약 28초의 lifecycle gate로 만들었다. 별도 진입 fixture나 두 개의 중복 journey를 만들지 않고, 한 번의 단독 전투·동료 해방·200m 이동 비용으로 P13과 P14를 함께 검증한다. 최종 exact-SHA에서만 4타일 Slice2 장시간 회귀를 부담한다.

낭비는 자동 assertion 범위를 component 내부로 좁혀 visual review 뒤 한 번 더 실행한 것, 이미 회고한 DOM 수명 오류를 반복한 것이다. 다음 Task부터 browser report는 `const evidenceAtState = ...`를 해당 state assertion 직후 만들고, 화면 중복 검사는 component selector가 아니라 의미 owner 전체를 대상으로 한다.

## Next rule

1. 결과 state에 진입하는 즉시 그 state의 수치·DOM 증거를 immutable object로 저장한다.
2. 새 정보 owner가 생기면 같은 의미의 공용 banner·notice·toast까지 전역 감사한다.
3. 결과 UI의 projected delta는 적용 뒤 authoritative state와 동등성으로 검증한다.
4. 아이콘은 특정 폰트 glyph보다 기존 asset 또는 CSS geometry를 우선한다.
5. 한 실제 journey의 연속 전이는 가능한 한 하나의 focused lifecycle gate가 소유한다.

## Next task

P15는 중앙 방 승리→네 통로 정찰의 핵심 인과를 소유한다. 현재 중앙 전투도 대형 결과 overlay를 거친 뒤 `CENTRAL ROOM SECURED`, 큰 제목, 설명문과 도식이 있는 별도 화면으로 이동한다. 중앙 방의 적 소멸이 네 방향 통로 reveal을 일으키는 모습을 같은 world map 변화로 보여 주고, 플레이어가 이를 `전투 보상`이 아니라 `공간을 알아낸 원인`으로 읽게 해야 한다.
