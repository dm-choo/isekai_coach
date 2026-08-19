---
title: Tile States
status: accepted
last_updated: 2026-08-19
related:
  - sector-map.md
  - barrier-territory.md
  - regional-core-and-stabilizer.md
  - ../../ux/views/map-view.md
  - ../../art/ui/map-view/tile-visibility-and-markers.md
---

# Tile states

## Responsibility

이 문서는 타일 지식·위협 상태의 gameplay 의미를 소유한다. 영토와 효용 축은 [Barrier territory](./barrier-territory.md)가 소유한다. 화면은 이 내부 상태를 색 하나로 직역하지 않는다.

## Player-facing knowledge states

- **어둠**: 한 번도 확인하지 않은 미지. 내용, 시설과 지형을 확인할 수 없다.
- **흐림**: 회색 실루엣. 인접 타일 확보, 지역 핵·정찰 효과 또는 과거 확보 후 재침식으로 생긴다. 재침식된 타일은 중앙 방이 다시 점거되고 통로 인카운터 구성을 다시 추첨한다.
- **밝음**: 현재 내부 정보와 안전 경로를 신뢰할 수 있다. 일반 적이 없으면 부대가 빠르게 통과하며, 특별 사건이 없으면 재진입해도 적이 없다.

미개척 흐림과 과거 개척 후 흐림은 같은 기본 색조를 사용하지만 내부 상태는 다르다.

## Internal state

표현 단계와 별도로 최소 `knowledge`, `security`, `territory`, `utility`, `stabilized`, `facility`, `occupyingParty`, `encounterGeneration`, `corridorsScouted`를 구분한다. 정확한 축과 전이는 [Barrier territory](./barrier-territory.md)를 따른다.

## Reveal and erosion

- 타일 최초 중앙 목표 해결 또는 높은 정찰 지점 확보 시 인접 좌표를 어둠에서 흐림으로 바꿀 수 있다. 기본 공개는 상하좌우 인접 타일이며 대각선·추가 반경은 콘텐츠 효과다.
- 확보한 타일은 장기간 관리되지 않고 안정화되지 않았으면 다시 흐려질 수 있다.
- 재침식된 타일도 시설과 구조를 유지하고 일회성 보상이나 미니 던전을 재생성하지 않는다.
- 재침식 시 영토 소속을 유지한 채 `encounterGeneration`을 증가시키고 통로 인카운터를 새로 추첨하며 `corridorsScouted`를 해제한다.
- 중앙 방을 다시 클리어하면 새 generation의 모든 통로 종류와 위치를 다시 정찰한다.
- 재침식의 핵심 변화는 적 재유입, 통로 정보의 갱신과 통과 시간 증가다.

## Under validation

밝음이 다시 흐려지는 정확한 세계 시간은 플레이테스트로 정한다.
