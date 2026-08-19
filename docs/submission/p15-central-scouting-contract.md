---
title: P15 Central Scouting Causality Contract
status: accepted
last_updated: 2026-08-19
related:
  - first-15-minutes.md
  - sector-1-golden-run.md
  - p14-encounter-return-contract.md
  - acceptance-evidence-matrix.md
---

# P15 중앙 방 확보와 네 통로 정찰 계약

## Goal

플레이어가 문장을 읽지 않아도 `중앙 방의 적 제거 → 중앙점 확보 → 네 방향 통로 reveal`을 하나의 공간적 인과로 보게 한다. 이것은 전투 승리 보상을 요약하는 화면이 아니라, 세계를 알 수 있는 범위가 늘어나는 장면이다.

## Authoritative boundary

- `SubmissionController.completeEncounter`가 중앙 수비대 승리 뒤 `frontier-east.knowledge=SCOUTED`, `corridorsScouted=true`, `threat=CONTESTED`를 만드는 규칙은 그대로 둔다.
- 중앙 방의 적 구성, 전투 피해·시간, 이미 기록된 정책 실패와 다음 `POLICY_REVIEW` 전이는 바꾸지 않는다.
- presentation은 결과를 미리 확정하지 않는다. 전투 결과 gate는 확보된 중앙점과 다음 SPACE 행동만 예고하고, 네 통로의 정찰 상태는 `completeEncounter` 뒤 `SCOUTED`에서만 드러낸다.

## Scene contract

### 1. Central victory gate

- 적과 적 HP bar가 사라지고 살아 있는 파티와 HP는 같은 전장에 남는다.
- 대형 승리 제목, 결과 설명, 공용 victory banner와 notice를 표시하지 않는다.
- 전장 위에는 확보된 중앙점 check, 아직 짧고 흐린 네 방향 spoke, 실제 전투 turn과 같은 `+minute`만 표시한다.
- primary action은 `center check → four-direction glyph → SPACE` 하나다.

### 2. Scouted world state

- 중앙점은 가장 강한 시각 owner이며 check로 확보 상태를 보인다.
- 북·동·남·서 네 선과 방 node가 중앙에서 순차적으로 reveal된다.
- 정찰로 발견된 위험은 해당 방향 node 주변에 붙는다. 알 수 없는 방향을 텍스트로 추론하게 하지 않는다.
- 기존 `CENTRAL ROOM SECURED`, 대형 제목·설명, `1→4` prose card는 제거한다.
- 직전 전투에서 동료 사격이 인접 적에게 막힌 사실은 `동료—거리 1—적—crossed shoot—record`의 작은 다음 행동 hook으로만 남긴다.
- 다음 primary action은 `record glyph → SPACE` 하나이며 정책 검토로 이어진다.

## Acceptance

1. 중앙 승리 결과에서 blocking title·설명·중복 notice가 0개다.
2. 결과의 `+turn`은 완료 뒤 world-minute 증가량과 같다.
3. SPACE 전에는 SCOUTED world state가 아니고, SPACE 뒤에만 `corridorsScouted=true`다.
4. SCOUTED 화면에 center 1, route 4, room 4, known threat 2, primary action 1이 보인다.
5. 텍스트를 숨겨도 중앙 확보, 네 방향 reveal, 위험 위치, 기록 검토 순서가 남는다.
6. 1280×720과 960×720에서 지도·다음 hook·primary action이 잘리지 않고 가로 overflow가 0이다.
7. console, page, request error가 0이다.

자동 검증은 상태와 시각 구조를 판정한다. 새로운 사용자가 이를 실제로 `중앙 방을 확보해서 네 통로를 알게 됐다`고 설명하는지는 human gate 전까지 REQUIRED다.
