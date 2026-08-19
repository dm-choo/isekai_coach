---
title: P11 Normal Combat Information Contract
status: accepted
last_updated: 2026-08-19
related:
  - p10-solo-combat-interaction-contract.md
  - p10-retrospective.md
  - ../research/reference-insights.md
---

# P11 정상 전투 정보 위계 계약

## Goal

첫 학습 턴 뒤에도 플레이어의 시선이 `현재 위협 → 가능한 응답 → 계획된 결과 → 실행` 순서를 유지한다. 선택 폭을 숨기거나 전투 규칙을 줄이는 것이 아니라, 같은 순간을 설명하는 요소를 한 장소에 묶고 아직 필요하지 않은 세부 문장을 접는다.

## Reference fidelity

- **Darkest Dungeon:** 전장과 actor가 화면 대부분을 소유하고, 현재 actor·기술·결과 조작은 하단의 연속된 한 panel 안에서 읽힌다. 기술 설명은 상시 dashboard가 아니라 선택 시 세부 층으로 나타난다.
- **One Step From Eden:** 선택 결과는 별도 문장보다 world cell signal로 먼저 확인한다. 하단 UI가 전장의 공격·이동 signal과 경쟁하지 않는다.
- 제출 전투는 `scene-first`, `하단 단일 action dock`, `icon-first skill`, `world preview 우선`을 초기 기준선으로 그대로 따른다.

## Information hierarchy

### Threat

- 플레이어 턴의 큰 중앙 banner를 제거한다. turn 번호는 action dock의 작은 보조 정보다.
- 적 Intent는 `source letter → 이동 icon/칸 → 공격 icon/칸`의 압축 카드로 유지한다.
- 적 이름, anchor 규칙과 상세 효과는 Intent를 hover/focus했을 때만 보인다.

### Response

- 하단은 네 군데로 흩어지지 않고 `현재 actor/AP | 이동 | 기술 | 계획/실행` 한 dock이다.
- 기술은 icon, 단축키, AP 비용이 먼저 보인다. `사용 가능` 문장은 상시 노출하지 않고 border/dim과 접근성 label로 상태를 전달한다.
- 대상 후보가 하나뿐이면 target picker를 표시하지 않는다. 둘 이상일 때만 실제 후보를 노출한다.
- 기술 상세 효과와 불가 이유는 실제 pointer movement 또는 focus 뒤 tooltip에서 보인다.

### Outcome and execute

- 계획이 비어 있을 때는 이동·기술 선택 영역이 전경이고 실행은 대기 상태다.
- 행동이 추가되면 같은 dock 안의 plan sequence와 `SPACE` 실행이 전경으로 바뀐다.
- plan strip은 더 이상 전장 위에 떠 있지 않는다. world의 cyan destination/attack preview가 결과 위치를 소유한다.
- `Z`와 `SPACE`는 icon-first이며 keyboard와 pointer가 같은 결과를 만든다.

## Automated evidence

- turn 2의 플레이어 상태에서 중앙 player-turn banner 0개
- 압축 Intent는 source와 icon sequence를 남기고 상시 이름·anchor 문장은 숨김
- action dock 내부에 actor/AP, 이동, 기술 3개와 plan/execute가 모두 포함됨
- plan strip의 bounding box가 dock 밖으로 나오지 않음
- 대상이 하나면 target picker 0개
- 정지 pointer에서 skill tooltip 0개, deliberate focus 뒤 1개, blur 뒤 0개
- 행동 계획 전 `INPUT`, 계획 후 `OUTCOME` focus가 바뀌고 world preview와 plan chip이 존재
- 16:9와 4:3에서 dock·Intent가 viewport 안이며 horizontal overflow 0
- browser error 0

## Human gate

처음 보는 사람이 둘째 턴에서 먼저 전장을 보고, 행동 후보와 아직 실행 전인 결과를 구분하며, 세부 설명이 필요할 때 스스로 찾는지는 신규 사용자 관찰로만 닫는다. 자동 gate는 이해·쾌감·정보 밀도의 체감 통과를 주장하지 않는다.
