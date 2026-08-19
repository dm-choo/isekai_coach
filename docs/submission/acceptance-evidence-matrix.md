---
title: Submission Acceptance Evidence Matrix
status: technical-candidate
last_updated: 2026-08-19
related:
  - acceptance-criteria.md
  - release-candidate.md
  - human-playtest-card.md
  - ../research/submission-retrospective-p8.md
---

# 제출본 수용 기준 증거 매트릭스

이 문서는 테스트 개수나 milestone 완료감을 수용 범위 coverage로 착각하지 않기 위한 역추적 표다. 정본은 [acceptance criteria](./acceptance-criteria.md)이며, 각 행은 하나 이상의 실행 가능한 증거를 가져야 한다. 자동 증거가 사람의 이해·직관·재미를 대신하지 않는다.

상태 문법:

- **A**: 자동화된 authoritative 또는 browser gate가 소유한다.
- **V**: 자동 증거와 캡처를 사람이 확인했다.
- **H**: 신규 사용자 무설명 관찰만 닫을 수 있다.
- **REQUIRED**: 아직 외부 사람 증거가 없다. 이 행을 validated라고 부르지 않는다.

## Core experience

| Acceptance row | Evidence owner | 상태 |
|---|---|---|
| 초기 결계와 바깥 frontier 구분 | golden `00-intro`, 시작 장면의 contour·현재 위치·동쪽 위협 | A+V, 의미 이해는 H REQUIRED |
| 직접 조우→규칙 관찰→정책 수정→알려진 통로 위임 | `verify:submission:golden`의 단일 complete cycle | A+V, 무설명 흐름은 H REQUIRED |
| 위임 결과가 경로·행동·피해·시간으로 설명됨 | delegation action trace, `.operation-causality`, `.operation-log` assertion | A+V, 손익 설명은 H REQUIRED |
| 동료 확보만으로 편입되지 않음 | golden이 `routeSafe=true`, `territory=OUTSIDE`를 동시에 검증 | A |
| 주인공 활성화 뒤 contour·샘·다음 좌표 변화 | world unit + golden expanded scene | A+V |
| 승리/편입/안정화를 별개로 읽음 | 독립 world state + expanded `소속·안정·효용` ledger | A+V, 실제 개념 구분은 H REQUIRED |

## Information and control

| Acceptance row | Evidence owner | 상태 |
|---|---|---|
| 모든 시점의 primary action 하나 | golden `assertPrimaryAction`과 critical-fit | A+V |
| keyboard/pointer와 accepted/rejected/result 구분 | `verify:submission:interaction`, golden keyboard route·pointer restart | A |
| 불가 행동은 state 불변과 구체 이유 | controller early-activation test + blocker copy | A |
| 적 Intent/관리자 plan/동료 prediction 비색상 문법 | 기존 `verify:combat-ux`, Slice 1 browser regression | A+V |
| 같은 적 다수의 source→path→target 추적 | Slice 1/2 combat regression과 multi-enemy intent tests | A |
| 정책 화면이 실제 행동·막힌 상위 규칙을 먼저 제시 | golden `.policy-evidence-focus` assertion | A+V |
| 위임 한 장에 목적지·경로·시간·보급·중단 조건 | golden delegation plan copy assertion + `09-revised-plan` | A+V |

## World and simulation

| Acceptance row | Evidence owner | 상태 |
|---|---|---|
| 지식·위협·영토·효용 독립 | `world.test.ts` | A |
| 중앙 방 해결만으로 네 통로 결정론적 정찰 | controller transition + golden causality assertion | A |
| 직접/위임이 동일 grid·ability·intent·collision·time 규칙 사용 | independent action-trace replay through `BattleEngine` | A |
| 공유 월드 시간, Decision은 해당 부대만 정지 | golden이 병렬 작업 시간을 합산하지 않고 `max()`로 검증 | A |
| 패배가 재추첨·비용 초기화 없이 안전 영토로 복귀 | `verify:submission:failure` defeat→retreat→re-entry | A+V |
| 인접 확보 타일만 편입 | incorporation blocker/contour unit scenarios | A |
| 불안정화가 소속·시설은 보존하고 안전·생산·정찰만 손상 | `destabilizeTile` preservation scenario | A |

## Submission scope

| Acceptance row | Evidence owner | 상태 |
|---|---|---|
| 주인공 1·동료 1로 골든 런 완주 | `verify:submission:golden` | A |
| frontier 한 타일과 다음 좌표 공개로 proof 종료 | expanded final mode assertion | A |
| 샘 물 보충이 다음 원정 가능성을 바꿈 | water `+1` state + `다음 원정 한 번` presentation assertion | A+V, 이해는 H REQUIRED |
| deferred 경제·보스·다중 부대 없이 cycle 성립 | complete cycle build와 scope audit | A+V |
| 16:9·4:3 핵심 요소가 가려지지 않음 | golden critical bounds + overflow 0 | A+V |

## Release evidence

| Layer | Command / record | 승격 조건 |
|---|---|---|
| focused rules | `npm test -- --run src/game/submission` | 변경 모듈 0 failure |
| failure contract | `npm run verify:submission:failure` | safe retreat, persistent cost, no reroll, browser error 0 |
| product golden | `npm run verify:submission:golden` | EXPANDED, both ratios, browser error 0 |
| cumulative technical RC | `npm run verify:submission-rc` | clean exact SHA, submission + Slice 1·2 전부 통과 |
| production | `npm run deploy:submission` then `npm run verify:submission:public` | 새 release, public input/reload/routes, rollback target |
| human | [human playtest card](./human-playtest-card.md) | acceptance human rows의 2명 이상 증거 |

## Unclosed evidence

- 신규 사용자 2명 이상의 무설명 기록이 없으므로 직관성, 핵심 경험 전달, 재미는 **REQUIRED**다.
- 실제 사람 기준 15~25분 pacing은 자동 playback 시간으로 추론하지 않는다.
- 느린 네트워크에서 deferred combat chunk의 체감 대기는 아직 사람·네트워크 조건 검증이 없다.
- 위 세 항목은 콘텐츠 추가로 우회하지 않고 같은 build의 관찰 증거로 닫는다.
