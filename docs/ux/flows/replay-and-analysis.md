---
title: Replay and Analysis Flow
status: accepted
last_updated: 2026-08-17
related:
  - ../views/operation-channel.md
  - ../views/policy-editor.md
  - ../../gameplay/operations/operation-channel.md
  - ../../adr/0004-operation-channel-replay.md
---

# Replay and analysis flow

각 부대의 작전 채널은 LIVE, 과거 타임시프트, 현재 시점이라는 익숙한 멘탈 모델을 차용하되 특정 스트리밍 서비스 외형을 복제하지 않는다.

## Replay

- 과거 실제 결과에 개입하거나 정책 수정으로 과거를 재작성할 수 없다.
- 다시보기 중 세계 시간은 정지한다.
- 제출본에서 이동·채집은 압축하고 전투는 전체 애니메이션으로 재생한다.
- 장기적으로 기록 결과와 분리된 재시뮬레이션을 추가할 수 있다.

## Watch mode

- 전투 연출, 적 Intent와 실제 행동 범위를 중심으로 보여준다.
- 정책 판정표는 상시 노출하지 않는다.
- 시스템이 행동을 정상/이상 또는 정답/오답으로 판정하지 않는다.

## Analysis mode

플레이어가 직접 전환하며 당시 위치, HP, AP, Intent, 아군 정책 평가, 실행되지 않은 상위 정책의 이유, 실행 순서와 상태 변화를 조사한다. 미확인 적의 숨은 내부 정책은 보여주지 않는다.

중요도 기반 자동 하이라이트 편집과 행동 모델 추론 UI는 **deferred**다.
