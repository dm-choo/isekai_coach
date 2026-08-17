---
title: Combat Canonical Index
status: accepted
last_updated: 2026-08-17
related:
  - ../../ux/views/combat-view.md
  - ../../art/ui/combat-view/index.md
  - ../../development/architecture/existing-scaffold-contract.md
  - ../../adr/0007-no-combat-rng-in-submission.md
---

# Combat

이 디렉터리는 전투 공간, 턴, Intent, 정책과 원자 행동 규칙을 소유한다.

## Canonical documents

- [Grid and spatial rules](./grid-and-spatial-rules.md)
- [Turn and Intent](./turn-and-intent.md)
- [Action policy](./policy/index.md)
- [Combat actions](./actions/index.md)

## Status summary

- **accepted**: 3행 논리 topology, locked Intent, BODY/GROUND 계약, 사망·stun 취소, 관리자 수동/궁수 자동 턴, 제출본 무전투 RNG
- **under-validation**: 보스 수치·패턴의 체감, 장기 무기 관통 규칙
- **provisional**: 폭 10~12, 피해·AP와 현재 scaffold 샘플 수치
- **deferred**: 추적 재조준 적, 확률 전투, 복잡한 조건 언어

현재 구현과 최신 승인 턴의 차이는 [existing scaffold contract](../../development/architecture/existing-scaffold-contract.md#alignment-with-current-canonical-design)에 기록한다.
