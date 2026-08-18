---
title: Intercept
status: accepted
last_updated: 2026-08-18
related:
  - ../turn-and-intent.md
  - ../grid-and-spatial-rules.md
  - ../../../art/ui/combat-view/intent-and-ally-prediction.md
---

# 가로막기

## Slice 1·2 contract

- AP 비용은 2다.
- 사용하면 다음 blockable 피해 1을 막는 방어를 얻는다.
- 공개된 적 이동 경로 cell을 관리자가 먼저 점유해 적의 이동이 실제로 짧아져야 반격 후보가 된다.
- 그 이동 적의 이어지는 공격으로 가로막기의 방어가 소비되면, 살아 있는 관리자만 해당 적에게 피해 1로 즉시 한 번 반격한다.
- 경로를 막지 않았거나 공격이 빗나가 방어가 소비되지 않으면 반격하지 않는다.
- `GROUND` 공격, 이동 없는 사격과 가드 불가 공격의 범용 해답이 아니다.

이 행동의 목적은 피해를 무료로 줄이는 것이 아니라 `어느 경로 cell을 점유할지`, `공격 AP 2를 포기할지`, `누구의 사격선을 가릴지`를 동시에 묻는 것이다. 장기 게임의 장비·직업 보정 수치는 별도 검증 전까지 확정하지 않는다.
