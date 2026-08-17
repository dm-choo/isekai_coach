---
title: Character Animation and Weapon Layering
status: accepted
last_updated: 2026-08-17
related:
  - proportions-and-rendering.md
  - ../vfx/action-and-system-vfx.md
  - ../../gameplay/combat/actions/weapon-actions.md
  - ../../development/codex/assets/generation-and-validation.md
---

# Character animation and weapon layering

## Accepted direction

- 제작은 반복 animation과 강한 대표 pose를 결합하는 hybrid 방식을 사용한다.
- idle, move와 hit는 가벼운 반복 애니메이션을 사용한다.
- 대표 공격은 강한 key pose, VFX, hitstop과 camera feedback을 결합한다.
- 제출본은 무기만 별도 layer로 교체한다.
- 방어구 외형 교체는 제출본에 없다.
- bottom-center anchor와 캐릭터/무기 frame alignment를 asset family 전체에서 유지한다.

## Under validation

정확한 픽셀 크기, frame 수, clip별 frame rate와 weapon attachment 좌표는 승인 seed sprite를 실제 Phaser 장면의 16:9·4:3 화면에서 검증한 뒤 AssetSpec에서 확정한다.
