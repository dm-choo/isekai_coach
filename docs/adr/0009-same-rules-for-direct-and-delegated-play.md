---
title: ADR-0009 Same Rules for Direct and Delegated Play
status: accepted
last_updated: 2026-08-19
related:
  - ../gameplay/operations/delegated-expeditions.md
  - ../gameplay/combat/policy/action-policy.md
  - ../gameplay/world/local-area-and-scouting.md
---

# ADR-0009: Same rules for direct and delegated play

## Context

영구 좌표 세계를 모두 직접 조작하면 반복 탐색 비용이 과도하다. 하지만 자동 작전을 전투력 비교나 별도 확률표로 축약하면 전투 grid, 방·통로, 이동 경로와 플레이어 정책이 화면을 떠나는 순간 의미를 잃는다.

## Decision

직접 플레이와 위임 작전은 같은 authoritative 월드·전투 simulation을 사용한다. 자동 부대도 실제 좌표, 방, 통로, 이동 시간, Intent, 충돌과 피해 규칙을 거친다. presentation만 반복 구간을 요약할 수 있으며, 같은 초기 상태·정책·seed는 관전 여부와 무관하게 같은 결과를 낸다.

첫 조우와 알 수 없는 Decision은 직접 플레이 또는 해당 부대의 중단을 요구하고, 관찰한 공간 규칙과 정찰된 경로부터 정책으로 위임할 수 있다.

## Alternatives considered

- 전투력 수치와 확률만 비교하는 자동 해결
- 자동 작전 전용 단순 전투 규칙
- 모든 탐사와 전투를 직접 조작
- 미지의 첫 조우까지 정책이 임의로 해결

## Consequences

전투에서 배운 공간 원칙이 월드 운영 규모까지 이어지고, replay와 원인 분석이 실제 전략 도구가 된다. 반면 화면 밖 simulation 비용, deterministic replay, Decision 중단과 시간 동기화가 필수 구현 계약이 된다.

## Canonical docs

- [Delegated expeditions](../gameplay/operations/delegated-expeditions.md)
- [Action policy](../gameplay/combat/policy/action-policy.md)
- [Local area and scouting](../gameplay/world/local-area-and-scouting.md)
