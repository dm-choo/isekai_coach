---
title: Submission Product Release Candidate Gate
status: accepted
last_updated: 2026-08-20
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

현재 `npm run verify:submission-rc`는 단독 각성·동료 해방부터 직접 탐사·정책 위임·결계 확장까지의 제품 골든 패스와 기존 Slice 1·2 회귀를 함께 검증한다. 통과 결과는 여전히 `technical candidate`이며, 신규 사용자 무설명 이해·재미·15~25분 pacing은 사람 gate 전까지 통과로 부르지 않는다.

## Required technical gate

제품 RC 명령은 다음을 순서대로 실행해야 한다.

1. TypeScript typecheck
2. 전체 domain/controller 회귀
3. fixed-seed 직접/위임 parity
4. 영토 상태·인접 편입·잘못된 순서 거부
5. save/load·retry determinism
6. production build
7. 첫 입력부터 샘·다음 좌표까지 browser golden path
8. 첫 단독 전투의 위협→위험한 preview 수정→안전한 실행→정상 턴 전이
9. 정상 턴의 scene-first Intent, action dock과 계획 결과 전경화
10. 첫 합동 전투의 동료 forecast→정책 source→계획 재계산→동일 정책 실행
11. 복도 정지→적 reveal→SPACE→같은 전장 입력의 연속 조우
12. 첫 합동 승리→경로 안전화→HP·시간 반영→200m 복귀
13. 중앙 방 승리→중앙점 확보→확인 뒤 네 방향 통로·위험 정찰
14. 직전 사격 실패→두 공간 대응→한 정책 변화와 pointer/keyboard parity
15. 선택 정책→400m 경로·두 위협→중단 조건→비합산 병렬 시간의 위임 계획
16. 실제 12×3 위임 기록→피해·시간→TIME_LIMIT/SECURED 경로 결과와 다음 행동
17. 동료 확보 경로→주인공 400m 이동→도착 후에도 OUTSIDE인 비활성 거점 연결
18. 16:9·4:3 layout과 console/page/request errors 0건
19. 기존 Slice 1·2 회귀

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
