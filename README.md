# Isekai Coach — Slice 1

[![CI](https://github.com/dm-choo/isekai_coach/actions/workflows/ci.yml/badge.svg)](https://github.com/dm-choo/isekai_coach/actions/workflows/ci.yml)

아마존 정글의 결계문 앞에서 관리자 전투원과 원거리 동료가 결계 수호자를 마주하는 Web 전투 장면이다. 현재 제작의 목적은 모든 시스템을 설명하는 개발 sandbox가 아니라, 실제 보스방에서 전투 UI·UX 마찰과 타격 인과를 플레이로 찾는 것이다.

## Play the current slice

- Public: [https://openai.ktwome.cc/slice1/](https://openai.ktwome.cc/slice1/)
- Local dev server: `npm run dev`
- code-server proxy: `./dev_test_run.sh` then `/absproxy/8082/`

### Intended encounter

```text
intro reveal
→ <내 턴>: WASD로 제압 범위를 벗어나고 Space로 plan 확정
→ <아군 턴>: 궁수가 포지셔닝 후 가장 앞 적에게 사격
→ <적 턴>: 수호자가 2칸 이동 후 제압을 해결
→ <내 턴>: WASD 접근 / 내려찍기로 외침 interrupt
→ 수호자의 하수인 소환과 하수인의 원거리 동료 추적
→ 제압 → 외침 → 소환 pattern 반복
→ 수호자 처치 / 관리자 봉인 해제
```

관리자는 전장 밖의 운영자가 아니라 직접 움직이고 공격하는 전투원이다. 관리자만 전투 뒤 결계 오브젝트의 봉인을 해제한다. 궁수 동료는 고정된 5-slot policy를 자동으로 평가하며 이 slice에서 policy 편집은 제공하지 않는다.

승인된 public action/tag 이름은 다음과 같다.

| Action | Tags |
| --- | --- |
| 회피 | `#이동 #위협대응` |
| 포지셔닝 | `#이동 #공격준비` |
| 사격 | `#원거리공격` |
| 밀치기 | `#근거리공격 #넉백` |
| 내려찍기 | `#근거리공격 #스턴` |

이동(WASD)과 공격은 별개다. 관리자 action은 plan이며 `Z`는 마지막 하나 undo, `Space`는 전체 확정이다. hover는 동료 policy와 적 Intent의 what-if를 보여준다. `사격`은 투사체로 같은 행의 가장 앞 적 하나를 맞힌다. 보스 pattern은 `제압`(2칸 이동→1×1 피해6), `외침`(5×3 피해2, 중단 가능), 원거리 동료 추적 하수인 소환을 반복한다. 하수인은 HP1 `돌진`(3×1 피해2)을 사용한다.

## Technical boundary

```text
pure TypeScript BattleState
  → BattleEngine
  → CombatEvent history
  → AnimationDirector
  → Phaser presentation
```

`BattleState`가 전투 규칙의 source of truth다. React는 public shell과 typed bridge를 소유하고 Phaser는 확정된 event를 애니메이션으로 재생한다. logical map은 `12 x 3`으로 유지하지만 camera는 점유·관련 Intent 영역을 중심으로 frame한다. 배경의 실제 흙바닥 위에 짧은 grid corner와 점유 ring만 두고, 아군·적 Intent cell은 필요한 순간에만 강조한다. 캐릭터는 asset별 발 anchor를 logical cell 중심에 고정한다.

## Development

Node.js 20.19 이상이 필요하다.

```bash
npm install
npm test
npm run typecheck
npm run build
npm run verify:combat-ux
```

주요 scripts:

| script | 역할 |
| --- | --- |
| `npm run dev` | Vite 개발 서버 |
| `npm test` | domain/controller headless tests |
| `npm run typecheck` | TypeScript 정적 검사 |
| `npm run build` | production build |
| `npm run verify:combat-ux` | 핵심 전투 흐름, Intent tooltip, 소환수 선택을 Chromium screenshot과 상태 assertion으로 검증 |
| `npm run build:slice` | `/slice1/` base production build |
| `npm run test:watch` | Vitest watch mode |

## Canonical documentation

문서는 `accepted`, `provisional`, `under-validation`, `deferred` 상태를 front matter로 구분한다. 연구·레퍼런스는 정본 계약을 대체하지 않는다.

- [Slice 1 scope and hypothesis](docs/submission/vertical-slice.md)
- [Combat view UX](docs/ux/views/combat-view.md)
- [Combat ground, grid and Intent art](docs/art/ui/combat-view/index.md)
- [Character animation and proportions](docs/art/character/index.md)
- [Existing scaffold contract](docs/development/architecture/existing-scaffold-contract.md)
- [Asset generation and validation](docs/development/codex/assets/generation-and-validation.md)
- [Deployment contract](docs/development/deployment/slice1.md)
- [Research index](docs/research/index.md)
- [Reference screenshots and sources](docs/images/reference_screenshot/README.md)
- [Documentation governance](docs/_meta/documentation-governance.md)

## Repository layout

```text
src/game/combat/       Phaser-independent state, rules, effects and events
src/game/slice/        Slice 1 scenario, controller and fixed ally policy
src/game/phaser/       Scene, assets, projection, renderer and animation
src/game/assets/       Logical asset manifest and visual state mapping
src/app/               React shell and Phaser bridge
public/assets/slice1/  Slice 1 bitmap/background assets
docs/                  Canonical gameplay, UX, art, research and deployment docs
deploy/                Shared-origin `/slice1/` deployment scripts
```

The current release is intentionally narrow. Policy language, exploration, economy, progression, multiplayer and a complete final game are outside Slice 1; see [submission scope](docs/submission/scope.md) and [scaffold contract](docs/development/architecture/existing-scaffold-contract.md).
