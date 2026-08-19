---
title: ADR-0008 Persistent Coordinate Barrier Expansion
status: accepted
last_updated: 2026-08-19
related:
  - ../gameplay/world/barrier-territory.md
  - ../gameplay/world/sector-map.md
  - ../narrative/barrier-and-restoration.md
---

# ADR-0008: Persistent coordinate barrier expansion

## Context

고정 거점에서 반복 가능한 던전을 선택하는 구조만 사용하면 탐사 결과가 실제 세계의 좌표와 영토로 남지 않는다. 반대로 모든 바깥 타일을 수동으로 청소하게 하면 영구 공간의 규모가 반복 조작 비용으로 바뀐다. 게임의 핵심 경험은 결계 안에서 깨어난 주인공이 회복한 인접 좌표까지 자신의 세계를 넓히는 것이다.

## Decision

유한하고 제작된 거시 월드의 좌표를 영구 보존한다. 공개, 정찰, 확보, 편입, 안정화를 서로 다른 상태로 두며 주인공이 확보한 인접 타일의 확장 거점을 직접 연결할 때만 영토가 편입된다. 결계선은 편입된 타일 집합의 외곽을 따라 실제로 변한다.

타일 내부 인카운터와 재침식 구성은 seed에 따라 달라질 수 있지만 좌표, 지형, 주요 유적과 편입 기록은 유지한다.

## Alternatives considered

- 고정 거점에서 절차 생성 던전 목록을 반복 선택
- 지역 보스 처치 시 섹터 전체를 한 번에 해제
- 시야 공개와 영토 편입을 하나의 밝음 상태로 통합
- 결계를 고정 원형 반경 업그레이드로 확대

## Consequences

탐사와 복구 결과가 지도 위의 영구 흔적으로 누적되고, 경로·인접성·전선·시설 위치가 장기 선택이 된다. 대신 타일 상태를 단일 색으로 표현할 수 없고, 저장·경로 탐색·불안정화가 여러 직교 축을 처리해야 한다.

## Canonical docs

- [Barrier territory and expansion](../gameplay/world/barrier-territory.md)
- [Sector map](../gameplay/world/sector-map.md)
- [Barrier and restoration](../narrative/barrier-and-restoration.md)
