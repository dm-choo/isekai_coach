---
title: Submission P8 Acceptance Gap Closure Retrospective
status: technical-candidate
last_updated: 2026-08-19
related:
  - ../submission/acceptance-criteria.md
  - ../submission/acceptance-evidence-matrix.md
  - ../submission/release-candidate.md
  - submission-retrospective-p7.md
---

# 제출본 P8 수용 기준 보완 산출물·사고·개발 과정 회고

## Goal

P7 공개 배포를 기능 완료로 간주하지 않고, 정본 수용 기준을 행 단위로 다시 감사해 자동화로 닫을 수 있는 남은 계약을 구현한다.

```text
acceptance row audit
→ 정보 인과 보완
→ 패배·불안정화 전이 보완
→ 전용 최저비용 검증
→ exact-SHA 누적 RC
→ 공개 build 교체
```

## Result — 산출물 품질

- 위임 계획에 물·식량 보유량과 `이번 위임 사용 안 함`을 추가해 보급 조건을 추측하지 않게 했다.
- 최종 확장 화면에서 `소속·안정·효용`을 독립 ledger로 보여 전투 승리, 영토 편입과 안정화를 같은 상태로 읽지 않게 했다.
- 샘의 `물 +1`을 `다음 원정 한 번`에 직접 연결해 보상이 숫자 증가로 끝나지 않게 했다.
- 패배는 같은 전투의 즉시 재시작이 아니라 시간·보급·부상을 유지한 채 안전 영토로 돌아가며, 같은 장소에 재진입해도 encounter를 재추첨하지 않는다.
- 불안정화는 편입 소속·지식·샘·결계 contour를 보존하고 안전 경로·정찰·효용만 손상한다.
- 위임 action trace를 독립 `BattleEngine`에 재생해 관전/위임 input source가 authoritative 결과를 바꾸지 않는 parity를 검증한다.
- 패배 전용 browser gate가 `전투 불능→안전 후퇴→비용 유지→같은 조우 재진입`을 한 시나리오로 소유한다.

### 비판적 품질 평가

- 자동화는 요구 상태가 존재하고 화면에 표시되는지를 증명한다. 처음 보는 사람이 그 의미를 정확히 묶는지는 증명하지 않는다.
- 패배 복구는 최소 생존 HP를 부여한다. 장기 부상·치료 정책은 제출 범위 밖이며 현재 회복 수치도 provisional이다.
- 불안정화는 domain 계약과 unit scenario다. 제출 골든 경로가 의도적으로 불안정화까지 발생시키지는 않는다.
- 위임의 보급 행은 이번 작전이 보급을 소비하지 않는다는 사실을 명확히 하지만, 장기 원정의 loadout 선택 UI는 deferred다.

## Metacognition — 내가 어떻게 생각했고 어디서 틀렸는가

### 초기 모델

P7 종료 시 나는 `기술 RC + 공개 browser smoke + 사람 gate 미실행`으로 상태를 세 구획했고, 자동으로 할 수 있는 작업은 끝났다고 판단했다. 이 구획 자체는 맞았지만 전제가 틀렸다. 당시 RC가 **정본 수용 기준 전 행을 소유한다**는 것을 확인하지 않고, milestone별 대표 경로가 통과했다는 사실로 대신했다.

### 확신을 뒤집은 증거

수용 기준을 문단 단위가 아니라 한 줄씩 코드·테스트·화면에 역매핑하자 다음 공백이 드러났다.

1. 위임 계획의 보급 조건이 내부 값일 뿐 화면에 없었다.
2. 샘 `+1`이 다음 원정 능력과 의미적으로 연결되지 않았다.
3. 편입과 안정화는 state가 달라도 최종 화면에서 하나의 성공으로 뭉쳐졌다.
4. 패배 비용 함수는 있었지만 UX는 같은 전투 즉시 재시작이었다.
5. 불안정화 보존 규칙은 type에 암시됐을 뿐 실행 가능한 transition과 test가 없었다.
6. `같은 BattleEngine을 쓴다`는 구현 주석은 parity 증거가 아니었다.

따라서 `사람 gate만 남음`이라는 P7 결론을 철회하고 같은 제출 후보에 P8 보완 Task를 열었다. 가장 중요한 교훈은 테스트가 많다는 사실이 아니라 **각 acceptance row가 어떤 증거에 의해 소유되는지**가 종료 판단의 단위라는 점이다.

### 구현 중 판단 로그

- 패배를 새로운 조우로 바꾸면 재추첨 금지 계약을 깨므로 encounter identity는 공간 위치에 유지하고, controller만 안전 영토로 되돌렸다.
- 패배 fixture를 UI에 상시 넣지 않고 DEV query로 격리해 실제 제품 밸런스를 검증 편의를 위해 오염시키지 않았다.
- 첫 failure browser run이 턴 2에서 멈췄을 때 제품 AI 버그로 단정하지 않고 authoritative snapshot을 읽었다. 주인공 HP 0, 동료 HP 1인데 드라이버가 죽은 주인공의 이동만 반복한 검증 도구 결함이었다. 살아 있는 조작자가 없으면 빈 계획을 확정하도록 수정한 뒤 실제 패배 전이가 통과했다.
- 최종 ledger를 추가한 뒤 16:9만 보고 끝내지 않고 4:3 critical-fit에 ledger를 포함했다. 화면 전체가 보이는 것과 새 정보가 viewport 안에 들어오는 것은 다른 계약이기 때문이다.
- parity는 동일 함수를 두 번 호출하는 결정론 테스트로 충분하지 않다고 판단했다. 실제 위임 action trace를 새 engine에 적용해 state와 event count가 완전히 같은지 비교했다.

### 사용자 판단과 자율 판단의 경계

- 사용자가 고정한 방향: 핵심 경험은 결계 안에서 깨어난 주인공이 탐사·정책 위임으로 결계를 확장하는 것, 사람의 뇌 소모를 줄이는 UI, 버그·마찰·조작감·다이내믹을 비판적으로 검토하는 것, 매 스프린트의 과정 회고.
- 구현자가 위임받아 결정한 세부: 보급 행의 압축 문법, `소속·안정·효용` 세 칸 ledger, 안전 영토 후퇴 화면, DEV 저체력 fixture, action-trace parity 방식.
- 새 장기 메카닉이나 방향 변경은 추가하지 않았다. 발견한 공백을 이미 승인된 수용 계약 안에서만 닫았다.

## Efficiency — 개발 흐름과 비용 회고

### 경제적이었던 순서

1. 전체 RC보다 먼저 정본 crosswalk를 작성해 빠진 계약을 찾았다.
2. world/controller unit과 typecheck로 상태 전이를 먼저 고정했다.
3. 패배 전용 약식 browser gate로 실패 복구만 반복했다.
4. 그 뒤 complete golden과 두 화면 비율을 확인했다.
5. 가장 긴 Slice 1·2 누적 RC는 clean commit에서 한 번만 실행하도록 남겼다.

이 순서는 3분 이상 걸리는 기존 Slice 2 회귀를 UI copy나 fixture 디버깅 때마다 반복하지 않는다.

### 낭비와 원인

- P7 전에 acceptance evidence matrix를 만들지 않아 공개 배포 뒤 다시 기능 보완과 재배포가 필요해졌다. 가장 큰 비용은 코드량이 아니라 잘못된 종료 판단으로 생긴 release 왕복이다.
- failure driver의 첫 전략은 행동 계획이 없는데 Space만 반복했다. 두 번째 전략도 주인공 사망 뒤 actor viability를 확인하지 않아 한 번 더 멈췄다. fixture 설계 전에 `가능한 중간 상태`를 표로 적었으면 두 반복을 줄일 수 있었다.
- 이전 회고에 행 단위 감사 규칙이 있었지만 다음 sprint plan의 체크리스트로 강제되지 않았다. 회고 문장을 남기는 것과 실제 workflow를 바꾸는 것을 혼동했다.

## Next rule — 다음 스프린트가 그대로 실행할 규칙

1. **계획 전:** 정본 acceptance 각 행에 `implementation/test/browser/human` 소유자를 붙이고 빈 행만 Task로 연다.
2. **구현 전:** 초기 가정과 실패 가능한 중간 상태를 세 줄 이내로 적는다.
3. **검증 중:** fixture가 멈추면 제품을 수정하기 전에 authoritative state, 입력 가능 actor와 드라이버 조건을 분리해 확인한다.
4. **완료 전:** `구현됨`, `자동 검증됨`, `사람에게 이해됨`, `공개 배포됨`을 서로 다른 assertion으로 보고한다.
5. **회고 후:** next rule을 다음 plan의 첫 gate로 복사하지 않으면 새 Task를 시작하지 않는다.
6. **비용 관리:** focused unit→Goal browser→complete product→legacy regression→public smoke 순서를 유지하고 긴 gate는 clean SHA에서 한 번만 실행한다.

## Next task — 사람 경험 V5

자동으로 닫을 수 있는 acceptance 공백을 모두 닫은 뒤에도 신규 사용자 증거는 남는다. 다음 Task는 콘텐츠 추가가 아니라 같은 공개 build를 신규 사용자 2명에게 설명 없이 맡기고 아래 최초 단절 하나를 찾는 것이다.

- 첫 행동을 스스로 시작하는가.
- 첫 plan이 입력됐고 확정됐음을 아는가.
- 동료 행동 원인을 정책 또는 공간 규칙으로 설명하는가.
- 위임 손익과 결계 확장의 인과를 연결하는가.
- 다음 좌표 또는 준비를 자발적으로 말하는가.

사람 gate 전에는 직관성, 핵심 경험 전달, 재미와 pacing을 validated로 승격하지 않는다.
