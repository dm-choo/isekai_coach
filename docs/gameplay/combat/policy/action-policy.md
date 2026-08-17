---
title: Submission Action Policy
status: accepted
last_updated: 2026-08-17
related:
  - ../actions/index.md
  - future-policy-language.md
  - ../../../ux/views/policy-editor.md
  - ../../../submission/first-15-minutes.md
  - ../../../adr/0005-action-policy-first.md
---

# Submission action policy

## Evaluation contract

- 동료마다 최대 5개 정책 슬롯을 가진다.
- 각 정책은 하나의 원자 행동이다.
- 위에서 아래로 평가해 실행 가능한 첫 정책을 실행한다.
- AP가 남으면 결과 상태를 갱신하고 다시 첫 슬롯부터 평가한다.
- 실행되지 않은 상위 정책의 이유는 전투 중 상시 표시하지 않고 [분석 모드](../../../ux/flows/replay-and-analysis.md)에서 확인한다.

## Accepted default templates

맨손 기본 순서:

```text
회피 → 포지셔닝 → 밀치기
```

활 기본 순서:

```text
회피 → 포지셔닝 → 사격 → 밀치기
```

다른 무기도 같은 구조에 해당 무기 행동을 삽입한다. 기본 순서가 항상 최적이 되도록 설계하지 않는다.

## First tutorial policy (post-Slice 1, under validation)

단검 동료는 `회피 → 포지셔닝 → 비껴 찌르기 → 밀치기`로 시작한다. 첫 자동전투는 승리하지만 비효율적이다. 분석 뒤 플레이어는 순서를 `비껴 찌르기 → 회피 → 포지셔닝 → 밀치기`로 바꾼다. 이 정책 편집 curriculum은 Slice 1 보스방에 포함하지 않는다.

다음 실제 자동전투에서는 동료가 먼저 찌르고 무료 행 이동으로 locked enemy footprint를 벗어난다. 이전 전투보다 턴, 시간과 피해가 감소해야 하며 과거 기록은 바뀌지 않는다. 자연어 예측 문장으로 실제 결과 비교를 대신하지 않는다. 튜토리얼의 시점과 화면 흐름은 [첫 15분](../../../submission/first-15-minutes.md)이 소유한다.

## Explicit exclusions

제출본에는 자유 조건식, AND/OR, 자연어 정책, node graph와 복잡한 priority editor가 없다.

## Player planning boundary

관리자의 직접 행동 선택은 plan으로 투영한다. hover는 선택한 관리자 action의 결과와 동료 policy/enemy Intent를 what-if로 보여주며 authoritative state를 확정 전 변경하지 않는다. `Z`는 마지막 planned action 하나를 undo하고 `Space`는 전체 plan을 확정한다.

## Slice 1 boundary

[Amazon Barrier Guardian slice](../../../submission/vertical-slice.md)는 활 동료의 `회피 → 포지셔닝 → 사격 → 밀치기 → 빈 슬롯`을 실행하지만 편집하지 않는다. 전투 중에는 현재 선택된 전술과 짧은 이유만 보여 주고, 전체 판정표나 정책 dashboard를 놓지 않는다. 이 전투의 목표는 policy editor 검증이 아니라 실제 전투 UI·UX 마찰 탐색이다.
