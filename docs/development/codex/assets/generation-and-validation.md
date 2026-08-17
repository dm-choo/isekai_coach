---
title: Asset Generation and Validation
status: accepted
last_updated: 2026-08-17
implementation:
  - src/game/assets/AssetManifest.ts
  - src/game/phaser/assets/VisualAssetLoader.ts
  - src/game/phaser/rendering/UnitVisual.ts
related:
  - ../../../art/index.md
  - ../../../art/character/animation-and-weapon-layering.md
  - ../../../art/vfx/index.md
  - ../../architecture/existing-scaffold-contract.md
---

# Asset generation and validation

이 문서는 Codex를 이용한 에셋 생산 절차를 소유한다. 이번 canonical documentation 작업에서는 이미지, sprite, VFX, font 또는 binary asset을 생성하지 않는다.

## Bitmap and sprite workflow

1. [Art canonical docs](../../../art/index.md)와 작업 대상 `AssetSpec`을 확인한다.
2. 게임 내 실제 표시용 seed frame 후보를 생성한다.
3. 사용자가 승인한 seed frame 하나를 고정한다.
4. 개별 frame을 따로 생성하기보다 가능한 한 전체 animation strip을 한 번에 생성한다.
5. 전체 strip을 공통 scale과 bottom-center anchor로 normalize한다.
6. 필요하면 frame 01을 승인 seed로 lock-back한다.
7. preview sheet를 생성한다.
8. Phaser 실제 장면에 삽입한다.
9. 16:9와 4:3 browser screenshot으로 검증한다.
10. 승인된 final만 workspace와 repository에 저장한다.
11. 중간 생성물은 canonical asset directory에 남기지 않는다.

실제 pixel dimensions와 frame count는 seed와 in-engine test 후 `AssetSpec`에서 확정한다.

## UI and HUD routing

- text-heavy UI는 React/DOM으로 구현한다.
- 정확한 spatial overlay는 Phaser/Canvas가 소유한다.
- icon, 기술선, HUD frame이 SVG/CSS/code-native에 적합하면 ImageGen을 사용하지 않는다.
- ImageGen으로 만든 UI mockup을 production UI로 간주하지 않는다.

## Validation layers

### Static

- filename
- dimensions
- alpha와 transparency
- frame count
- atlas bounds
- required animation clip
- body와 weapon frame alignment

### Preview

- frame-to-frame scale drift
- bottom-center anchor
- silhouette consistency
- 실제 game scale의 action readability

### In-engine

- sprite baseline
- weapon attachment
- HUD obstruction
- grid readability
- red enemy Intent와 blue ally prediction 구별
- 16:9와 4:3 responsive sanity
- Canvas/WebGL 시각 검증용 browser screenshot

Screenshot은 선택적인 미관 참고가 아니라 Canvas/WebGL 결과를 검증하는 필수 evidence다.
