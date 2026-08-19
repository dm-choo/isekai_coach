---
title: P13 Seamless Encounter Transition Contract
status: accepted
last_updated: 2026-08-19
related:
  - p12-retrospective.md
  - first-15-minutes.md
  - ../ux/combat-visual-language.md
---

# P13 연속 조우 전환 계약

## Goal

복도 이동이 멈춘 뒤 첫 합동 전투가 별도 제목 화면으로 바뀌는 대신, 같은 세계 안에서 적이 드러나고 플레이어가 한 번 승인하면 즉시 위협과 대응을 읽게 한다.

> 세계 이동 정지 → 배치된 적 발견 → `공격 icon + SPACE` → 같은 전장에서 Intent와 행동 dock 활성화

새 전투 규칙이나 자동 시작을 만드는 것이 Goal이 아니다. 사용자가 이전에 고정한 `전투·조우는 SPACE로 시작` 계약은 보존한다.

## Reference translation

- [Nintendo의 Pokémon Legends: Arceus 전투 화면](https://www.nintendo.com/fr-be/News/2022/Janvier/Demarrez-l-aventure-Legendes-Pokemon-Arceus-du-bon-pied-avec-ces-conseils--2161203.html)은 환경·전투 대상·작은 조작 prompt가 같은 frame에 남는 구조를 차용한다. 3D 카메라나 Pokémon command를 복제하지 않는다.
- Darkest Dungeon에서는 좌측 파티·우측 적의 대치와 하단 명령이라는 시선 순서를 차용한다. 중앙 타이틀 카드나 설명문은 차용하지 않는다.
- 이 프로젝트의 첫 단독 전투에서 이미 사용하는 `공격 icon + SPACE` 승인 문법을 반복한다. 같은 의미에 새 기호를 만들지 않는다.

## Presentation contract

- 제출본의 일반 encounter `INTRO`에서는 전장 canvas, 양 진영 sprite와 HP bar가 항상 보인다.
- `SCOUTED ENCOUNTER`, 적 이름 대형 제목, notice 설명문과 상단 중복 encounter title은 0개다.
- 적 쪽의 붉은 위험 pulse는 첫 단일 적 합동 조우의 위협 발견을 표시하고 실제 적 sprite를 가리지 않는다. 다중 적 각각의 source identity는 전투 시작 뒤 기존 A/B/C Intent 문법이 소유한다.
- 화면 하단 중앙에는 공격 icon·방향·`SPACE`만 있는 primary action 1개가 있다.
- button의 accessible name은 유지하지만 기본 이해가 한국어 문장에 의존하지 않는다.
- `SPACE` 뒤 CombatStage DOM은 유지되고 encounter gate만 사라지며 Intent와 action dock이 같은 전장 위에 나타난다.
- 기존 Slice2 presentation과 첫 단독 전투의 별도 학습 gate는 바꾸지 않는다.

## Automated evidence

- 실제 단독 전투→동료 해방→복도 200m 경로로 첫 합동 `INTRO` 진입
- `.is-seamless[data-encounter-transition="THREAT_REVEALED"]` 1개와 primary action 1개
- 대형 제목·설명·상단 encounter title 0개
- 공격 icon과 `SPACE`, party/enemy HP bar가 함께 보임
- 전장·primary action·위험 pulse가 16:9와 4:3 viewport 안, horizontal overflow 0
- `SPACE` 뒤 같은 CombatStage element가 유지되고 gate 0개, Intent·action dock·동료 forecast가 나타남
- browser error 0

## Human gate

처음 보는 사람이 별도 설명 없이 `길에서 적을 만났고 SPACE로 대치를 시작한다`고 이해하는지는 신규 사용자 관찰이 필요하다. 자동 gate는 장면 연속성·정보량·입력 가능성만 소유한다.
