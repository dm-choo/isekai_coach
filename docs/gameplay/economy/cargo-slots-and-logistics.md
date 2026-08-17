---
title: Cargo Slots and Logistics
status: accepted
last_updated: 2026-08-17
related:
  - iron-mine.md
  - ../operations/world-time.md
  - ../../adr/0006-slot-based-cargo.md
---

# Cargo slots and logistics

## Cargo contract

- kg 수치 대신 슬롯형 적재를 사용한다.
- 자원은 종류에 따라 1칸 또는 2칸 이상을 차지할 수 있다.
- 전투 장비와 운반 적재함을 분리한다.
- 부대원이 늘면 적재 칸을 합산할 수 있다.

정확한 슬롯 수는 **provisional**이다.

## Work preset

기본 작업은 `철광산 이동 → 채굴 → 최대 적재 → 지정 거점 최단 경로 운반 → 하역 → 반복`이다. preset을 제공하되 자유 조건문 편집기로 만들지 않는다.

하역 목적지, 빠른/안전 경로, 1회 왕복/고갈까지 반복을 사용자가 얼마나 수정할지는 **under-validation**이다.
