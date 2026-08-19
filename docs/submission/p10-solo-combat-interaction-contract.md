---
title: P10 Solo Combat Interaction Contract
status: accepted
last_updated: 2026-08-19
related:
  - p9-first-experience-contract.md
  - p9-retrospective.md
  - ../research/reference-insights.md
---

# P10 첫 단독 전투 조작 계약

## Goal

첫 전투의 첫 턴에서 플레이어가 설명문을 해독하지 않고 다음 인과를 순서대로 발견한다.

> 적 A가 이동한 뒤 붉은 칸을 공격한다 → 나는 그 칸을 피해 이동한다 → 청록색 실루엣으로 결과 위치를 확인한다 → `SPACE`로 실행한다.

튜토리얼 문장을 더 잘 쓰는 것이 Goal이 아니다. 한 순간에 하나의 질문만 남도록 실제 입력 가능성과 화면의 전경을 함께 제한하는 것이 Goal이다.

## Reference fidelity

- **Darkest Dungeon:** 전투 장면과 캐릭터를 주 시각 anchor로 두고, 현재 선택에 필요한 contextual control만 하단에 둔다. 첫 턴에 dashboard를 펼치지 않는다.
- **One Step From Eden:** 상시 설명보다 위험 cell, 이동 destination과 공격 범위를 순간적인 고대비 grid signal로 전달한다.
- 초기 구현에서는 이 두 레퍼런스의 `scene-first 비율`, `하단 contextual action`, `필요한 순간에만 강한 cell signal`을 충실히 재현한다. 차별화는 이 문법이 실제로 읽힌 뒤의 polish 단계에서 한다.

## Progressive disclosure

### 0. Threat

- 첫 턴의 적 Intent는 `A + 이동 icon/거리 → 공격 icon/범위`의 압축된 카드 하나로 보인다.
- world에는 A 표식 적의 도착 실루엣, 이동 화살표와 붉은 effect cell이 동시에 이어진다.
- 세 행은 서로 다른 발 위치와 충분한 depth 간격을 가지며, 인접 행의 캐릭터 실루엣이 서로의 점유 cell을 가리지 않는다.
- 하단에는 주인공과 WASD 이동만 조작 가능한 전경으로 보인다.
- 기술, AP 설명, plan strip, 되돌리기와 턴 확정은 아직 경쟁하지 않는다.

### 1. Outcome

- 첫 이동을 입력하면 주인공의 청록색 destination 실루엣과 accepted feedback이 즉시 나타난다.
- 갱신된 적 Intent가 destination을 다시 위협하면 `! → Z`만 전경화되고 `SPACE`는 잠긴다.
- 안전한 destination이면 하단 전경은 WASD에서 `destination ◇ → SPACE`로 교체된다.
- `Z` 되돌리기는 항상 남고, 기술판은 아직 공개하지 않는다.

### 2. Execute

- `SPACE`가 계획을 실제 전투 state에 반영한다.
- 적 턴이 끝난 뒤 두 번째 플레이어 턴부터 정상 이동·기술·AP·계획 UI를 공개한다.
- 즉 첫 턴은 위험과 계획 결과를 배우고, 두 번째 턴은 전체 전투 어휘를 사용한다.

## Text-off contract

화면의 설명 text를 가려도 다음 형상 관계가 남아야 한다.

```text
[A 적의 이동 icon → 공격 icon]
             ↓ world arrows / red cells
[주인공] → [W A S D]

이동 입력 뒤
[청록 destination ◇] → [SPACE]
```

색은 유일한 부호가 아니다. 적은 `A`, 화살표, 공격 icon과 붉은 hatch를 함께 사용하고, 플레이어 결과는 `◇`, 실루엣과 청록 outline을 함께 사용한다.

## Automated evidence

- 첫 턴 입력 전: compact Intent 1개, movement control 1개, skill/plan strip/confirm 0개
- 이동 입력 뒤: authoritative position은 유지되고 preview position만 변경됨
- 위험한 이동 입력 뒤: accepted feedback과 갱신된 공격 범위가 보이고 primary는 `Z` 하나뿐임
- 안전한 이동 입력 뒤: destination symbol과 primary `SPACE`가 보임
- `SPACE` 뒤: enemy phase가 실제 실행되고 두 번째 플레이어 턴에서 full controls 3개가 공개됨
- 16:9와 4:3에서 Intent, world actors와 contextual controls가 겹치거나 화면 밖으로 나가지 않음
- 콘솔·페이지·요청 오류 0

## Human gate

처음 보는 사람이 첫 전투에서 도움 없이 첫 유효 입력을 찾고, 입력 직후 “아직 실행 전인 예정 결과”라고 이해하는지는 사람 증거가 필요하다. 자동 검증은 이 직관성과 재미를 통과로 주장하지 않는다.
