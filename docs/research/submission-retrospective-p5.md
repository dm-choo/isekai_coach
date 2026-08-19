---
title: Submission P5 No-explanation Interaction Retrospective
status: under-validation
last_updated: 2026-08-19
related:
  - ../submission/milestones.md
  - ../submission/acceptance-criteria.md
  - submission-retrospective-p4.md
---

# 제출본 P5 무설명 조작·인지부하 산출물·사고·개발 과정 회고

## Goal과 최종 assertion

처음 보는 플레이어가 각 장면에서 지금 할 수 있는 주 행동 하나를 발견하고, 키보드와 포인터 중 어느 쪽을 사용해도 같은 상태 전이를 만들며, 첫 전투 입력의 수락 여부와 제출 cycle의 종료를 즉시 확인한다.

```text
장면당 primary affordance 1개
→ 동일 controller action을 keyboard/pointer가 공유
→ 첫 전투 입력 ACCEPTED feedback
→ 4:3 핵심 객체 viewport 안
→ 확장 완료 뒤 명시적 restart
→ 10:00 / 보급 1 / 진행 0으로 복원
```

## result — 산출물 품질

- 비전투 `SPACE` 처리를 `performPrimaryAction()` 하나로 모아 화면 버튼과 키 입력의 분기를 동일하게 만들었다.
- 통로와 확보 경로의 hold 이동은 기존처럼 키보드와 포인터가 같은 `start/stop` 함수를 사용한다.
- 모든 비전투 장면의 주 행동에 action id와 실제 key를 명시해 한 화면의 affordance 수를 자동 검사할 수 있다.
- 첫 전투는 설명문을 더 늘리지 않고 기존의 두 단계 cue를 보존했다. 첫 이동 뒤 `이동이 계획 1번에 추가됨`과 `SPACE로 실행`이 함께 보인다.
- 최종 확장 화면에 `처음부터 다시 보기`를 추가해 축하 장면과 조작 종료 상태를 분리했다.
- 제품 browser entrypoint와 artifact 위치를 `submission-golden`으로 승격했다. 이전 P2 파일은 P6 helper 분리 전 compatibility implementation으로만 남는다.

### 비판적 품질 평가

- 자동 gate가 증명하는 것은 **행동의 존재·단일성·상태 전이·bounds**이지, 처음 보는 사람이 의미를 이해한다는 사실이 아니다.
- 최종 화면은 16:9와 4:3 모두 핵심 객체가 프레임 안에 있지만 작은 perspective tile label의 5초 판독성은 여전히 미검증이다.
- 첫 전투 cue는 첫 턴에만 노출되어 상시 dashboard를 만들지 않는 장점이 있다. 반면 이동→실루엣→확정이라는 문법 자체가 사람에게 통하는지는 V5가 필요하다.
- 정책 선택 화면에는 두 선택지가 있어 primary action은 하나지만 decision cost는 존재한다. 이는 제거할 마찰이 아니라 제출본이 검증할 핵심 trade-off다.

## evidence — 검증 증거

| 계약 | 현재 증거 | 판정 |
|---|---|---|
| 장면별 주 행동 | intro, corridor, center, scouted, policy, plan, result, anchor, expanded action id/key browser assertion | 통과 |
| 불가능한 입력 | corridor에서 `performPrimaryAction()` false, 상태 불변 unit test | 통과 |
| 첫 전투 수락 피드백 | pointer D → ACCEPTED → `계획 1번에 추가됨`, 다음 SPACE cue | 통과 |
| 키보드 전체 경로 | 골든 경로의 모든 비전투 SPACE 전이 | 통과 |
| 포인터 완료 경계 | expanded restart click → INTRO | 통과 |
| 깨끗한 재시작 | 10:00, water 1, corridor 0 | 통과 |
| 한글 critical copy | computed font family에 Pretendard 포함 | 통과 |
| 4:3 실제 fit | copy, map, causality, coordinates, restart 각각 bounding box 검사 | 통과 |
| 브라우저 안정성 | console/page/request error 0 | 통과 |
| 신규 사용자 무설명 도달 | 실행하지 않음 | **미검증** |

## metacognition — 사고 과정 회고

### 맞았던 판단

1. **온보딩을 문장 추가 문제로 보지 않았다.** 이전 피드백의 핵심은 정보량 부족이 아니라 행동 발견과 입력 결과의 불확실성이었다. 그래서 우선 action routing, feedback, 완료 경계를 고쳤다.
2. **회고의 교훈을 실행 가능한 selector와 assertion으로 번역했다.** P4의 `overflow 0은 fit이 아니다`를 `[data-critical-fit]` bounding box 검사로 바꿨다.
3. **사람 검증과 자동 검증의 주장을 분리했다.** 테스트가 통과해도 `직관적이다`라고 결론 내리지 않았다.
4. **새로운 튜토리얼 overlay를 만들지 않았다.** 첫 입력 전에는 위험 칸에서 벗어나는 한 행동, 입력 뒤에는 예정 위치와 확정 한 행동만 보여 주는 progressive cue를 유지했다.

### 판단을 수정한 지점

- 처음에는 최종 화면의 disabled 완료 버튼을 상태 표식으로 충분하다고 보았지만, 그것은 `끝났다`만 말하고 플레이어가 다음에 할 수 있는 행동을 주지 않았다. 실제 restart를 넣어 종료와 재진입을 모두 명시했다.
- 키보드와 포인터가 같은 메서드를 각각 호출한다는 사실만으로 parity를 가정하려 했으나, 분기 자체가 UI에 흩어져 있으면 다시 어긋날 수 있다. 비전투 SPACE 분기를 controller 한 곳으로 옮겼다.
- primary action 개수만 세면 입력 수락 여부는 증명되지 않는다. 첫 전투에서 실제 pointer 입력 뒤 domain feedback과 시각 cue를 함께 확인하도록 gate를 확장했다.

### 놓친 신호와 남은 불확실성

- P4 회고에서 인간 2명 gate를 예고했지만 현재 작업 환경만으로는 신규 사용자를 만들 수 없다. 이를 자동화로 대체했다고 주장하지 않고 최종 통합 빌드 1회에 묶는다.
- `data-*` 계약은 검증을 경제적으로 만들지만 잘못된 label을 붙이면 자기충족적 테스트가 된다. P6에서는 DOM label뿐 아니라 실제 state 전이와 공개 build를 함께 확인한다.
- 최종 화면의 restart가 제출 시연에는 유용하지만, 정식 게임에서는 다음 좌표 선택이 뒤따라야 한다. 제출 scope 밖의 가짜 두 번째 cycle은 만들지 않았다.

## efficiency — 개발 과정 효율 회고

### 경제적이었던 부분

- 새 E2E 파일을 복제하지 않고 P2→P5 누적 골든 driver를 재사용했다.
- unit은 불가능한 primary 입력 하나만 빠르게 검증하고, 입력 parity·font·fit·restart는 브라우저 한 번에서 함께 확인했다.
- final 16:9/4:3 캡처를 같은 run에서 만들어 시각 감사와 수치 assertion을 중복하지 않았다.
- 첫 전투 UI를 다시 설계하지 않고 이미 존재하던 cue와 input feedback의 실제 작동을 검증해 변경 범위를 줄였다.

### 비효율과 다음 개선

- 구현 파일 이름이 여전히 `verify-submission-p2.mjs`라 product entrypoint만 승격된 상태다. P6에서 driver와 stage assertions를 분리해 이름 부채를 제거한다.
- 누적 골든 run이 약 30초로 늘었다. P6에서는 빠른 interaction contract와 전체 complete-cycle suite를 분리해 변경마다 긴 run을 반복하지 않는다.
- CSS bounds failure를 기다린 뒤 고치지 않도록, P6에서는 16:9와 4:3을 같은 helper로 검사한다.

## next rule — 다음 스프린트가 그대로 실행할 규칙

1. 화면 설명을 늘리기 전에 `행동 발견 → 입력 → 수락 피드백 → 다음 행동` 사슬을 먼저 검증한다.
2. 회고의 재발 방지 문장은 다음 Task의 가장 낮은 비용 gate로 변환한다.
3. 자동 검증은 의미 이해나 쾌감을 주장하지 않는다.
4. 하나의 full browser run 앞에 unit/typecheck를 두고, 실패한 가장 낮은 단계에서 멈춘다.
5. 신규 사용자 검증은 최종 통합 build에서 한 번 수행해 사람 모집과 재검증 비용을 줄인다.

## next task — P6 제출 골든 패스와 release evidence 분리

### 플레이어 결과

루트 제품을 처음부터 끝까지 15~25분 제출 cycle로 완주할 수 있고, 실패·재시작·두 화면 비율·기존 slice 보존이 하나의 release 후보 SHA에서 재현된다.

### 작업 범위

1. product golden driver와 빠른 interaction contract를 분리한다.
2. production build 기준 root, `/slice1/`, `/slice2/` routing을 로컬에서 회귀 검증한다.
3. build chunk 경고의 실제 초기 로딩 원인을 측정하고 submission entry에서 불필요한 slice code를 분리한다.
4. 16:9·4:3 핵심 bounds와 screenshot budget을 고정한다.
5. exact SHA, build size, known issue, rollback 대상이 들어간 P6 evidence와 과정 회고를 남긴다.
6. V5 신규 사용자 테스트는 P6 통합본에서만 요청하며, 그 전에는 release-ready를 주장하지 않는다.

