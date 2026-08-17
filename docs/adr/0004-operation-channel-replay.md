---
title: ADR-0004 Per-party Operation Channel and Replay
status: accepted
last_updated: 2026-08-17
related:
  - ../gameplay/operations/operation-channel.md
  - ../ux/flows/replay-and-analysis.md
  - ../ux/views/operation-channel.md
---

# ADR-0004: Per-party operation channel and replay

## Context

자율 별동대의 결과만 요약하면 플레이어가 정책이 왜 작동했는지 학습할 수 없다. 모든 내부 판정을 실시간으로 펼치면 주 화면이 복잡해지고, 과거 정책을 수정해 기록까지 바꾸면 분석의 신뢰가 사라진다.

## Decision

부대마다 이동, 작업과 전투 사실을 시간순으로 보존하는 하나의 작전 채널을 둔다. 채널은 LIVE, 과거 다시보기와 분석 모드를 제공한다. 다시보기는 실제 기록을 재생하고 정책 변경으로 과거를 재작성하지 않는다.

## Alternatives considered

- 모든 부대의 사건을 하나의 전역 알림 로그에 합침
- 자동전투는 결과 요약만 제공
- 정책 변경 시 과거 전투를 새 정책으로 재계산
- 판정표를 관전 화면에 항상 노출

## Consequences

플레이어는 위임 결과를 검증하고 한 번의 정책 수정 효과를 객관적으로 비교할 수 있다. event history, 당시 상태와 presentation을 분리해 보존해야 하며, advanced resimulation과 자동 coaching은 별도 미래 기능으로 남는다.

## Canonical docs

- [Operation channel gameplay](../gameplay/operations/operation-channel.md)
- [Replay and analysis UX](../ux/flows/replay-and-analysis.md)
- [Operation channel view](../ux/views/operation-channel.md)
