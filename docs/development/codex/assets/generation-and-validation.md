---
title: Asset Generation and Validation
status: accepted
last_updated: 2026-08-17
implementation:
  - src/game/assets/AssetManifest.ts
  - src/game/phaser/assets/VisualAssetLoader.ts
  - src/game/phaser/rendering/UnitVisual.ts
  - public/assets/slice1/
related:
  - ../../../art/index.md
  - ../../../art/character/animation-and-weapon-layering.md
  - ../../../art/vfx/index.md
  - ../../../art/ui/combat-view/grid.md
  - ../../architecture/existing-scaffold-contract.md
---

# Asset generation and validation

이 문서는 Codex image generation을 포함한 bitmap·sprite production 절차와 in-engine 검증을 소유한다. 생성된 이미지는 장면의 분위기와 전투 인과를 강화해야 하며, text-heavy UI나 reference screenshot을 production asset으로 재생산하지 않는다.

## Slice 1 asset brief

- `jungle-barrier-room`: 아마존 canopy, 이어진 흙바닥, 오른쪽 결계문과 관리자·궁수의 진입 공간. 글자·UI·캐릭터를 포함하지 않는다.
- `administrator_slice_01`: compact sword와 cyan 봉인 해제 권한 detail을 가진 여성 전투원. 운영 console/원격 관리자처럼 보이지 않는 full-body side-facing silhouette.
- `archer_slice_01`: 활·시위·투사체 방향이 읽히는 원거리 동료.
- `barrier_guardian_slice_01`: 뿌리·moss와 고대 결계문 물성을 가진 넓은 보스 silhouette.
- 캐릭터 공통 prompt 기준: 4.5~5.5등신 세미 데포르메, 일본 애니메이션풍, 거친 브러시, 3단 명암, side-view 전투 pose. 캐릭터는 투명 배경으로 생성한다.
- 생성 asset: `public/assets/slice1/administrator-v2.png`, `archer-v2.png`, `barrier-guardian-v2.png`, `guardian-hound-v2.png`, `jungle-background-v2.png`, `jungle-ground-atlas-v2.png`.
- 캐릭터 asset은 genuine transparent background를 사용하고, ground shadow는 필요하면 runtime에서 생성한다.

## Generation workflow

1. [Art canonical docs](../../../art/index.md), [combat view](../../../art/ui/combat-view/index.md)와 대상 `AssetSpec`을 읽는다.
2. ImageGen을 사용할 때 distinct asset마다 한 번의 명시적 prompt를 만든다. 위 공통 style과 각 asset의 silhouette/pose를 prompt에 포함하고 transparent character는 투명 배경을 직접 요구한다.
3. 출력물을 먼저 시각 검사하고 silhouette, crop, alpha, artifact와 text/watermark를 확인한다.
4. 승인한 seed만 `public/assets/slice1/`에 복사한다. 생성 중간 파일은 canonical asset directory에 남기지 않는다.
5. `AssetManifest.ts`에 logical key, source와 display size를 등록한다. domain code에 파일 경로를 넣지 않는다.
6. `VisualAssetLoader`/visual adapter가 등록 bitmap을 사용하고, 누락 시 같은 상태 계약의 fallback silhouette를 사용하게 한다.
7. 실제 Phaser 장면에서 idle, 이동, 사격, 밀치기, 내려찍기, hit, stun, death와 봉인 해제를 검증한다.

## Current provenance and composition

v2 seed는 ImageGen으로 생성한 원본을 mechanical alpha cleanup(배경 제거·알파 가장자리 정리) 후 atlas composition(정렬된 직사각형 tile 배치)한 결과다. 배경과 `jungle-ground-atlas-v2.png`는 별도 asset/layer로 유지한다. character cutout은 alpha cleanup 뒤 padded crop하고 runtime에서 bottom-center anchor로 투영한다. ground atlas는 1024×128 PNG에 256×128 frame 4개를 수평 배치한다. 원본 prompt와 생성 시점은 작업 handoff에 보존하고, 최종 path·alpha 처리·atlas dimensions·in-engine screenshot/build SHA를 함께 기록한다.

### v2 prompt and path ledger

| Asset path | ImageGen prompt summary | Post-processing |
| --- | --- | --- |
| `public/assets/slice1/administrator-v2.png` | `about 5 heads tall semi-deformed Japanese anime-style female frontline administrator, silver hair, black layered combat outfit, cyan authority details and compact sword, rough dry-brush three-value rendering, readable right-facing side-view combat pose, transparent background` | mechanical alpha cleanup; padded crop; runtime bottom-center anchor |
| `public/assets/slice1/archer-v2.png` | `about 5 heads tall semi-deformed Japanese anime-style ranged companion archer, moss-green and ochre jungle coat, rough dry-brush three-value rendering, right-facing bow-ready side-view pose, transparent background` | mechanical alpha cleanup; padded crop; runtime bottom-center anchor |
| `public/assets/slice1/barrier-guardian-v2.png` | `about 5.5 heads tall massive Amazon jungle barrier guardian, ritual stone and wood armor, carved mask, root limbs, obsidian and orange cracks, rough three-value rendering, left-facing wind-up silhouette, transparent background` | mechanical alpha cleanup; padded crop; runtime bottom-center anchor |
| `public/assets/slice1/guardian-hound-v2.png` | `small jungle barrier hound with wood and obsidian mask, roots and vines, amber seams, forward-leaning left-facing charge pose, rough three-value rendering, transparent background` | mechanical alpha cleanup; padded crop; runtime bottom-center anchor |
| `public/assets/slice1/jungle-background-v2.png` | `Amazon jungle barrier gate room, continuous soil floor and canopy, atmospheric side-view background, rough painted brush, three-tone value grouping, no characters, no text, no UI` | opaque background layer; no atlas composition |
| `public/assets/slice1/jungle-ground-atlas-v2.png` | `2x2 terrain atlas concept with four edge-to-edge compacted wet-earth variations, no gutter, perspective, grid, characters or text` | four frames recomposed horizontally; 1024×128 atlas, 256×128 per frame; separate ground layer |

These are prompt summaries, not a claim that the generated image itself is a production sprite sheet. The exact source request and generation metadata belong in the asset handoff; this ledger keeps the reproducible intent and final repository path in the canonical documentation.

## Animation contract

- body는 bottom-center anchor와 행 baseline을 공유한다.
- 관리자 `밀치기`는 보스 이동과 BODY Intent origin 변경을 함께 보여준다.
- 궁수 `사격`은 활시위, release, 투사체, 가장 앞 적 hit를 구분한다.
- `내려찍기`는 wind-up·impact·stun recoil·중단된 `외침`을 구분한다.
- asset 교체만으로도 `idle`, `move`, `attack`, `hit`, `knockback`, `stun`, `death`의 의미가 유지돼야 한다.

## Validation layers

### Static

- 파일명·source 경로
- 실제 dimensions와 alpha/transparency
- frame/atlas bounds, crop과 bottom-center anchor
- text, watermark, unintended background와 생성 artifact

### Preview

- 관리자·궁수·보스 silhouette 구별
- weapon/projectile 방향성
- 캐릭터가 cell보다 크고 일부 overlap해도 depth와 baseline이 보이는지
- 정글 바닥과 캐릭터가 transparent edge에서 깨지지 않는지

### In-engine

- 16:9, 4:3와 390px mobile에서 scene-first framing
- occupied/relevant area camera와 12x3 logical map 관계
- 이동·공격·Intent·hit/VFX·death·봉인 해제의 시간 순서
- HP/AP, turn banner, action bar와 world label이 sprite를 가리지 않는지
- console/page/request error 0건, reset/restart 뒤 이전 animation 누수 없음

Screenshot은 미관 참고가 아니라 Canvas/WebGL 결과의 필수 evidence다. 최종 승인 전에는 asset path, prompt와 screenshot/build SHA를 기록한다.
