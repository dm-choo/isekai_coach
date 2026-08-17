---
title: ADR-0003 Shared World Time
status: accepted
last_updated: 2026-08-17
related:
  - ../gameplay/operations/world-time.md
  - ../gameplay/operations/parties.md
  - ../gameplay/operations/operation-channel.md
---

# ADR-0003: Shared world time

## Context

본대와 별동대의 이동·전투·채집은 소요 시간이 서로 다르다. 본대 작전 하나와 별동대 작전 하나를 기계적인 1:1 tick으로 묶으면 짧은 작업과 긴 전투의 시간 의미가 왜곡되고, 본대 전투 중 알림이 플레이를 자주 끊는다.

## Decision

모든 부대는 하나의 세계 시간에서 독립적으로 진행한다. 시간 비용은 실제 행동 종류와 전투 턴에서 파생하고, 본대 작전이 끝나면 경과 시간만큼 별동대를 일괄 시뮬레이션한다. 별동대 사건은 현재 본대 화면을 강제로 중단하지 않는다.

## Alternatives considered

- 본대 1작전과 별동대 1작전의 1:1 operation tick
- 모든 부대를 실시간으로 동시에 재생
- 별동대가 사건을 만날 때마다 현재 화면을 즉시 중단

## Consequences

서로 다른 작업을 같은 시간축에서 비교할 수 있고 본대 흐름을 보존한다. 각 행동의 시간 비용과 batch simulation의 결정론을 데이터·테스트로 관리해야 하며, Decision 사건은 해당 부대만 대기시키는 규칙이 필요하다.

## Canonical docs

- [Shared world time](../gameplay/operations/world-time.md)
- [Operation channel](../gameplay/operations/operation-channel.md)
