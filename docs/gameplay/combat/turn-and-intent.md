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
- Slice 1의 public threat는 `제압`과 `외침`이다. 머리 위에는 적/아군 모두 동일한 `sequence icon + damage` 문법을 사용하고, label은 보조한다. `제압`은 2칸 이동 뒤 1×1에 피해 6, 중단 불가; `외침`은 5×3에 피해 2, 중단 가능이다.
- 세 번째 보스 Intent는 원거리 동료를 추적하는 하수인 소환이다. authored spawn candidate를 순서대로 검사해 첫 빈칸에 소환하며, 선호 칸이 점유됐다는 이유만으로 취소하지 않는다. 모든 후보가 막힌 경우에만 실패한다. 하수인 소환에는 cap이 없고, 하수인은 HP 1의 `돌진`(3×1, 피해 2)을 수행한다. 대상이 있으면 피해 후 대상 바로 앞에 정지하고, 없으면 경로 끝까지 이동한다.
- Slice 1 수호자의 `외침`은 차징 중 `#근거리공격`에 적중하면 해당 Intent만 취소된다. 이 반응은 범용 stun 상태를 부여하지 않는다.
- 범용 stun effect가 별도로 존재하는 경우에는 확률이 아닌 확정 effect이며, interruptible Intent의 source가 stun을 받으면 해당 Intent를 취소한다.
- 모든 공격이 interruptible인 것은 아니다. 적 행동 데이터가 중단 가능 여부를 명시한다.
- 이동이 포함된 Intent의 공개 경로와 최종 shadow는 현재 점유를 반영한다. 플레이어·동료가 경로를 막으면 점유 cell 직전에서 경로를 끝내고, 실제 도착점에서 공격 범위를 다시 투영한다.
- 관리자의 `가로막기`는 AP 2로 다음 일반 피해 1을 방어한다. 관리자가 적의 공개 이동 경로 cell을 먼저 점유해 실제로 이동을 끊고 그 공격의 방어가 소비되면, 해당 이동 적에게 피해 1로 한 번 반격한다. 경로를 막지 않은 일반 방어에는 반격이 발생하지 않는다.
- 활 투사체는 최소 사거리 이전 cell을 포함해 첫 생존 전투원에서 차단된다. 그 전투원이 유효 사거리 밖이거나 같은 진영이면 피해 없이 사격이 막히며 뒤 대상을 맞히지 않는다.

화면 신호의 소유자는 [Combat view UX](../../ux/views/combat-view.md)와 [Intent art](../../art/ui/combat-view/intent-and-ally-prediction.md)다.

## Accepted turn sequence

1. 살아 있는 적의 Intent를 안정적인 순서로 확정·표시한다.
2. `<내 턴>`에 관리자가 이동과 공격을 plan으로 선택한다. 계획 중에는 authoritative state를 mutate하지 않으며, `Z`는 마지막 하나, `Space`는 전체 계획을 확정한다. AP가 남으면 계속 계획하거나 턴을 끝낸다.
3. `<아군 턴>`에 동료들이 공개된 순서와 policy로 자동 행동한다.
4. 실행 가능한 첫 policy를 행동하고 AP가 남으면 첫 슬롯부터 다시 평가한다.
5. `<적 턴>`에 살아 있고 중단되지 않은 locked Intent를 해결한다.
6. 상태, 사망, Intent 취소와 위치를 정산하고 다음 턴을 시작한다.

동료 실행 순서는 장기적으로 커스텀할 수 있어야 한다. 제출본 본대는 동료 1명이므로 순서 UI의 실질적 사용은 제한될 수 있지만, 엔진 계약은 다수 동료의 순차 예측을 수용한다.

## Determinism

제출본에는 명중, 치명타, 무작위 피해, 확률 기절이나 동일 상태에서 달라지는 동료 행동이 없다. 같은 상태와 행동은 같은 결과를 만든다. 향후 RNG는 seedable 경계로만 추가한다. 구조적 이유는 [ADR-0007](../../adr/0007-no-combat-rng-in-submission.md)에 있다.

## Implementation alignment

현재 Slice 1·2는 관리자와 동료를 domain faction `STUDENT`로 공유하되 controller에서 수동·자동 phase를 분리한다. 내 턴에는 현재 계획을 반영한 동료 전체 sequence를 고정 패널과 청색 world preview로 노출한다. 구현 사실은 [existing scaffold contract](../../development/architecture/existing-scaffold-contract.md)가 소유한다.
