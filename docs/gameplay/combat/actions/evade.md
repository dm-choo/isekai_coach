---
title: Evade Action
status: accepted
last_updated: 2026-08-17
related:
  - positioning.md
  - ../turn-and-intent.md
  - ../policy/action-policy.md
---

# Evade

- 현재 칸과 이동 가능한 인접 칸의 공개 Intent 예상 피해를 비교한다.
- 적 공격을 맞지 않는 칸을 최우선으로 선택하고, 없으면 예상 피해가 더 적은 칸을 선택한다.
- 현재 칸이 가장 안전하거나 모든 후보 피해가 같으면 실행하지 않는다.
- 현재 턴의 공개 정보만 사용하고 미래 턴을 예측하지 않는다.
- 같은 입력에서는 같은 칸을 선택하는 결정론적 tie-break가 필요하다. 구체적인 tie-break 순서는 구현 전에 문서와 테스트로 함께 확정한다.
