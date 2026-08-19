---
title: Submission Release Candidate Gate
status: accepted
last_updated: 2026-08-19
related:
  - milestones.md
  - scope.md
  - acceptance-criteria.md
  - sector-1-golden-run.md
  - ../development/deployment/slice2.md
---

# Submission release candidate gate

M7은 기능 추가가 아니라 하나의 commit을 재현 가능한 제출 후보로 고정하는 단계다. 자동 검증 통과와 실제 사람의 경험 검증을 분리하며, 둘 중 하나를 다른 하나의 증거로 사용하지 않는다.

## One-command technical gate

```bash
npm run verify:submission-rc
```

이 명령은 다음을 순서대로 실행하고 `artifacts/submission-rc/report.json`에 SHA와 결과를 남긴다.

1. TypeScript typecheck
2. 전체 Vitest domain/controller 회귀
3. Slice1 production build
4. Slice1 보스 interaction browser flow
5. Slice2 production build
6. Slice2 4타일·정책 수정·보스·봉인 해제 전체 golden path

중간 단계가 실패하면 뒤 단계를 실행하지 않는다. 결과 report의 `TECHNICAL_PASS`는 재미, 직관성 또는 20~30분 pacing의 통과를 뜻하지 않는다.

## Candidate checklist

| Gate | 완료 조건 | 증거 |
|---|---|---|
| RC-0 Scope | deferred 기능이 제출 blocker로 돌아오지 않음 | scope와 golden run diff review |
| RC-1 Rules | typecheck와 모든 unit test 통과 | RC report `typecheck`, `unit` |
| RC-2 Slice1 | 보스 턴 1~4, interrupt와 소환수 선택 회귀 없음 | combat-ux report/screenshots |
| RC-3 Slice2 | 첫 입력부터 demo complete까지 7전투 완주 | slice2 report `goldenPath` |
| RC-4 Layout | 1280×720, 960×720 overflow와 browser error 없음 | slice reports |
| RC-5 Release | clean SHA build, passwordless scoped deploy, public title/assets/smoke 통과 | release path, public report |
| RC-6 Recovery | 직전 release와 Caddy backup이 존재하고 rollback target이 명확함 | `/srv/ooh/current`, deploy output |
| RC-7 Human | 무설명 first-use, 선택 이유, pacing, 재미 gate 통과 | 날짜·SHA가 있는 playtest note |

## P0/P1 stop rules

다음 중 하나라도 있으면 RC를 제출본으로 승격하지 않는다.

- 진행 불가, 입력 무반응, 죽음/턴/Intent 상태 불일치
- 예상 위치·대상·피해와 authoritative 결과 불일치
- 새 브라우저에서 첫 조작을 찾지 못해 2분 이상 진행하지 못함
- 핵심 UI가 16:9 또는 4:3에서 가려짐
- 배포 SHA, 공개 자산 또는 rollback target을 확인할 수 없음

단순 polish, 최종 타이틀, 추가 콘텐츠, bundle code splitting 경고는 현재 범위에서 P0/P1이 아니다. 다만 실제 초기 로딩 실패로 관찰되면 우선순위를 다시 올린다.

## Release procedure

```bash
git status --short
npm run verify:submission-rc
git push
npm run deploy:slice2
```

배포 후 다음을 별도로 기록한다.

- commit SHA
- `/srv/ooh/releases/<timestamp>-<sha>-slice2`
- `/srv/ooh/current`이 가리키는 release
- `/`, `/slice1/`, `/slice2/` title과 asset HTTP 200
- public Chromium error 0건
- 직전 release와 Caddy backup path

## Remaining human gate

자동 gate가 모두 통과한 후보를 기준으로 디렉터 3~5분 확인 후 새로운 사람 1명에게 설명 없이 맡긴다. 누적 3~5개 Goal 뒤에는 2~3명만 사용한다. 기록 질문은 [submission golden run](./sector-1-golden-run.md#lightweight-human-gates)을 그대로 사용한다.

사람 gate 전 상태 표기는 `technical RC`이며, 이를 `validated submission`이라고 부르지 않는다.
