---
title: Submission Product Milestones
status: accepted
last_updated: 2026-08-19
related:
  - scope.md
  - acceptance-criteria.md
  - ../research/validation-agenda-slice-2.md
---

# Submission product milestones

수직 슬라이스 이후의 제작은 기능 수가 아니라 플레이어가 획득하는 멘탈모델을 누적한다. 앞 gate가 실패하면 뒤 시스템을 추가하지 않는다.

```text
M0 범위 고정
→ M1 조작 피드백
→ M2 전투 시각 문법
→ M3 행동으로 배우는 온보딩
→ M4 선택 충돌과 정책 수정
→ M5 RUN 통합
→ M6 제출 골든 패스
→ M7 Release Candidate
```

## Current state

- M0: accepted. [Scope](./scope.md)의 축소된 증명 범위를 사용한다.
- M1: implemented, automated validation passed, public build deployed. 무설명 사람 검증은 다음 외부 테스트 시 누적한다.
- M2: implemented and deployed. 적 이동→공격 순서, BODY/GROUND의 플레이어 언어, A/B/C 소유자 연결이 자동 검증을 통과했으며 무설명 사람 판독은 under-validation이다.
- M3: implemented, automated validation passed. 시작 화면에서는 원정 시작만, 첫 방에서는 시간과 진행 방향만 노출하고 정찰·첫 전투 이후에 미니맵, 자원, 동료 정책을 순차 공개한다. 첫 전투는 모달 설명 대신 이동 프리뷰와 SPACE 확정을 직접 수행하게 한다. 무설명 사람 검증은 under-validation이다.
- M4: implemented, automated validation passed. 새 전투 규칙을 더하지 않고 기존 `회피 우선`과 `사격 우선`이 안전과 피해 사이에서 서로 다른 비지배 결과를 내는 고정 상태를 테스트로 잠갔다. 동료의 전투 전체 policy 실행 이력, 가장 자주 막힌 상위 전술과 정책 변경 전후의 실제 행동 횟수를 캐릭터 창에 보존한다. 서로 다른 조우를 비교하므로 UI는 인과나 우열을 판정하지 않으며 실제 선택 분포와 이해는 under-validation이다.
- M5: implemented, automated validation passed. 네 번째 월드 타일의 동쪽 출구를 기존 결계 수호자 계약에 연결하고, 원정에서 남은 HP·세계 시간·현재 동료 policy를 보스전에 그대로 전달한다. 보스 격파만으로 종료하지 않고 관리자 봉인 해제와 명확한 데모 완료를 별도 상태로 거친다. 기본 자동 경로는 7전투·재시도 0회로 완료되지만 실제 20~30분 체감과 누적 HP 압박은 under-validation이다.
- M6: next.
- M7: pending.

## Economical validation ladder

| Gate | Evidence | Frequency |
|---|---|---|
| V0 | typecheck와 변경 모듈 unit test | 모든 변경 |
| V1 | 결정론적 상태 시나리오 | 규칙 변경 |
| V2 | Goal 전용 browser interaction과 최대 3장 screenshot | UI Goal 종료 |
| V3 | 디렉터의 3~5분 확인 | Goal 배포 뒤 |
| V4 | 새로운 사람 1명 | 3~5개 Goal 누적 뒤 |
| V5 | 새로운 사람 2~3명 | 큰 milestone 종료 |
| V6 | 누적 5명 이상과 전체 release 검증 | RC |

성공 로그는 요약하고 실패 상태만 상세 보존한다. V0가 실패하면 V1 이후를 실행하지 않으며, 일반 UI 변경마다 4타일 전체 완주나 다인 테스트를 반복하지 않는다.

## Goal contract

각 작업은 하나의 플레이어 결과만 소유한다.

```text
Goal
player-visible outcome
preserved contracts
one browser scene
stop condition
```

게임 규칙, 범위 또는 승인된 방향을 바꾸지 않는 세부 구현은 Goal 안에서 자율적으로 결정한다.
