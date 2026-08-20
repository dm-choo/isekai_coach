---
title: P22 Second Expansion Choice Contract
status: accepted
last_updated: 2026-08-20
related:
  - steam-overwhelmingly-positive-quality-bar.md
  - p21-first-contact-readiness-retrospective.md
  - ../submission/p20-expansion-spatial-result-contract.md
  - ../gameplay/world-map.md
---

# P22 두 번째 비지배 영토 선택 계약

## Goal

첫 번째 편입을 엔딩 이미지에서 다음 결정을 만드는 게임 동사로 바꾼다.

플레이어는 물안개 전초지의 샘을 활성화한 뒤 같은 영구 좌표에서 두 frontier를 본다. 짧고 보급이 들지 않지만 근접 압박이 큰 동쪽과, 물을 써야 하고 오래 걸리지만 사격 공간이 넓은 북쪽 중 하나를 선택한다. 선택한 땅에서 직접 중앙 방을 확보하고, 관찰한 공간 규칙을 정책으로 위임하고, 주인공이 거점을 연결해 두 번째 contour를 만든다.

## Failure evidence

- 현재 `EXPANDED`의 유일한 다음 입력은 전체 restart다.
- 첫 샘의 water `+1`, 공개된 다음 좌표와 늘어난 contour가 이후 가능한 행동이나 정책 판단을 한 번도 바꾸지 않는다.
- 따라서 현재 제품은 `영역을 확장했다`를 보여 주지만 `확장된 영역을 발판으로 다음 영역을 고른다`를 플레이시키지 않는다.

## State flow

첫 cycle은 보존한다. 첫 `activateAnchor` 뒤부터 다음을 추가한다.

```text
EXPANDED
→ EAST 또는 NORTH frontier 선택
→ CORRIDOR
→ CENTER_GATE
→ route-specific direct COMBAT
→ SCOUTED
→ POLICY_REVIEW
→ DELEGATION_PLAN
→ DELEGATION_RESULT
→ ANCHOR_APPROACH
→ ANCHOR_READY
→ COMPLETE
```

두 번째 cycle도 중앙 방을 직접 확보한 뒤에만 선택한 타일의 모든 통로가 정찰된다. REVEALED 타일을 즉시 위임하지 않는다. `COMPLETE`만 새 terminal mode이며 restart는 이때만 다시 나타난다.

## Persistent choice state

- 선택 가능한 frontier는 `next-east`와 `frontier-north` 두 개다.
- 방향 입력은 `selectedFrontierId`만 바꾸며 자원을 쓰지 않는다. 선택한 타일과 link가 함께 강조된 뒤 `SPACE`로 출발을 확정한다.
- 출발 뒤 `activeFrontierId`, 해당 route의 이미 지불한 water, corridor/anchor progress가 save에 남는다.
- 기존 v2 checkpoint는 무효화하지 않고 v3로 정규화한다. 첫 확장까지 완료한 v2 `EXPANDED` save는 두 frontier 선택 화면으로 복구된다.
- 첫 cycle의 implicit target은 계속 `frontier-east`다. 현재 하드코딩된 위임·거점·편입 target만 active target helper로 치환한다.
- incorporated tile 수는 별도 counter가 아니라 world state에서 파생한다.

## Non-dominated routes

| 선택 | 좌표 | 세계 비용 | 공간 압력 | 상대적 이점 | 상대적 손실 |
|---|---:|---:|---|---|---|
| 붉은 수관림 | `(2,0)` | 400m, water 0 | 가까운 근접 압박 | 더 빠름, 물 보존 | HP 손실이 큼 |
| 기울어진 성소 | `(1,-1)` | 600m, water 1 | 긴 사격선, 넓은 간격 | HP 손실이 작음 | 더 느림, 물 소비 |

두 route의 최선 결과는 모두 `SECURED`여야 한다. 동쪽은 시간·water에서 우월하고 HP에서 열위, 북쪽은 HP에서 우월하고 시간·water에서 열위여야 한다. 한 route나 한 policy가 모든 상태와 모든 축에서 우월하면 실패다.

새 적·능력·AI rule은 만들지 않는다. 기존 고블린 전사·궁수와 같은 12×3 BattleEngine을 시작 좌표와 turn budget이 다른 authored fixture로 재사용한다.

## Spring causality

북쪽은 다음 두 조건이 모두 참일 때만 선택할 수 있다.

```text
frontier-east.utility === ACTIVE
supplies.water >= 1
```

첫 샘 전에는 초기 water가 남아 있어도 source가 DORMANT라 북쪽 원정은 열리지 않는다. 첫 편입은 기존처럼 water `+1`을 적용하므로, 사전 휴식 여부와 무관하게 첫 확장 직후 북쪽 비용을 지불할 수 있다.

- 북쪽 타일을 고르는 동안에는 water가 변하지 않으며, `SPACE`로 출발을 확정할 때 water 1을 한 번만 쓴다.
- 같은 북쪽 타일 안의 policy 재시도에는 water를 다시 쓰지 않는다.
- 물이나 active spring이 없는 입력은 world revision·time·HP·selection을 전혀 바꾸지 않는다.
- 거부 이유는 toast가 아니라 해당 북쪽 link의 water glyph와 `필요 1 / 현재 n` 상태로 남는다.
- 직접 탐사 패배로 첫 영토에 후퇴해도 이미 쓴 water는 돌려주지 않는다. 확정한 route는 비용 없이 다시 진입할 수 있고, 확정 전 water가 0이어도 동쪽은 계속 선택 가능한 fallback이다.

## Spatial UI

- P20의 tile field, coordinate projection, outer contour, spring, protagonist marker를 그대로 사용한다.
- `frontier-east`가 두 link의 origin이다. 동쪽과 북쪽 tile 자체가 동일한 비중의 button이다.
- `D/→`는 동쪽, `W/↑`는 북쪽이며 pointer와 같은 controller transition을 호출한다.
- 방향 입력과 pointer는 선택만 바꾸고, `SPACE`만 출발을 확정한다. 선택 전에는 출발 primary가 비활성이다.
- 각 link는 항상 거리·시간·water·위협 실루엣을 형태로 보여 준다. hover/focus는 상세 수치만 강화한다.
- 추천, 성공 확률, 비교표, 새 dashboard를 만들지 않는다.
- 남쪽 tile은 P22에서 reveal하지 않는다. 이유 없이 보이지만 선택할 수 없는 세 번째 option을 남기지 않는다.
- 선택한 link만 밝아지고 선택하지 않은 tile은 `REVEALED / OUTSIDE`로 세계에 남는다.

## Direct learning and delegation

- 선택 후 짧은 본대 통로 이동과 중앙 직접 조우 하나를 수행한다.
- 중앙 승리 전 `corridorsScouted=false`; 승리 확인 뒤 선택한 tile만 `SCOUTED=true`가 된다.
- 직전 직접 전투 기록을 같은 두 policy response로 검토한다.
- 위임 계획과 결과는 active route의 거리·travel time·known threat·최종 좌표를 표시한다.
- 직접 전투와 위임은 같은 BattleEngine ability·intent·collision·time rule을 쓴다.
- 경로 확보, 주인공 거점 도착, 편입은 계속 세 개의 독립 전이다.

## Final world state

동쪽과 북쪽 어느 branch든 두 번째 활성화 뒤 다음을 만족한다.

- mode `COMPLETE`
- incorporated tile 3
- outer contour 8
- 선택한 tile `INCORPORATED`
- 선택하지 않은 tile `REVEALED / OUTSIDE`
- `frontier-east` spring `ACTIVE`
- protagonist는 선택한 두 번째 anchor에 있음
- water·HP·world time은 선택 비용과 전투 결과를 유지
- reload 뒤 동일

## Automated acceptance

- v2→v3 migration과 선택 전·선택 후·water 소비 직후·정찰 후·위임 중단 후·완료 후 save round-trip
- spring DORMANT 또는 water 0인 북쪽 거부와 전체 state 불변
- 동쪽은 water 0에서도 선택 가능
- 네 route×policy 조합의 deterministic replay, bounded termination과 비지배 result vector
- 중앙 승리 전후 scouting boundary와 비선택 tile 불변
- routeSafe만으로 편입 불가, protagonist 도착만으로도 편입 불가, activation 뒤에만 편입
- 양 branch incorporated 3·contour 8·비선택 OUTSIDE
- 1280×720·960×720, text-off, pointer·keyboard parity와 browser error 0
- 기존 P1~P21, Slice1·Slice2 누적 회귀 유지

## Human acceptance

P22 technical gate 뒤 P21과 묶어 신규 사용자 3명에게 한 번만 맡긴다.

- 2명 이상이 선택 전 두 경로의 차이를 HP·time·water 중 두 축으로 설명한다.
- 2명 이상이 첫 샘 때문에 북쪽이 열렸다고 설명한다.
- 2명 이상이 선택하지 않은 땅이 아직 결계 밖에 남았다고 설명한다.
- 2명 이상이 외부 지시 없이 두 번째 확장을 시작한다.
- 서로 다른 HP·water checkpoint에서 선택 선호가 실제로 바뀌며, 무엇을 포기했는지 말할 수 있다.

## Out of scope

- 남쪽 세 번째 frontier
- 신규 적·boss·ability·AI policy
- 시설·반복 생산·새 resource
- 장비·파티 구성·동료 추가
- procedural world와 범용 campaign framework
- 세 번째 확장 cycle
- 새 operation dashboard
- audio·animation production과 Steam packaging

P22의 종료 조건은 콘텐츠 양이 아니다.

> 첫 영토의 효용이 다음 영토 선택을 실제로 바꾸고, 그 비용이 지속 상태에 남으며, 같은 공간·정책 규칙으로 두 번째 영구 확장이 발생한다.
