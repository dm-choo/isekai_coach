---
title: Submission Product Release Candidate Gate
status: accepted
last_updated: 2026-08-19
related:
  - milestones.md
  - scope.md
  - acceptance-criteria.md
  - sector-1-golden-run.md
  - ../development/architecture/existing-scaffold-contract.md
---

# Submission product release candidate gate

P7은 기능 추가가 아니라 하나의 commit을 재현 가능한 제품 후보로 고정하는 단계다. 자동 검증, 공개 배포와 사람 경험 검증을 분리하며 어느 하나도 다른 증거를 대신하지 않는다.

## Current boundary

현재 `npm run verify:submission-rc`는 기존 Slice 1·2의 기술 회귀를 검증한다. 새 영토·위임·결계 확장 골든 패스가 구현되기 전까지 그 결과를 `Product RC`로 부르지 않는다. P6에서 같은 명령을 확장하거나 새 명령으로 교체하고 exact SHA report를 남긴다.

## Required technical gate

제품 RC 명령은 다음을 순서대로 실행해야 한다.

1. TypeScript typecheck
2. 전체 domain/controller 회귀
3. fixed-seed 직접/위임 parity
4. 영토 상태·인접 편입·잘못된 순서 거부
5. save/load·retry determinism
6. production build
7. 첫 입력부터 샘·다음 좌표까지 browser golden path
8. 16:9·4:3 layout과 console/page/request errors 0건
9. 기존 Slice 1·2 회귀

중간 단계가 실패하면 뒤 단계를 실행하지 않는다. technical pass는 재미, 직관성 또는 pacing 통과를 뜻하지 않는다.

## Candidate checklist

| Gate | Completion |
|---|---|
| RC-0 Scope | deferred 기능이 blocker로 돌아오지 않고 complete cycle만 포함됨 |
| RC-1 Rules | 모든 자동 gate와 deterministic report 통과 |
| RC-2 Causality | 직접 학습→정책 수정→위임 결과의 사건 기록이 이어짐 |
| RC-3 Territory | 조건부 편입, contour, 샘과 다음 좌표 전이가 일치함 |
| RC-4 Layout | 1280×720, 960×720에서 핵심 정보와 입력이 가려지지 않음 |
| RC-5 Release | clean exact-SHA build와 public asset/browser smoke 통과 |
| RC-6 Recovery | 직전 release와 rollback target이 확인됨 |
| RC-7 Human | [Acceptance human gates](./acceptance-criteria.md#human-gates) 통과 |

## P0/P1 stop rules

다음 중 하나라도 있으면 제품 RC로 승격하지 않는다.

- 진행 불가, 입력 무반응, 죽음·턴·Intent 상태 불일치
- 직접/위임이 같은 상태·정책에서 다른 authoritative 결과를 만듦
- 결계 편입 조건과 실제 contour·효용 상태가 어긋남
- 새 브라우저에서 첫 조작을 찾지 못해 2분 이상 진행하지 못함
- 핵심 UI가 16:9 또는 4:3에서 가려짐
- 배포 SHA, 공개 자산 또는 rollback target을 확인할 수 없음

추가 콘텐츠, 최종 타이틀, 복합 경제와 polish는 현재 범위의 P0/P1이 아니다.

## Evidence handoff

배포 후 commit SHA, release path, public title/assets, Chromium errors, 직전 release와 rollback path를 별도로 기록한다. 자동 gate 통과 후보를 새로운 사람에게 설명 없이 맡기며, 사람 gate 전 표기는 `technical candidate`다.
