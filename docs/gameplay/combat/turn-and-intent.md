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
- Slice 1의 public threat는 `짧은 타격`과 `광범위 공격`이다. 둘 다 임의의 방어/가드 분기 없이 Intent의 footprint와 중단 가능 여부를 읽게 한다.
- stun은 확률이 아닌 확정 effect다. interruptible Intent의 source가 stun을 받으면 해당 Intent를 취소한다.
- 모든 공격이 interruptible인 것은 아니다. 적 행동 데이터가 중단 가능 여부를 명시한다.

화면 신호의 소유자는 [Combat view UX](../../ux/views/combat-view.md)와 [Intent art](../../art/ui/combat-view/intent-and-ally-prediction.md)다.

## Accepted turn sequence

1. 살아 있는 적의 Intent를 안정적인 순서로 확정·표시한다.
2. `<내 턴>`에 주인공이 이동과 공격을 별개로 선택한다. AP가 남으면 계속 행동하거나 턴을 끝낸다.
3. `<아군 턴>`에 동료들이 공개된 순서와 policy로 자동 행동한다.
4. 실행 가능한 첫 policy를 행동하고 AP가 남으면 첫 슬롯부터 다시 평가한다.
5. `<적 턴>`에 살아 있고 중단되지 않은 locked Intent를 해결한다.
6. 상태, 사망, Intent 취소와 위치를 정산하고 다음 턴을 시작한다.

동료 실행 순서는 장기적으로 커스텀할 수 있어야 한다. 제출본 본대는 동료 1명이므로 순서 UI의 실질적 사용은 제한될 수 있지만, 엔진 계약은 다수 동료의 순차 예측을 수용한다.

## Determinism

제출본에는 명중, 치명타, 무작위 피해, 확률 기절이나 동일 상태에서 달라지는 동료 행동이 없다. 같은 상태와 행동은 같은 결과를 만든다. 향후 RNG는 seedable 경계로만 추가한다. 구조적 이유는 [ADR-0007](../../adr/0007-no-combat-rng-in-submission.md)에 있다.

## Implementation alignment

현재 Slice 1은 관리자와 동료를 domain faction `STUDENT`로 공유하되 controller에서 수동·자동 phase를 분리한다. 작업 후보별 전체 동료 미리보기는 현재 public combat view에 노출하지 않는다. 구현 사실은 [existing scaffold contract](../../development/architecture/existing-scaffold-contract.md)가 소유한다.
