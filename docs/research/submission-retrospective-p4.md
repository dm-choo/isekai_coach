---
title: Submission P4 Barrier Expansion Retrospective
status: under-validation
last_updated: 2026-08-19
related:
  - ../submission/milestones.md
  - ../submission/sector-1-golden-run.md
  - ../gameplay/world/barrier-territory.md
  - ../gameplay/operations/delegated-expeditions.md
---

# 제출본 P4 결계 확장 산출물·사고·개발 과정 회고

## Goal과 최종 assertion

플레이어 결과는 `동료가 확보한 길을 주인공이 직접 지나 거점을 활성화하고, 내 세계의 외곽선·지역 효용·다음 탐사 방향이 한 사건으로 변한다`이다.

```text
DELEGATION_RESULT(SECURED, OUTSIDE)
→ 주인공 400m 안전 경로 이동
→ protagonistAtAnchor=true
→ 거점 활성화
→ incorporateTile 성공
→ contour 4→6
→ frontier INCORPORATED + spring ACTIVE + water +1
→ east/north/south next coordinates REVEALED
```

## 산출물 결과

- 위임 성공 화면의 다음 행동을 `경계 거점으로 이동`으로 연결했다.
- 주인공만 400m의 확보 경로를 이동하며 100m마다 2분, 총 8분의 세계 시간이 흐른다.
- 400m에 도착하면 `protagonistAtAnchor=true`가 되지만 타일은 여전히 `OUTSIDE`다.
- 주인공이 거점을 활성화할 때 기존 authoritative incorporation blocker를 다시 평가한다.
- 성공하면 frontier는 `INCORPORATED`, `ACTIVE`, `stabilized=true`가 되고 contour는 맞닿은 내부 edge를 제거한 6개 외곽선이 된다.
- 샘이 활성화되어 물이 1→2로 늘고, 동쪽·북쪽·남쪽의 다음 좌표 세 개가 `REVEALED`가 된다.
- 최종 장면은 `안전 경로 → 주인공 거점 → 결계 확장 → 샘 +1`을 한 줄의 인과로 보여 준다.

## 검증 증거

| 계약 | 증거 | 판정 |
|---|---|---|
| 잘못된 조기 활성화 거부 | INTRO에서 `NOT_SCOUTED`와 구체 한국어 이유 controller test | 통과 |
| 위임 성공만으로 편입 금지 | P3 결과와 anchor 이동 전 `OUTSIDE` assertion | 통과 |
| 주인공 실제 이동 | D 입력, party X 고정, 두 background-position 변화 | 통과 |
| 400m 시간 비용 | 10:56→11:04, 정확히 8분 | 통과 |
| 현장 도착 전후 분리 | 400m에서 `protagonistAtAnchor=true`, `territory=OUTSIDE` | 통과 |
| 편입 상태 | `INCORPORATED`, `ACTIVE`, `stabilized=true` | 통과 |
| contour | DOM 및 domain 모두 joined 6-edge | 통과 |
| 지역 효용 | active spring 1개, water 1→2 | 통과 |
| 다음 좌표 | east/north/south 세 타일 모두 `REVEALED` | 통과 |
| 런타임과 두 화면 | browser error 0, 960×720 horizontal overflow 0 | 통과 |
| 처음 보는 사람의 확장 인과 설명 | 실행하지 않음 | 미검증 |

P4의 자동 기술 gate는 닫혔다. `내 세계가 커졌다`는 감정과 인과 판독은 P5 사람 검증 전까지 `under-validation`이다.

## 사고 과정 메타회고

### 맞았던 판단

- **새 편입 규칙을 만들지 않았다.** P1의 blocker와 contour 함수를 그대로 사용해 P4가 presentation 편의를 위해 조건을 우회하지 못하게 했다.
- **위임과 주인공 권한을 별도 사건으로 유지했다.** routeSafe가 true여도 protagonistAtAnchor 전에는 OUTSIDE라는 중간 상태를 실제 browser assertion으로 고정했다.
- **최종 state에서 역으로 경로를 검증했다.** contour, utility, water, reveal을 각각 확인해 화면의 축하 연출 하나로 여러 상태 실패를 숨기지 않았다.
- **P3 회고 규칙을 재사용했다.** WIP를 P4 하나로 유지하고 최종 assertion을 먼저 적은 뒤 domain→browser 순으로 진행했다.

### 검증 뒤 수정한 판단

- 첫 browser run이 overflow 0으로 통과했지만, 캡처에서는 4:3 오른쪽 좌표 타일이 시각적으로 잘렸다. `문서 폭이 넘치지 않음`은 `중요한 콘텐츠가 프레임 안에 보임`과 같지 않았다.
- 확장 거점 label이 Latin-only monospace fallback으로 사각형 glyph가 됐다. P2에서 이미 배운 font 규칙을 새 selector에 완전히 적용하지 못했다. 교훈을 기록하는 것과 모든 신규 코드에 체크리스트로 실행하는 것은 별개였다.
- 따라서 P4 종료 전 Korean destination label의 기본 font 상속과 4:3 expanded map scale·origin을 보정했다.

### 다음 스프린트에 남길 인지 규칙

1. overflow 수치 검증 뒤에도 핵심 객체의 bounding box가 viewport 안인지 별도로 본다.
2. 과거 회고의 규칙은 새 Task 시작 checklist로 변환하지 않으면 쉽게 재발한다.
3. 하나의 축하 연출이 여러 state 변화를 표현할 때 각 state를 독립 assertion한다.
4. 미학적 성공과 state correctness를 분리하되, 최종 화면에서는 둘의 인과가 같은 시선 흐름에 있어야 한다.

## 개발 과정 효율 회고

### 경제적이었던 부분

- P1에서 만든 `incorporateTile`과 contour 계산을 재사용해 P4 domain 구현이 작고 명확했다.
- P3 전체 verifier에 P4 stage만 이어 붙여 전투·정책·위임 경로를 복제하지 않았다.
- 첫 P4 browser run에서 domain, 시간, 입력, final DOM과 두 비율을 한 번에 확인했다.
- 조기 활성화 실패는 빠른 unit test, 전체 성공은 browser route로 검증 수준을 나눴다.

### 비효율과 개선점

- CSS 캡처 검토에서 과거의 한국어 font 문제가 한 번 재발했다. P5에서 한글이 들어간 `font:` shorthand를 정적 검색하는 경량 check를 추가한다.
- 현재 verifier 이름은 P2지만 P4까지 소유한다. P5 시작 전에 제품 골든 verifier로 이름과 artifact 경로를 승격해야 한다.
- 최종 지도 타일의 작은 perspective label은 자동화가 존재만 확인할 뿐 실제 판독성을 증명하지 않는다. P5의 5초 무설명 판독 대상으로 남긴다.

## 새 Task — P5 무설명 온보딩과 조작 쾌감

### 플레이어 결과

처음 보는 사람이 외부 설명 없이 현재 할 수 있는 행동을 찾고, 입력이 수락됐는지 알며, 위임 시작과 결계 확장까지의 거친 인과를 과도한 텍스트 해독 없이 따라간다.

### 우선 작업

1. verifier를 `submission golden` 이름으로 승격하고 각 단계의 primary action 수, keyboard/pointer parity와 input feedback을 검사한다.
2. 한국어 glyph fallback, 핵심 객체 viewport bounding box와 4:3/16:9 시각 fit을 자동 검사한다.
3. 첫 전투의 상시 정보량을 다시 줄이고 첫 행동 하나에 focus를 둔다.
4. 정책·위임·확장 화면에서 이미 행동 가능한 하나만 primary로 남기고 실패 입력에는 즉시 이유를 준다.
5. 최종 확장 장면에 명확한 완료와 재시작 경계를 추가한다.
6. 자동 gate 뒤 새로운 사람 2명 중 2명이 위임 시작까지 도달하는 V5를 준비한다.

### P5가 보존할 규칙

- 설명을 추가해 조작 문제를 가리지 않는다.
- 전체 정책 판정표를 기본 화면에 펼치지 않는다.
- pointer와 keyboard는 같은 action과 feedback을 만든다.
- 사람 검증 전에는 직관성과 쾌감을 완료 사실로 쓰지 않는다.
- P5 종료 전 산출물·사고·개발 과정 회고를 작성한다.
