---
title: Delegated Expeditions
status: accepted
last_updated: 2026-08-19
related:
  - parties.md
  - world-time.md
  - operation-channel.md
  - ../combat/policy/action-policy.md
  - ../world/barrier-territory.md
  - ../../adr/0009-same-rules-for-direct-and-delegated-play.md
---

# Delegated expeditions

## Responsibility

이 문서는 직접 탐사에서 정책형 위임으로 전환하는 조건, 위임 작전의 입력과 중단 규칙을 소유한다. 전투 정책 문법은 [Combat policy](../combat/policy/index.md), 기록 노출은 [Operation channel](./operation-channel.md)이 소유한다.

## Direct and delegated boundary

다음 상황은 주인공이 포함된 본대가 직접 다룬다.

- 아직 관찰하지 않은 적·지형·공간 규칙의 첫 조우
- 정체를 모르는 사건과 되돌릴 수 없는 선택
- 주요 서사, 지역 핵, 확장 거점의 최종 활성화
- 보스와 관리자 권한이 필요한 목표

다음 상황은 동료 부대에 위임할 수 있다.

- 정찰된 통로와 이미 관찰한 적 규칙의 전투
- 확보 경로의 재순찰, 불안정 타일 재확보와 방어
- 알려진 자원 지점의 채집·운반과 반복 시설 작업
- 플레이어가 손실·중단 조건을 명시할 수 있는 경로 개척

`미지`는 단순 레벨 제한이 아니다. 자동 해결이 판단해야 할 적 태그, 지형 효과 또는 사건 선택지가 도감·정찰에 없으면 해당 부대는 진입 전 대기하거나 첫 조우에서 Decision으로 멈춘다.

## Assignment contract

위임 작전은 최소 다음 입력을 가진다.

1. 목적지 또는 실제 좌표 경로
2. 부대 구성과 장비
3. 전투 action-policy와 표적·공간 지침
4. 휴대 보급과 적재 한도
5. 후퇴·휴식·Decision 중단 조건
6. 완료 뒤 대기·귀환·반복 중 하나

자유 프로그래밍 대신 목적별 preset을 제공하되, 전투의 핵심 공간 정책은 플레이어가 확인하고 변경할 수 있어야 한다.

## Same-world resolution

- 직접 플레이와 위임 작전은 같은 월드 타일, 방, 통로 구간, 전투 grid, 이동 시간, Intent, 충돌과 피해 규칙을 사용한다.
- 자동전투를 전투력 수치 비교나 별도 확률표로 대체하지 않는다.
- 보이지 않는 동안에도 authoritative simulation은 실제 좌표를 진행한다.
- presentation은 안전 이동과 반복 행동을 요약할 수 있지만 결과 원인은 작전 기록에서 재구성 가능해야 한다.
- 같은 초기 상태, 정책과 seed는 직접 관전 여부와 무관하게 같은 결과를 만든다.

## Event batching

- Routine 사건은 요약한다.
- 손실, 새로운 규칙, 경로 단절과 목표 완료는 Notable로 남긴다.
- 정보가 부족하거나 되돌릴 수 없는 선택은 Decision으로 해당 부대만 멈춘다.
- 다른 부대의 Decision은 현재 직접 전투를 중단시키지 않고, 직접 작전의 의미 있는 구간 종료 시 일괄 제시한다.

## Policy transfer loop

정책형 위임의 기본 학습 루프는 다음과 같다.

```text
직접 첫 조우 → 공간 규칙 관찰 → 정책 한 곳 수정
→ 정찰된 유사 경로 위임 → 실제 결과 관찰
→ 실패 원인을 좌표·행동·정책 판정으로 추적 → 다음 작전에 반영
```

시스템은 플레이어 정책을 정답/오답으로 채점하지 않는다. 손실, 시간, 보급, 확보 범위와 중단 빈도로 trade-off를 보여 준다.
