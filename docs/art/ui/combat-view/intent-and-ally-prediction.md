---
title: Intent and Ally Action Signals
status: accepted
last_updated: 2026-08-17
related:
  - ../../../gameplay/combat/turn-and-intent.md
  - ../../../gameplay/combat/policy/action-policy.md
  - ../../../ux/views/combat-view.md
  - grid.md
---

# Intent and ally action signals

## Shared sequence grammar

적 Intent와 아군 prediction은 Slay the Spire식 `구체적 행동 icon + 결과 숫자 + 복합 행동 순서` 문법을 사용한다. 이동은 신발, 근접 공격은 무기, 사격은 활, 스턴은 충격 무기, 소환은 portal처럼 첫 시선에서 동사를 유추할 수 있는 silhouette를 사용한다. icon의 순서가 여러 단계 행동을, damage 숫자가 결과 피해를 전달하며 색·stroke·motion은 진영과 상태를 보조한다.

- 행동 유형은 icon 형태가 소유한다.
- 아군/적 agency는 청색/적색 frame과 예정 silhouette가 소유한다.
- 중간 이동 cell은 화살표만, 마지막 도착 cell은 강한 outline과 예정 silhouette를 사용한다.
- 공격 effect cell은 이동 경로보다 강한 면·stroke로 표시한다.
- hover/focus tooltip은 행동명, 유형, 거리, 대상, 피해와 부가 효과를 실제 ability/policy 데이터에서 설명한다.

## Enemy Intent

- 수호자의 `제압`과 `외침`은 머리 위 sequence icon/damage, body wind-up, 바닥 effect area를 함께 사용한다.
- Intent는 선언 시점에 고정되며, 관리자 `밀치기`로 BODY source가 이동하면 공격 origin과 affected cells가 함께 이동한다. 이 변화는 이동 arc와 짧은 camera emphasis로 보여준다.
- `외침`은 3개 행의 위험을 굵은 패턴과 깨진 원형 경계로 표현하되, 이동 목적지와 혼동하지 않는다.
- `#근거리공격`으로 차징을 중단할 때 수호자의 wind-up이 끊기고 stagger pose, 짧은 hit-stop과 `중단` icon을 순서대로 보여준다. 지속 스턴이 아니라 현재 Intent만 취소됐으며 공격 effect가 실행되지 않았다는 사실을 animation이 증명해야 한다.
- 이동 경로가 유닛 점유로 막히면 화살표는 점유 cell 직전에서 끝나고, 적 shadow와 이어지는 공격 pose는 실제 최종 도착 cell에 표시한다. 막힌 뒤에도 원래 목적지에 shadow를 남기지 않는다.

## Ally action

- `<아군 턴>`에는 궁수의 활시위 당김 → 투사체 → 첫 적 적중을 한 덩어리의 causality로 보여준다.
- `사격`은 같은 행에서 가장 앞의 적 하나에 멈춘다. 먼 적을 임의로 맞히는 beam이나 다중 적 관통으로 표현하지 않는다.
- `<내 턴>`에는 작은 고정 `ALLY PLAN` 패널로 현재 상태에서 결정된 동료의 전체 행동 sequence를 항상 표시한다. 관리자 계획을 바꾸면 `내 계획 반영` 상태와 sequence가 함께 갱신된다. 패널은 행동 아이콘·순서·대상·피해만 담고 policy 편집 dashboard로 확장하지 않는다.
- 계획 중에는 궁수의 최종 도착 cell에 청색 예정 silhouette, 고대비 외곽 silhouette, pulsing ground ring과 `도착`/`공격` label을 함께 표시한다. 반투명 복제 한 장만으로 실제 unit과 구별하게 하지 않으며, 이어지는 공격 pose와 effect cells를 함께 표시한다.
- `회피`, `포지셔닝`, `사격`, `밀치기`의 tag는 tooltip metadata로만 보조한다. 태그가 전투의 주된 문장이 되지 않는다.
- 아군 effect cell은 청색 면·stroke, 적 effect cell은 적색 면·stroke를 사용하고 색 외에도 panel 위치와 silhouette 방향으로 구분한다.

## Layer priority

1. 현재 턴 주체와 action animation
2. 적 Intent 또는 중단 결과
3. hit/VFX와 HP 변화
4. 짧은 policy/action label
5. 선택 가능한 이동·공격 cell

색을 끄거나 색각 조건을 바꿔도 stroke, pattern, icon, motion으로 위 상태를 구분할 수 있어야 한다.
