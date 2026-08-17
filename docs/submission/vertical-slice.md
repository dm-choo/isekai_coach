---
title: Slice 1 — Amazon Barrier Guardian Boss Room
status: under-validation
last_updated: 2026-08-17
implementation:
  - src/game/slice/
  - src/app/App.tsx
  - src/game/phaser/
  - public/assets/slice1/
  - deploy/
related:
  - scope.md
  - ../gameplay/combat/turn-and-intent.md
  - ../gameplay/combat/policy/action-policy.md
  - ../ux/views/combat-view.md
  - ../art/ui/combat-view/index.md
  - ../research/validation-agenda.md
  - ../development/architecture/existing-scaffold-contract.md
  - ../development/deployment/slice1.md
---

# Slice 1 — Amazon Barrier Guardian boss room

## Decision

**Accepted on 2026-08-17:** 메카닉을 설명하는 개발 샌드박스가 아니라, 실제 게임의 보스방 한 장면을 production-intent 품질로 만든다. 현재 목표는 전투 시스템을 더 늘리는 것이 아니라 플레이어가 실제로 전투할 때 생기는 UI·UX 마찰을 찾는 것이다.

이 결정은 직전 공개 화면에 대한 `최악의 UI, 1.3/100` 평가에서 출발했다. 폐기할 특성은 다음과 같다.

- 전투보다 텍스트와 패널이 먼저 보이는 비행기 계기판형 hierarchy
- 행동 의미를 읽기 전에 시스템 용어를 해석해야 하는 조작
- 관리자를 전장 밖 원격 운영자로 오해하게 하는 presentation
- 셀이 서로 떨어진 유리 발판처럼 보이는 grid
- 정책 편집과 메카닉 설명을 보스전 자체보다 앞세우는 흐름

현재 build는 [https://openai.ktwome.cc/slice1/](https://openai.ktwome.cc/slice1/)에서 제공한다. 배포 성공은 아래 경험 가설의 통과를 뜻하지 않는다.

## Primary hypothesis — under-validation

> 전투 장면이 화면을 지배하고, 턴 소유권·적 의도·이동·공격·피격이 애니메이션으로 분리되면, 플레이어는 설명 패널을 읽지 않고도 아마존 보스방에 들어와 동료와 함께 싸운다고 느끼며 전투 시스템의 실제 마찰을 지적할 수 있다.

하위 가설은 다음과 같다.

1. `<내 턴> → <아군 턴> → <적 턴>` 전환만으로 현재 agency를 즉시 구분한다.
2. WASD 이동과 행동 bar의 공격을 별개 동사로 이해한다.
3. 바닥에 잠깐 나타나는 적 공격 범위와 월드 라벨로 BODY 이동·중단 가능성을 읽는다.
4. 관리자의 수동 공간 개입과 원거리 동료의 자동 전술 실행을 서로 다른 agency로 느낀다.
5. 수호자 처치 뒤 `관리자만 봉인 해제`하는 결말이 관리자 정체성을 메뉴가 아니라 전장 행동으로 전달한다.

## Target experience

```text
울창한 아마존 결계문에 관리자와 활 동료가 진입한다
→ 거대한 결계 수호자가 길을 막는다
→ 짧고 치명적인 공격 범위가 관리자 발밑에 고정된다
→ 관리자가 밀치기로 수호자의 몸과 공격 원점을 함께 옮긴다
→ 동료가 회피·포지셔닝·사격 우선순위를 스스로 평가해 화살을 쏜다
→ 수호자가 3개 행을 덮는 광범위 공격을 준비한다
→ 관리자가 WASD로 접근하고 내려찍으로 공격을 중단한다
→ 동료의 후속 사격으로 수호자가 쓰러진다
→ 관리자가 결계 오브젝트의 봉인을 해제한다
```

목표 문장은 다음과 같다.

> 나는 전장 안에서 직접 움직여 보스의 행동을 무너뜨렸고, 동료는 내가 일일이 명령하지 않아도 그 틈을 활용했다.

이 장면은 결정론적 퍼즐처럼 보여 주는 것이 목표가 아니다. combat kernel의 결정론은 재현성과 검증을 위한 기술 계약으로 유지하지만, presentation은 보스 조우·공격 준비·투사체·타격·스턴·죽음과 봉인 해제의 시간적 경험을 우선한다.

## Accepted encounter contract

### Roles

- **관리자:** 전장의 여성 전투원이다. 턴마다 이동과 공격을 직접 선택한다. 유일한 특수 권한은 전투 뒤 오브젝트의 봉인을 해제하는 것이다.
- **원거리 동료:** 활을 사용하고 5-slot action policy를 위에서부터 평가한다. 이 장면에서는 policy를 편집하지 않는다.
- **결계 수호자:** 아마존 결계문을 지키는 2단계 보스다.

### Exact action names

- 관리자: `밀치기`, `내려찍`
- 동료 policy: `회피`, `포지셔닝`, `사격`, `밀치기`, `빈 슬롯`
- 이동: WASD, 공격과 별개, AP 1

승인되지 않은 `방어 전개`, `맥동 밀치기`, `신호 창격` 같은 이름은 public slice에서 사용하지 않는다.

### Tags

태그는 조건이 아니라 분류와 tooltip metadata다.

- 회피 `#이동 #위협대응`
- 포지셔닝 `#이동 #공격준비`
- 사격 `#원거리공격`
- 밀치기 `#근거리공격 #넉백`
- 내려찍 `#근거리공격 #스턴`

### Boss phases

- **Phase 1 — 짧은 타격:** BODY-anchor, 왼쪽 1칸, 피해 5. 수호자를 밀면 locked direction은 유지된 채 공격 원점과 범위가 함께 이동한다. 이 공격은 stun으로 중단되지 않는다.
- **Phase 2 — 광범위 공격:** BODY-anchor, 왼쪽 5칸 × 3개 행, 피해 4. `내려찍`의 확정 stun으로 현재 intent를 취소할 수 있다.
- 수호자에게 root, push resistance, unblockable, minion을 추가하지 않는다.

### Projectile and positioning

- `사격`은 같은 행 전방 2~5칸의 실제 투사체다.
- 같은 행에 여러 적이 있으면 가까운 cell부터 검사해 가장 앞의 적 하나가 맞는다. 기본 사격은 관통하지 않는다.
- `포지셔닝`은 기본적으로 가장 앞의 적을 기준으로 한 칸 이동한다. 특정 적 우선 정책은 deferred다.

## Camera and spatial presentation

- logical map은 `12x3`을 유지한다. 화면에 항상 12개 열을 모두 그리지 않는다.
- 카메라와 projection은 현재 점유자와 relevant Intent 주위를 frame한다.
- 캐릭터는 한 cell보다 클 수 있고 서로 겹칠 수 있다. 한 명 한 명의 행동과 타격을 읽는 것이 전역 cell 개수 노출보다 중요하다.
- 바닥은 한 장의 이어진 정글 흙바닥이다. 평소 grid tile을 그리지 않고 행 baseline만 은은하게 남긴다.
- 선택·이동 후보·적 Intent처럼 현재 필요한 cell만 월드 공간에 표시한다.
- 광범위 공격은 3개 행의 affected cells를 일시적으로 드러내되, 발판처럼 보이는 상시 지형으로 취급하지 않는다.

## UI hierarchy

Darkest Dungeon의 장면 우선 hierarchy를 기본 참고로 삼고, DNF의 side-view 깊이·큰 캐릭터 겹침, One Step From Eden의 순간적인 cell telegraph 판독성을 문제 해결 참고로 사용한다. 표면적인 아트 복제는 하지 않는다.

화면 우선순위는 다음과 같다.

1. 전투 장면과 전투원 실루엣
2. 보스 HP·phase와 현재 Intent
3. `<내 턴>`, `<아군 턴>`, `<적 턴>` 전환
4. 관리자 HP/AP와 하단 행동 icon
5. 현재 실행 중인 동료 policy 한 항목
6. tooltip 안의 세부 tag와 비용

정책 전체 판정표, event log, simulation head, speed controls와 개발 설명은 public boss scene에 상시 노출하지 않는다.

## Implemented facts

- pure TypeScript `BattleEngine`이 authoritative state와 `CombatEvent`를 생성한다.
- `STUN` effect, interruptible intent, projectile first-hit targeting과 BODY area change가 domain event 순서로 해결된다.
- `SliceController`가 관리자 input, 동료 5-slot policy loop, 세 턴 phase와 presentation queue를 조정한다.
- React는 HUD·action bar·turn banner를, Phaser는 world unit·telegraph·projectile·camera·VFX를 소유한다.
- generated bitmap background와 세 character cutout을 manifest/preload pipeline으로 소비한다.
- 정적 cutout은 idle breathing, move, lunge, bow draw/projectile, hammer slam, hit, knockback와 death transform으로 상태를 구분한다.
- 수호자 처치 뒤 controller가 presentation port를 통해 seal unlock 연출을 실행한다. 이 environment interaction은 combat damage 규칙을 바꾸지 않는다.
- reset은 playback을 abort하고 동일 encounter를 새 generation으로 복원한다.

## Asset boundary

현재 asset은 최종 캐릭터 시트가 아니라 production-intent cutout이다.

- 생성 원본과 최종 prompt 기록은 [asset generation](../development/codex/assets/generation-and-validation.md)이 소유한다.
- 캐릭터 PNG는 genuine alpha를 가진 RGBA cutout이어야 한다. checkerboard가 보이면 실제 투명도로 승인하지 않으며, alpha histogram·edge artifact를 검증한 뒤에만 manifest에 연결한다.
- bitmap path는 combat domain이 아니라 `AssetManifest`에만 존재한다.
- 향후 sprite sheet를 넣더라도 controller와 domain action/event 계약은 바꾸지 않는다.

## Verification completed

2026-08-17 로컬 구현 milestone:

- Vitest: 3 files, 29 tests
- TypeScript: `tsc --noEmit`
- production build: Vite `/slice1/` base build
- scripted Chromium flow: intro → turn 1 push → ally arrows → turn 2 WASD move → slam interrupt → victory
- 단계별 1440×900 screenshots: intro, turn 1, push aftermath, turn 2 wide telegraph, victory
- browser console/page errors: 0
- 한글 webfont load-before-Phaser와 character alpha를 screenshot으로 재검증

이 증거는 규칙과 구현이 실행된다는 뜻이다. `게임 같다`, 정보가 충분히 읽힌다, 재미있다는 평가는 외부 플레이테스트 전까지 `under-validation`이다.

## Known validation questions

- intro에서 전투 목표를 별도 설명 없이 이해하는가?
- Phase 1에서 밀치기가 damage button이 아니라 BODY 공격 원점 이동으로 읽히는가?
- Phase 2의 15-cell telegraph가 명확하지만 장면을 다시 grid puzzle처럼 만들지는 않는가?
- `내려찍`의 스턴과 intent 취소가 같은 사건으로 보이는가?
- 동료 policy ribbon이 자동행동의 이유를 설명하면서도 계기판처럼 느껴지지 않는가?
- 정적 cutout transform이 production scene으로 피드백할 만큼 충분한 타격감을 주는가, 아니면 frame animation이 다음 P0인가?
- 이동과 공격에 모두 AP를 쓰는 현재 provisional tuning이 불필요한 마찰을 만드는가?
- `턴 종료`를 명시적으로 누르는 흐름이 필요한 agency인가, 남은 AP를 버리는 불필요한 입력인가?

## Non-goals

- 이 전투 안에서 policy 순서를 편집하거나 실패 분석 화면을 여는 것
- 첫 섹터 전체, 탐색, 경제, 별동대와 operation channel 구현
- 범용 boss authoring tool과 여러 boss phase framework
- 최종 sprite sheet, voice, music와 production audio mix
- 이 한 전투의 수치로 전체 밸런스를 확정하는 것
- 게임을 완전정보 결정론 퍼즐로 확정하는 것

## Next gate

첫 외부 테스트에서는 참가자에게 조작 설명을 최소화하고 한 번 끝까지 플레이하게 한다. 종료 뒤 다음을 자신의 말로 설명하게 한다.

1. 각 순간 누구의 턴이었는가?
2. 첫 공격은 왜 빗나갔거나 맞았는가?
3. 두 번째 공격은 어떻게 중단됐는가?
4. 동료는 왜 이동하거나 사격했는가?
5. 가장 게임 같았던 순간과 가장 UI 같았던 순간은 무엇인가?

판독·조작·타격감 마찰을 먼저 수정한 뒤에야 policy editor, 새 전투원이나 다음 시스템을 제작한다.
