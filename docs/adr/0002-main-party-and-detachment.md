---
title: ADR-0002 Main Party and Autonomous Detachment
status: accepted
last_updated: 2026-08-19
related:
  - ../gameplay/operations/parties.md
  - ../gameplay/operations/world-time.md
  - ../gameplay/operations/operation-channel.md
---

# ADR-0002: Main party and autonomous detachment

## Context

주인공과 동료의 직접 공간 협동뿐 아니라 여러 실제 좌표의 알려진 작업을 위임하는 구조가 필요하다. 모든 인원을 한 부대에 두면 자동 정책과 작전 기록의 월드 역할이 약해지고, 모든 부대를 직접 조작하면 영구 세계 규모가 반복 입력 비용이 된다.

## Decision

주인공이 속한 본대와 동료가 자율적으로 움직이는 별동대를 분리한다. 본대는 미지·주요 사건·최종 영토 편입을, 별동대는 정찰된 경로와 알려진 반복 업무를 담당한다. 정확한 캠페인 로스터와 동시 부대 수는 콘텐츠 범위로 두고, 제출본 최소 roster는 submission owner가 정한다.

## Alternatives considered

- 세 명이 항상 한 부대로 이동
- 여러 부대를 모두 실시간 직접 조작
- 별동대 없이 메뉴형 자원 자동 획득만 제공

## Consequences

정책 기반 자동전투와 작전 분석이 영토 확장의 실제 역할을 얻는다. 동시에 여러 부대의 시간, 중단, 기록과 실패를 처리해야 하므로 shared world time과 per-party operation channel이 필요하다.

## Canonical docs

- [Main party and detachment](../gameplay/operations/parties.md)
- [Shared world time](../gameplay/operations/world-time.md)
- [Operation channel](../gameplay/operations/operation-channel.md)
