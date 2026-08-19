---
title: Submission P6 Golden Path and Release Evidence Retrospective
status: under-validation
last_updated: 2026-08-19
related:
  - ../submission/milestones.md
  - ../submission/acceptance-criteria.md
  - ../submission/sector-1-golden-run.md
  - submission-retrospective-p5.md
---

# 제출본 P6 골든 패스·성능·복구 산출물·사고·개발 과정 회고

## Goal과 최종 assertion

하나의 clean SHA에서 제출 제품 완주, 첫 조작, 안정 지점 save/load, 패배 비용, 16:9·4:3, Slice 1·2 회귀와 초기 로딩 경계를 각각 증명한다.

```text
fast interaction contract
→ submission complete-cycle golden
→ stable checkpoint restore
→ deterministic defeat-cost contract
→ Slice 1 regression
→ Slice 2 four-tile regression
→ exact clean SHA report
```

최종 기술 증거 SHA는 `005be86ded98ff070ebbc694f445ad01a7d34eb1`이다.

## result — 산출물 품질

- 제출본 초기 bundle을 단일 1.72MB JS에서 `entry 192,194B + SubmissionApp 88,967B`로 분리했다.
- 1,417,014B Phaser 전장 코드는 첫 월드 화면에서 받지 않고 전투 진입 시에만 lazy load한다.
- 수 초짜리 첫 조작 smoke와 약 54초의 제출 complete-cycle, 약 206초의 Slice 2 누적 회귀를 분리했다.
- 안정 장면을 versioned local checkpoint로 저장하고 새로고침 뒤 위치·시간·world state를 복원한다.
- 전투 중 불완전한 state는 저장하지 않고 마지막 안정 지점만 보존한다. UI의 자동 저장 표시는 비전투 HUD에만 둔다.
- 패배 재정비는 같은 encounter id/content를 유지하면서 `전투 턴 + 5분`, 물·식량 각 1, 완전 회복되지 않은 HP를 다음 시도에 남긴다.
- 전투 도입 문구는 generic 설명 대신 현재 encounter 또는 재정비 비용 notice를 보여 준다.
- P2라는 이름에 갇혀 있던 driver를 product `submission-golden-driver`로 승격하고 이전 경로는 compatibility wrapper로 축소했다.

### 비판적 품질 평가

- 기술 complete-cycle은 안정적이지만 실제 사람 기준 15~25분 pacing은 측정하지 않았다. 자동화의 54초는 playback acceleration을 사용하므로 플레이 시간 근거가 아니다.
- save/load는 안전 checkpoint 계약이다. 전투 한가운데의 plan·HP를 frame 단위로 복원하지 않으며, 새로고침하면 마지막 비전투 checkpoint로 돌아간다.
- 패배 비용 함수와 동일 encounter 재생 경로는 자동 검증했지만 골든 AI가 패배하지 않아 실제 defeat overlay→retry browser capture는 없다. 이는 P0 bug가 아니라 P7 공개 전 수동 failure probe 대상으로 남는다.
- initial JS는 크게 줄었지만 Phaser 자체 1.42MB는 전투 진입 지연 가능성이 있다. loading fallback은 있으나 저사양·느린 네트워크 체감은 미검증이다.

## evidence — exact SHA 기술 증거

| Gate | 결과 |
|---|---|
| typecheck | 통과 · 2.1초 |
| unit | 12 files, 86 tests 통과 · 0.85초 |
| submission build | 통과 · entry 192,194B, app 88,967B, deferred Phaser 1,417,014B |
| fast interaction | pointer/keyboard 전진, feedback, 5m checkpoint reload 통과 · 5.1초 |
| submission golden | EXPANDED, 11:04, retry 0, browser error 0 · 54.3초 |
| 4:3 | overflow 0, 다섯 critical bounds 안쪽 |
| Slice 1 | turn 4 combat regression, browser error 0 · 28.9초 |
| Slice 2 | 4 tiles, 7 combats, boss/seal/finale, retry 0, browser error 0 · 205.8초 |
| clean report | SHA `005be86`, dirty paths 0, TECHNICAL_PASS |
| human gates | **미실행 · REQUIRED** |

## metacognition — 사고와 판단 과정 회고

### 가장 큰 실패: 통과한 suite를 범위 완료로 착각할 뻔했다

첫 RC는 clean SHA `20cd4f6`에서 모든 당시 테스트를 통과했다. 그러나 회고를 쓰기 전에 acceptance 문서를 다시 대조하자 `save/load·retry determinism`과 `패배 시 시간·보급·부상 유지`가 구현·검증되지 않았음을 발견했다.

원인은 명확하다.

1. verifier가 **현재 구현된 경로**를 충실히 재생하는 데 집중했고 acceptance row를 역으로 소유하지 않았다.
2. 긴 RC가 성공하자 테스트 개수가 coverage를 의미한다고 인지적으로 대체했다.
3. P5 회고의 next task를 작업 순서로 사용했지만 canonical acceptance를 P6 시작 checklist 첫 줄에 놓지 않았다.

회고 요구가 없었다면 첫 TECHNICAL_PASS에서 P6를 잘못 닫았을 가능성이 높다. 이번 회고의 가치는 결과 설명보다 바로 이 종료 판단 오류를 드러내고 같은 milestone을 다시 연 데 있다.

### 맞았던 판단

- 초기 bundle warning을 숫자만 완화하지 않고 Phaser를 실제 interaction boundary 뒤로 옮겼다.
- 수 초 smoke와 긴 누적 suite를 분리해 이후 작업이 항상 4분짜리 검증을 요구하지 않도록 했다.
- save/load를 전투 전체 serializer로 과대 확장하지 않고 안정 checkpoint로 제한했다. 제출 cycle 복구에는 충분하고 authoritative combat state를 React/localStorage에 복제하지 않는다.
- 첫 RC 결과를 폐기하지 않고 acceptance gap을 찾는 비교 증거로 사용했다. 두 번째 RC는 보완 SHA에서 다시 실행했다.

### 수정한 판단

- 처음에는 P5의 완료·restart와 전체 골든 경로가 복구 계약까지 포괄한다고 느꼈다. `명시적 재시작`과 `비의도적 새로고침 복구`는 다른 문제였다.
- 기존 retry가 같은 encounter를 다시 만든다는 이유로 deterministic이라고 봤지만, 이전 전투의 비용을 지우면 세계 simulation의 결정론이 아니라 무료 롤백이다. 비용 보존을 별도 함수와 state transition으로 만들었다.
- full RC를 먼저 돌리는 것이 안전하다고 생각했지만, acceptance crosswalk 이전의 300초 RC는 경제적 순서가 아니었다.

## efficiency — 개발 과정 효율 회고

### 경제적이었던 부분

- 첫 조작 smoke는 약 5초이며 pointer, keyboard, autosave reload, browser errors를 한 번에 검사한다.
- Phaser lazy boundary 하나로 submission과 Slice 2 초기 로딩을 함께 개선했다.
- save payload는 기존 authoritative world·policy·delegation objects를 그대로 직렬화하고 별도 shadow model을 만들지 않았다.
- 패배 비용은 pure function으로 분리해 실제 패배 browser run 없이도 수치 계약을 빠르게 검증했다.

### 낭비와 다음 개선

- acceptance audit를 늦게 해 full RC를 두 번 실행했다. 약 5분짜리 Slice 2 회귀가 중복되었다.
- 다음부터 heavy gate 전 순서는 `canonical crosswalk → 가장 낮은 unit/interaction gate → complete product → legacy regressions`로 고정한다.
- RC stdout의 Slice 2 step log는 진단에는 좋지만 성공 경로에서는 너무 길다. P7 이후에는 성공 시 요약, 실패 시 최근 step만 출력하도록 줄일 가치가 있다.

## next rule — 다음 스프린트가 그대로 실행할 규칙

1. milestone 시작과 종료 시 canonical acceptance row를 각각 한 번 대조한다.
2. 테스트 통과 수를 scope coverage의 대리 지표로 쓰지 않는다.
3. 30초 이상 gate는 빠른 계약 검증이 모두 끝난 뒤 exact clean SHA에서 한 번만 실행한다.
4. 저장은 authoritative state의 checkpoint만 소유하며 presentation frame을 저장하지 않는다.
5. 공개 배포 증거와 로컬 RC 증거를 섞지 않는다.
6. 사람 검증 전에는 pacing·직관성·재미를 validated로 올리지 않는다.

## next task — P7 root 배포·공개 검증·최종 감사

1. 현재 문서 commit 뒤 exact HEAD에서 submission production build를 다시 만든다.
2. passwordless `deploy:submission`으로 root만 교체하고 `/slice1/`, `/slice2/`를 보존한다.
3. local origin과 public HTTPS에서 title, asset, Pretendard hash, CSP/cache, 세 경로를 검증한다.
4. 공개 root에서 first interaction smoke와 complete-cycle golden을 최소 필요한 수준으로 재실행한다.
5. release directory, 이전 release, rollback 가능성을 기록한다.
6. 패배 overlay→동일 조우 재시도 비용을 수동 probe한다.
7. 신규 사용자 V5가 없으므로 기술 RC와 사람 검증 상태를 분리해 최종 보고한다.
8. P7에서도 산출물 품질, 판단 과정, 개발 효율, 다음 운영 규칙을 포함한 회고를 남긴다.

