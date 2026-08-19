---
title: P15 Central Scouting Retrospective
status: technical-candidate
last_updated: 2026-08-19
related:
  - p15-central-scouting-contract.md
  - acceptance-evidence-matrix.md
  - p14-retrospective.md
---

# P15 중앙 방 확보와 네 통로 정찰 회고

## Result

중앙 수비대 승리 뒤 대형 `PATH SECURED / 인카운터 해결` 카드를 제거했다. 같은 전장에는 살아 있는 파티, 현재 HP, 확보된 중앙점 check, 흐린 네 방향 spoke, 실제 전투 turn과 같은 clock delta, `check → four-direction glyph → SPACE`만 남는다.

SPACE 뒤 별도 설명 화면 대신 중앙점에서 북·동·남·서 네 선과 방이 순차적으로 열린다. 발견된 위험 2개는 해당 방향에 붙고, 직전 전투의 정책 문제는 좌하단 `동료—거리 1—적—crossed shoot—record`로 축약된다. 우하단 `record → SPACE`가 정책 검토로 이어진다. 기존 대형 제목·설명, `1 중앙 방 확보 → 4 모든 통로 정찰` 문장 카드와 관찰 메모는 제거했다.

## Verification evidence

- `npm run typecheck`: pass
- `npm run verify:submission:encounter-transition`: `ENCOUNTER_TRANSITION_PASS`; 중앙 전투 8턴, world time +8, 확인 전 미정찰, 확인 후 route/room 각 4·위험 2, 양 화면비 overflow 0, browser error 0
- `npm run verify:submission:p2`: `SCOUTED`, 400m, 10:26, 중앙 전투 8턴, `corridorsScouted=true`, 4:3 overflow 0, browser error 0
- production build를 정상 재생 속도로 구동한 public-style 경로: 중앙 전투 6턴과 실제 world time +6, 확인 전후 정찰 경계와 새 두 화면까지 통과했다. 단일 root preview가 별도 `/slice1/` build를 제공하지 않아 마지막 route-title 회귀에서만 예상 중단했다.
- exact-SHA `cdab90618fa83170989f9ac09650530c36ddcc08` 누적 RC: `TECHNICAL_PASS`, worktree clean, 제출본 10개 단계와 Slice1·Slice2 회귀 전부 통과
- 공개 release `/srv/ooh/releases/20260819T133424Z-cdab906-submission`: root와 Slice1/2 health pass
- `npm run verify:submission:public`: `PUBLIC_BROWSER_PASS`; 첫 합동전 +11분/200m 복귀, 중앙 전투 +6분, 확인 전 false/후 네 통로, `/slice1/`·`/slice2/` title, browser error 0
- 직접 비교: `07-center-secured`, `08-center-secured-4x3`, `09-four-corridors-scouted`, `10-four-corridors-text-off`, `11-four-corridors-scouted-4x3` 및 public-style `07`, `08`

기술·배포 증거는 닫혔지만 아이콘만 본 신규 사용자의 의미 이해는 자동 통과가 아니다. P15는 technical candidate이며 human gate는 REQUIRED다.

## Initial model

- **사실:** controller는 중앙 승리 확인 뒤에만 `knowledge=SCOUTED`, `corridorsScouted=true`, `threat=CONTESTED`를 만들고 있었다.
- **문제:** presentation은 같은 인과를 대형 제목, 설명 문단, prose causality card로 중복 소유했다. 지도는 보조 그림처럼 오른쪽에 밀려 있었다.
- **가설:** 전투 결과에서는 중앙점만 확보하고, 다음 world state에서 중앙이 네 방향을 실제로 reveal하면 읽기 비용이 줄고 영역 확장이라는 핵심 경험이 전경화된다.
- **제약:** 적 구성·전투 수치·정책 기록·world transition은 바꾸지 않고 information ownership만 바꾼다.

## Judgment log

1. 중앙 승리와 정찰 완료를 한 frame에서 동시에 표시하지 않았다. SPACE 전에는 중앙점과 흐린 spoke만, authoritative state 변경 뒤에만 방과 위험을 보여 상태 시점을 보존했다.
2. 지도는 화면 중앙의 가장 큰 owner로 옮겼다. `1→4` 숫자 카드는 같은 관계를 두 번 설명하므로 제거했다.
3. 네 방 내부의 Unicode 방향 화살표를 없애고 위치 자체와 동일한 node 형태로 방향을 전달했다. 특정 글꼴 glyph를 해석해야 하는 비용과 회전된 화살표의 모호함을 피했다.
4. 위험은 문장 목록이 아니라 실제 방향선 옆의 붉은 attack asset으로 붙였다. 아직 위협이 제거되지 않았다는 `CONTESTED` 상태도 청록 route와 붉은 marker의 대조가 소유한다.
5. 다음 정책 단계의 긴 설명은 없앴지만 연결 자체는 버리지 않았다. 직전 전투의 실제 sprite·거리 1·차단된 사격·기록 glyph를 재사용해 다음 SPACE의 목적을 예고했다.
6. P13/P14 focused route를 중앙까지 연장했다. 100m·전투·200m 복귀·400m·중앙 전투를 한 lifecycle이 소유하므로 확인 전후 상태를 별도 fixture 없이 비교할 수 있다.

## Cognitive errors and misses

- 첫 focused 실행에서 중앙 전투를 대비해 smoke player가 모든 enemy intent 위험을 우선 회피하게 바꿨다. 그러자 첫 근접 조우에서도 공격 대신 이동을 반복해 240 state step을 소진했다. 제품 문제가 아니라 verifier 정책의 과잉 일반화였다. 이미 golden에서 검증된 것처럼 지속 장판(`GROUND`)만 우선 회피하고 나머지는 거리·공격을 함께 평가하도록 수정했다.
- 첫 정찰 assertion은 `.scout-line,.scout-room` 두 집합을 합쳐 놓고 expected 4로 판정해 실제 8개를 실패시켰다. 계약은 route 4와 room 4를 별개로 말했는데 selector는 합집합이었다. 두 assertion으로 분리했다.
- P2 전용 golden stage는 첫 단독 튜토리얼에서 이동 하나 뒤 action dock이 바뀌는데도 일반 smoke player가 두 번째 이동 버튼을 찾았다. 전체 P5에서는 별도 튜토리얼 검증이 먼저 행동해 우연히 가려졌던 fixture 결함이다. stage flag와 무관하게 첫 턴은 authored `W 1회 → SPACE`를 사용하도록 공통 경로를 고쳤다.
- 처음에는 기존 네 방의 Unicode 화살표를 그대로 유지했다. diamond 자체가 45도 회전하므로 방향 glyph도 회전되어 오히려 잘못 읽힐 수 있음을 코드 감사에서 뒤늦게 확인했다. 각 node의 위치가 이미 방향을 소유하므로 내부를 동일한 point로 바꿨다.
- production-style 공개 검증은 새 P15까지 성공한 뒤 로컬 단일 preview의 `/slice1/` title에서 실패했다. 이 결과를 공개 PASS라고 부르지 않고 P15 구간 증거로만 분리했다.

## Process and efficiency

계약→작은 presentation 분기→기존 lifecycle 확장→캡처 비판 순서는 유효했다. controller나 전투 engine을 건드리지 않아 rule regression surface가 작았고, 새 전용 journey를 만들지 않아 중복 탐사 비용도 줄었다. text-off와 4:3 캡처를 같은 run에서 생성해 별도 서버 기동도 피했다.

낭비는 smoke player를 새로 일반화하려다 이미 검증된 회피 기준을 벗어난 것, 합집합 selector를 계약의 개별 개수와 혼동한 것, P2 stage-only 결함을 사전에 보지 못한 것이다. 다음 Task에서는 검증용 AI 변경도 제품 정책 변경처럼 `기존 fixture 결과 불변`을 먼저 확인하고, 개수 assertion은 계약 명사 하나당 selector 하나를 둔다.

## Next rules

1. authoritative 상태 변화 전후를 한 lifecycle에서 비교하되, presentation이 미래 상태를 선반영하지 않는지 확인한다.
2. 공간 관계는 중앙·선·node·marker가 먼저 소유하고, prose card로 중복 설명하지 않는다.
3. verifier 자동 플레이 정책을 바꿀 때는 가장 작은 기존 조우를 먼저 재실행한다.
4. selector 합집합의 count를 서로 다른 의미 집합의 count로 사용하지 않는다.
5. focused·local production·public 결과를 서로 다른 증거 층으로 기록한다.

## Next task

P16은 정찰 직후 정책 검토를 소유해야 한다. 현재 화면은 `왜 사격하지 못했을까?`, 설명 문단, 두 장의 긴 선택 카드와 5-slot 문자열을 동시에 보여 다시 text dashboard로 돌아간다. P15가 넘긴 `동료—거리 1—적—사격 차단—기록`을 같은 시각 문법으로 확대하고, 실제 한 규칙의 before/after 공간 결과를 먼저 비교한 뒤 선택하도록 만들어야 한다.
