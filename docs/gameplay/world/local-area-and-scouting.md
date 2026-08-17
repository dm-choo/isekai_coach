---
title: Local Area and Scouting
status: accepted
last_updated: 2026-08-17
related:
  - sector-map.md
  - ../../ux/views/local-view.md
  - ../../art/ui/local-view/interaction-and-combat-transition.md
  - ../operations/world-time.md
---

# Local area and scouting

## Hierarchy

```text
섹터
└─ 영역 타일
   └─ 로컬 영역
      ├─ 지점
      ├─ 통로
      └─ 출구
```

- 지점은 본격 전투, 시설, 보상과 사건을 담는다.
- 통로는 이동, 약한 전투 또는 낮은 빈도의 조우를 담는다.
- 출구는 인접 월드 타일과 연결한다.

## Local exploration

- 기본 로컬 영역은 십자형에 가까운 구조이며 자유 이동한다.
- 전투 지점에 진입하면 즉시 전투하고, 통로 조우는 현재 장면 위에 grid를 활성화한다.
- 전투 종료 후 같은 자유 이동 장면으로 돌아온다.
- 정찰된 전투는 붉은 기척이나 오라로 암시한다.
- 지점 클리어 시 인접 지점과 연결 통로의 일부 이벤트를 공개한다.

세계 시간은 WASD 입력 횟수가 아니라 통로·지점 이동, 전투 턴과 시설 상호작용 같은 의미 있는 사건으로 계산한다.
