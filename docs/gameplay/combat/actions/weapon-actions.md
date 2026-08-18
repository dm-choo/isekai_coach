---
title: Weapon Actions
status: accepted
last_updated: 2026-08-17
related:
  - positioning.md
  - ../policy/action-policy.md
  - ../../../art/character/animation-and-weapon-layering.md
---

# Weapon actions

Slice 1의 아래 관리자/동료 수치와 public 이름은 accepted다. Slice 1 밖의 무기 수치는 provisional이다.

| 무기 / 정책 | Accepted shape and behavior | Provisional damage |
| --- | --- | --- |
| 활 / 사격 | 같은 행 전방 2~5칸의 투사체. 가장 앞의 적 하나에서 멈춘다 | 피해 1 / AP 2 |
| 검 / 베기 | 전방 1열 × 세로 3칸 | Slice 1 밖: provisional |
| 둔기 / 내려찍기 | 전방 `1 × 1`, `#근거리공격` | 피해 2 / AP 2 |
| 창 / 찌르기 | 같은 행 전방 3칸 | Slice 1 밖: provisional |
| 단검 / 비껴 찌르기 | 전방 `1 × 1`, 적중 후 다른 행으로 무료 1칸 이동 가능 | Slice 1 밖: provisional |

관리자의 `밀치기`는 피해 1 / AP 2이며 1칸 knockback을 포함한다.

## Dagger movement

주인공은 무료 행 이동 여부와 방향을 선택한다. 동료는 예상 피해가 가장 낮은 행을 결정론적으로 고른다. 공격과 행 이동 결과를 prediction UI에 함께 표시한다.

## Under validation

창이 여러 대상을 관통하는지는 확정하지 않는다. 기본 활 `사격`은 관통하지 않는다.

## Submission exclusions

방어구 외형 교체와 무기 숙련 시스템은 없다. 캐릭터 행동 기술은 최대 4개이며 패시브·기벽은 별도 계층이다.
