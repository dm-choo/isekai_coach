---
title: ADR-0002 Main Party and Autonomous Detachment
status: accepted
last_updated: 2026-08-17
related:
  - ../gameplay/operations/parties.md
  - ../gameplay/operations/world-time.md
  - ../gameplay/operations/operation-channel.md
---

# ADR-0002: Main party and autonomous detachment

## Context

제출본은 주인공과 동료의 직접 공간 협동뿐 아니라 여러 전선을 위임하고 관찰하는 관리자 감각을 모두 증명해야 한다. 모든 인원을 한 부대에 두면 자동 정책과 작전 기록의 가치가 약해지고, 모든 부대를 직접 조작하면 위임 경험이 사라진다.

## Decision

제출 roster를 주인공과 동료 2명으로 두고, 주인공이 속한 본대와 동료가 자율적으로 움직이는 별동대로 분리한다. 본대는 미지·주요 사건을, 별동대는 알려진 반복 업무와 자동 교전을 담당한다.

## Alternatives considered

- 세 명이 항상 한 부대로 이동
- 여러 부대를 모두 실시간 직접 조작
- 별동대 없이 메뉴형 자원 자동 획득만 제공

## Consequences

정책 기반 자동전투와 작전 분석이 실제 월드 역할을 얻는다. 동시에 여러 부대의 시간, 중단, 기록과 실패를 처리해야 하므로 shared world time과 per-party operation channel이 필요하다.

## Canonical docs

- [Main party and detachment](../gameplay/operations/parties.md)
- [Shared world time](../gameplay/operations/world-time.md)
- [Operation channel](../gameplay/operations/operation-channel.md)
