---
title: ADR-0006 Slot-based Cargo
status: accepted
last_updated: 2026-08-17
related:
  - ../gameplay/economy/cargo-slots-and-logistics.md
  - ../gameplay/economy/iron-mine.md
  - ../gameplay/operations/world-time.md
---

# ADR-0006: Slot-based cargo

## Context

첫 섹터는 채굴, 적재, 운송과 장비 제작을 짧은 시간 안에 이해시켜야 한다. 연속적인 kg 무게와 세밀한 inventory 최적화는 숫자 계산을 늘리지만 부대 구성과 운송 반복의 판단을 반드시 더 명확하게 만들지는 않는다.

## Decision

운반 용량은 숫자 무게가 아니라 discrete cargo slot으로 표현한다. 자원 종류마다 필요한 칸이 다를 수 있고, 전투 장비와 화물 적재는 분리한다. 부대원별 적재 칸은 부대 단위로 합산할 수 있다.

## Alternatives considered

- kg 기반 연속 무게와 encumbrance
- 자원 종류와 무관한 무한 stack inventory
- 운송을 직접 플레이하지 않고 시간·자원 숫자로만 처리

## Consequences

적재 상태와 왕복 비용을 한눈에 비교하기 쉽고 별동대 구성에 물류 역할이 생긴다. 자원별 slot size와 부대별 총 slot 수는 밸런스 데이터가 되며, 정확한 수치는 플레이테스트 전까지 provisional이다.

## Canonical docs

- [Cargo slots and logistics](../gameplay/economy/cargo-slots-and-logistics.md)
- [Iron mine](../gameplay/economy/iron-mine.md)
