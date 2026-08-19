---
title: P14 Encounter Return Contract
status: accepted
last_updated: 2026-08-19
related:
  - p13-seamless-encounter-contract.md
  - first-15-minutes.md
  - sector-1-golden-run.md
---

# P14 전투 결과와 복도 복귀 계약

## Goal

첫 합동 전투의 승리를 대형 결과 문장으로 설명하지 않고, 같은 전장에서 `적이 사라짐 → 길이 안전해짐 → 전투 시간 반영 → SPACE → 멈춘 200m 지점에서 탐사 재개`로 읽히게 한다.

새 보상·회복·시간 규칙을 만드는 것이 Goal이 아니다. `completeEncounter`가 이미 소유한 HP·전투 turn·world time·corridor progress 보존을 world/UI 인과로 드러낸다.

## Presentation contract

- 첫 합동 `VICTORY`에서 전장 canvas, 살아 있는 파티 sprite와 현재 HP bar가 계속 보인다.
- `PATH SECURED`, `인카운터 해결`, HP·시간 설명문과 대형 결과 제목은 0개다.
- 적 bar와 살아 있는 적 sprite는 0개다.
- 파티에서 오른쪽 출구로 이어지는 청록 path와 check가 경로 안전화를 표시한다.
- 작은 `clock + 전투 turn` badge가 SPACE 뒤 world time에 반영될 비용을 미리 표시한다.
- 하단에는 `check → SPACE` primary action 1개만 있다.
- SPACE 뒤 `CORRIDOR`, progress 200m, 전투 종료 HP 보존, `worldMinute += combat turn`이어야 한다.
- 복도 party 위치는 기존 고정 anchor를 유지하고 진행 bar는 200/400m에서 재개한다.
- 첫 단독 승리·중앙 방 승리·기존 Slice2 결과 화면은 이번 Task에서 바꾸지 않는다.

## Automated evidence

- 실제 P13 경로 뒤 첫 합동 전투를 결정론적으로 완주
- `.is-seamless-path[data-combat-result="PATH_SECURED"]` 1개, 대형 제목·설명 0개
- living enemy/bar 0, party/HP bar 유지
- path check·clock+turn·primary action 각각 1개
- 16:9와 4:3에서 결과 요소가 viewport 안, horizontal overflow 0
- SPACE 뒤 mode `CORRIDOR`, progress 200, vitals=전투 최종 HP, world minute 증가=turn
- 복도 진행 표시 200/400m, 다음 이동 primary `D`
- browser error 0

## Human gate

처음 보는 사람이 check path를 `이 구간을 통과 가능하게 만들었다`로, clock을 실제 시간 비용으로 연결하는지는 신규 사용자 관찰이 필요하다. 자동 gate는 표시와 authoritative state 일치만 소유한다.
