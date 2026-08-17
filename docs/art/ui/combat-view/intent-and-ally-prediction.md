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

## Enemy Intent

- 수호자의 `짧은 타격`과 `광범위 공격`은 머리 위 action icon/label, body wind-up, 바닥 effect area를 함께 사용한다.
- Intent는 선언 시점에 고정되며, 관리자 `밀치기`로 BODY source가 이동하면 공격 origin과 affected cells가 함께 이동한다. 이 변화는 이동 arc와 짧은 camera emphasis로 보여준다.
- `광범위 공격`은 3개 행의 위험을 굵은 패턴과 깨진 원형 경계로 표현하되, 이동 목적지와 혼동하지 않는다.
- `내려찍`으로 중단될 때 수호자의 wind-up이 끊기고 stun pose, 짧은 hit-stop과 `중단` icon을 순서대로 보여준다. 공격 effect가 실행되지 않았다는 사실을 animation이 증명해야 한다.

## Ally action

- `<아군 턴>`에는 궁수의 활시위 당김 → 투사체 → 첫 적 적중을 한 덩어리의 causality로 보여준다.
- `사격`은 같은 행에서 가장 앞의 적 하나에 멈춘다. 먼 적을 임의로 맞히는 beam이나 다중 적 관통으로 표현하지 않는다.
- 자동 policy는 항상 상시 dashboard로 펼치지 않는다. 현재 실행 슬롯의 아이콘·이름과 짧은 reason만 궁수 가까이에 잠깐 표시한다.
- `회피`, `포지셔닝`, `사격`, `밀치기`의 tag는 tooltip metadata로만 보조한다. 태그가 전투의 주된 문장이 되지 않는다.

## Layer priority

1. 현재 턴 주체와 action animation
2. 적 Intent 또는 중단 결과
3. hit/VFX와 HP 변화
4. 짧은 policy/action label
5. 선택 가능한 이동·공격 cell

색을 끄거나 색각 조건을 바꿔도 stroke, pattern, icon, motion으로 위 상태를 구분할 수 있어야 한다.
