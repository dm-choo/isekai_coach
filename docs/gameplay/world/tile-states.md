---
title: Tile States
status: accepted
last_updated: 2026-08-18
related:
  - sector-map.md
  - beacon-and-magic-torch.md
  - ../../ux/views/map-view.md
  - ../../art/ui/map-view/tile-visibility-and-markers.md
---

# Tile states

## Player-facing states

- **어둠**: 한 번도 확인하지 않은 미지. 내용, 시설과 지형을 확인할 수 없다.
- **흐림**: 회색 실루엣. 주변 클리어, 비콘, 횃불 또는 과거 클리어 후 재침식으로 생긴다. 재침식된 타일은 중앙 방이 다시 점거되고 통로 인카운터 구성을 다시 추첨한다.
- **밝음**: 최근 클리어했거나 현재 안전하다. 일반 적이 없으면 별동대가 전투 애니메이션 없이 빠르게 통과하며, 특별 이벤트가 없으면 재진입해도 적이 없다.

미개척 흐림과 과거 개척 후 흐림은 같은 기본 색조를 사용하지만 내부 상태는 다르다.

## Internal state

표현 단계와 별도로 최소 `discovered`, `cleared`, `currentlySecure`, `stabilized`, `facility`, `occupyingParty`, `encounterGeneration`, `corridorsScouted`를 구분한다.

## Reveal and erosion

- 타일 최초 클리어 시 주변 8칸을 어둠에서 흐림으로 바꾼다.
- 밝은 타일은 부대가 장기간 이탈하고 횃불이 없으면 다시 흐려질 수 있다.
- 재침식된 타일도 시설과 구조를 유지하고 일회성 보상이나 미니 던전을 재생성하지 않는다.
- 재침식 시 `encounterGeneration`을 증가시키고 통로 인카운터를 새로 추첨하며 `corridorsScouted`를 해제한다.
- 중앙 방을 다시 클리어하면 새 generation의 모든 통로 종류와 위치를 다시 정찰한다.
- 재침식의 핵심 변화는 적 재유입, 통로 정보의 갱신과 통과 시간 증가다.

## Under validation

밝음이 다시 흐려지는 정확한 세계 시간은 플레이테스트로 정한다.
