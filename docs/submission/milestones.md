---
title: Submission Product Milestones
status: accepted
last_updated: 2026-08-19
related:
  - scope.md
  - acceptance-criteria.md
  - sector-1-golden-run.md
---

# Submission product milestones

## Current product status

기존 Slice 1·2와 이전 M1~M7은 전투 UX, 연속 통로, 정책 로그, deterministic build·배포의 기술 foundation이다. 그러나 `결계 확장형 영토 정책 오토배틀러`의 완전한 제품 cycle은 아직 구현되지 않았다. 따라서 기존 Release Candidate 표기는 기술 snapshot에만 해당하며 제출 제품 RC가 아니다.

## New milestone order

```text
P0 명세 고정
→ P1 영토 상태와 결계 contour
→ P2 직접 탐사와 규칙 학습
→ P3 동일 규칙 위임
→ P4 결계 확장과 지역 효용
→ P5 무설명 온보딩 통합
→ P6 제출 골든 패스
→ P7 Product Release Candidate
```

### P0 — specification freeze

- 핵심 경험, 공간 계층, 직접/위임 경계, 영토 상태와 제출 cycle이 정본에서 충돌하지 않는다.
- 기존 구현과 새 명세의 차이를 development 문서에 표시한다.
- exact scope 밖 시스템을 구현하지 않는다.

### P1 — territory state and contour

- 지식·위협·영토·효용을 독립 상태로 저장한다.
- 인접성, 안전 경로와 주인공 위치가 편입 가능 여부를 결정한다.
- 결계선이 편입 타일 집합의 외곽으로 렌더된다.

Gate: fixed-state unit scenario와 지도 한 장에서 `보임`, `안전`, `내 영토`를 구분한다.

### P2 — direct exploration and learning

- 초기 결계에서 frontier 통로·중앙 방까지 직접 플레이한다.
- 첫 조우가 공간 규칙 하나를 행동으로 드러낸다.
- 중앙 방 해결이 전체 통로 정찰을 일으킨다.

Gate: 무설명 디렉터 확인에서 첫 입력, 첫 전투 확정과 정찰 인과를 읽는다.

### P3 — same-rule delegation

- 정책 한 곳 수정, 경로·보급·중단 조건 배정과 화면 밖 simulation을 구현한다.
- 직접 관전과 위임이 같은 seed·정책에서 같은 결과를 낸다.
- 작전 요약이 source→decision→result를 복원한다.

Gate: parity 자동 검증과 새로운 사람 1명이 위임 손익을 설명한다.

### P4 — barrier expansion and utility

- 위임된 동쪽 안전 경로와 주인공의 중앙 연결 준비를 결합하고, 주인공이 경계 방 거점까지 실제로 이동한다.
- 주인공 활성화 뒤에만 편입·contour·샘·다음 좌표를 갱신한다.
- 잘못된 순서와 조건은 구체 이유로 거부한다.

Gate: 한 장면에서 `내 세계가 커졌다`는 원인과 결과를 읽는다.

### P5 — no-explanation onboarding

- 첫 15분의 정보 공개, 키·pointer 입력 피드백과 실패 복구를 통합한다.
- 설명문을 읽지 않아도 위치·형태·동작으로 거친 의미를 파악한다.
- 기본 화면에서 전체 정책 설명과 관리 dashboard를 접는다.

Gate: 새로운 사람 2명 중 2명이 외부 도움 없이 위임 시작까지 도달한다.

### P6 — submission golden path

- 15~25분 complete cycle, save/load, 실패·재시도와 두 화면 비율을 검증한다.
- 기존 Slice 1·2 회귀와 새 제품 suite가 함께 통과한다.
- exact SHA에서 build report와 known issue를 고정한다.

### P7 — product RC

- 공개 배포, 복구 경로, console/network errors, P0/P1 defect와 사람 gate를 닫는다.
- 기존 기술 RC 결과를 재사용하지 않고 현재 SHA에서 증거를 다시 만든다.

## Economical validation ladder

| Gate | Evidence | Frequency |
|---|---|---|
| V0 | typecheck와 변경 모듈 unit test | 모든 규칙 변경 |
| V1 | 결정론적 상태 scenario | 상태 전이·정책 변경 |
| V2 | Goal 전용 browser interaction과 최대 3장 screenshot | UI Goal 종료 |
| V3 | 디렉터 3~5분 확인 | player-visible Goal 뒤 |
| V4 | 새로운 사람 1명 | P2, P3 누적 뒤 |
| V5 | 새로운 사람 2~3명 | P5, P6 |
| V6 | 누적 5명 이상과 전체 release 검증 | P7만 |

매 변경마다 전체 골든 런이나 다인 테스트를 반복하지 않는다. 실패한 가장 낮은 gate에서 멈추고 해당 Goal만 다시 연다.

## Goal contract

각 구현 Goal은 한 플레이어 결과만 소유한다.

```text
Goal
player-visible outcome
preserved contracts
one authoritative scenario
one browser scene when needed
stop condition
```

한 시간 자율 작업은 이 Goal 경계 안에서 설계·구현·검증·회고·커밋까지 진행한다. 회고는 산출물 품질뿐 아니라 판단 근거, 놓친 정보, 검증을 낙관으로 대체한 지점, 도구·시간·토큰 효율과 다음 Goal이 재사용할 운영 규칙을 포함한다. 검증이나 회고에서 부족함이 확인되면 다음 milestone로 넘어가지 않고 같은 플레이어 결과를 소유하는 보완 Task를 만든다. 방향을 바꾸는 새 메카닉이 필요할 때만 사용자에게 다시 묻는다.

Goal 종료 시 아래 증거를 남긴다.

```text
result: 무엇이 실제로 달라졌는가
evidence: 자동·브라우저·사람 증거가 각각 무엇인가
metacognition: 어떤 판단이 맞거나 틀렸고 왜 그런가
efficiency: 재사용·낭비·context switching은 무엇이었는가
next rule: 다음 Goal이 그대로 실행할 규칙은 무엇인가
next task: 부족하면 무엇을 닫을 것인가
```
