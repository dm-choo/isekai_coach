---
title: Turn and Intent Contract
status: accepted
last_updated: 2026-08-17
related:
  - grid-and-spatial-rules.md
  - policy/action-policy.md
  - ../../ux/views/combat-view.md
  - ../../development/architecture/existing-scaffold-contract.md
  - ../../adr/0007-no-combat-rng-in-submission.md
---

# Turn and Intent contract

## Intent

- 적은 행동 전에 Intent를 확정하고 공개한다.
- 선언 뒤 주인공이나 동료가 이동해도 다시 조준하지 않는다.
- source가 실행 전에 죽으면 Intent를 취소한다.
- `BODY` 공격은 source가 밀리면 현재 body 위치에서 선언 방향을 유지한 채 범위를 다시 투영한다.
- `GROUND` 공격은 선언 당시 셀에 고정한다.
- 밀린 짧은 공격은 빗나갈 수 있고, 같은 이동 뒤 긴 찌르기는 여전히 닿을 수 있다.
- `NORMAL_ATTACK`과 `UNBLOCKABLE_ATTACK`은 별도 threat category다.

화면 신호의 소유자는 [Combat view UX](../../ux/views/combat-view.md)와 [Intent art](../../art/ui/combat-view/intent-and-ally-prediction.md)다.

## Accepted turn sequence

1. 적 Intent를 확정·표시한다.
2. 동료의 현재 예상 행동을 계산·표시한다.
3. 주인공이 행동 후보를 선택한다.
4. 후보 상태에서 다수 동료의 행동 연쇄를 공개 실행 순서대로 시뮬레이션한다.
5. 주인공 행동을 실행한다.
6. 동료 예상 행동을 재계산한다.
7. AP가 남으면 후보 선택부터 반복한다.
8. 주인공 phase를 종료한다.
9. 동료들이 공개된 실행 순서대로 자동 행동한다.
10. 살아 있는 적의 locked Intent를 해결한다.
11. 상태, 사망과 위치를 정산한다.

동료 실행 순서는 장기적으로 커스텀할 수 있어야 한다. 제출본 본대는 동료 1명이므로 순서 UI의 실질적 사용은 제한될 수 있지만, 엔진 계약은 다수 동료의 순차 예측을 수용한다.

## Determinism

제출본에는 명중, 치명타, 무작위 피해, 확률 기절이나 동일 상태에서 달라지는 동료 행동이 없다. 같은 상태와 행동은 같은 결과를 만든다. 향후 RNG는 seedable 경계로만 추가한다. 구조적 이유는 [ADR-0007](../../adr/0007-no-combat-rng-in-submission.md)에 있다.

## Implementation alignment

현재 scaffold는 locked enemy Intent와 단일 student strategy 실행을 검증하지만, 주인공 후보 상태와 동료 prediction/execution 분리는 아직 구현하지 않았다. 구현 사실은 [existing scaffold contract](../../development/architecture/existing-scaffold-contract.md)가 소유한다.
