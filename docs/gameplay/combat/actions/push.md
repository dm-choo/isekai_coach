---
title: Push Action
status: accepted
last_updated: 2026-08-17
related:
  - ../turn-and-intent.md
  - weapon-actions.md
  - ../../../development/architecture/existing-scaffold-contract.md
---

# 밀치기 (Push)

## Accepted structure

- 근거리 `1 × 1` 원자 행동이다.
- 피해와 1칸 knockback을 하나의 ordered effect로 결합한다.
- 경계나 점유로 밀 수 없으면 불법 겹침이나 경계 이탈을 만들지 않는다.
- BODY-anchored 적을 밀면 선언 방향은 유지하고 effect cell origin만 함께 이동한다.
- 별도 Jab 정책은 사용하지 않는다.

## Provisional

- 현재 후보 피해는 1이다.
- AP 비용과 막힌 knockback이 복합 effect의 다른 결과에 미치는 세부 ordering은 플레이테스트와 구현 계약으로 검증한다.
