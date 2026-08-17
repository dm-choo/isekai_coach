---
title: Combat View UX
status: accepted
last_updated: 2026-08-17
related:
  - ../../submission/vertical-slice.md
  - ../../gameplay/combat/turn-and-intent.md
  - ../../art/ui/combat-view/index.md
  - ../flows/replay-and-analysis.md
---

# Combat view UX

Slice 1은 개발자용 전투 dashboard가 아니라 아마존 정글 결계문 앞의 보스방이다. 화면의 주인공은 장면과 전투 애니메이션이며, HUD는 지금 무엇을 할 수 있고 무슨 일이 일어나는지만 짧게 전달한다.

## Hierarchy

1. 장면: 이어진 흙바닥, 정글 canopy, 결계문, 관리자·궁수·수호자의 큰 실루엣
2. 전투 인과: 적 Intent, 이동/공격 결과, 투사체·타격·stun·죽음
3. 현재 주체: `<내 턴>`, `<아군 턴>`, `<적 턴>` 배너와 해당 unit의 animation/focus
4. 최소 HUD: 관리자·동료 HP/AP, 보스 이름·HP·phase, 현재 Intent
5. 선택 UI: 하단 중앙의 `밀치기`, `내려찍기` action bar와 WASD 이동 표시

Darkest Dungeon처럼 scene-first combat composition과 contextual bottom controls를 기본으로 삼고, DNF처럼 깊이와 캐릭터 overlap을 허용하며, One Step From Eden처럼 필요한 순간에만 위협 cell을 읽기 좋게 드러낸다. 참조의 표면을 복제하지 않고 정보 계층을 가져온다.

## Turn readability

- 전투 진입 시 짧은 보스방 reveal 후 `<내 턴>`으로 명확히 시작한다.
- 관리자 입력 중에는 이동(WASD)과 공격(action bar)이 서로 다른 affordance로 보인다. 선택은 plan이며 `Z`는 마지막 하나 undo, `Space`는 전체 확정이다.
- 턴 종료 후 `<아군 턴>`과 함께 궁수가 활을 당기고 투사체를 발사한다. 선택한 policy slot과 짧은 실행 이유만 world label로 잠깐 표시한다.
- `<적 턴>`에는 수호자의 wind-up, 위험 범위 표시와 공격/중단 결과가 순서대로 보인다.
- 승리 후 전투 HUD를 걷어내고 관리자에게만 `봉인 해제` 상호작용을 남긴다.

## Information rules

- 수호자 Intent는 world-space icon/label과 순간적인 effect area로 표시한다. 넓은 범위도 평소 지형이 아니라 예정된 위험으로 읽혀야 한다.
- 이동 후보는 가는 선·발자국·청색 계열, 공격 threat는 붉은 pattern·굵은 외곽선·아이콘으로 구분한다. 색 하나에 의미를 맡기지 않는다.
- 상시 policy matrix, 후보 전투 예측, 긴 설명 문단과 개발용 event log는 public boss scene에 두지 않는다.
- 기술의 상세 효과는 hover/focus tooltip에서만 확장한다. 아이콘과 위치·motion만으로도 기본 행동과 현재 주체를 알 수 있어야 한다.
- 모든 정보 layer가 동시에 최대 명도로 켜지지 않는다. 입력 단계의 주목 대상을 전경으로 만들고 나머지는 낮춘다.

## Friction questions

플레이테스트에서 아래를 확인한다.

- 처음 본 사람이 `<내 턴>`에서 WASD와 공격이 별개라는 것을 설명할 수 있는가?
- 수호자의 `제압`을 `밀치기`로 피한 이유가 적의 몸·공격 원점 이동으로 읽히는가?
- `<아군 턴>`에 궁수가 왜 `사격`했는지, `<적 턴>`에 `외침`이 왜 중단됐는지 애니메이션만으로 연결하는가?
- 승리 뒤 관리자가 왜 봉인을 해제하는지 UI 설명 없이 이해하는가?
- 정보가 부족할 때 텍스트를 늘리기 전에 camera focus, timing, shape와 icon으로 해결할 수 있는가?

색·cell·경로·icon의 구체 문법은 [Combat view art](../../art/ui/combat-view/index.md)가 소유한다.
