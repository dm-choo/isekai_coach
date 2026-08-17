---
title: Character Animation and Weapon Layering
status: accepted
last_updated: 2026-08-17
related:
  - proportions-and-rendering.md
  - ../vfx/action-and-system-vfx.md
  - ../../gameplay/combat/actions/weapon-actions.md
  - ../../development/codex/assets/generation-and-validation.md
  - ../../ux/views/combat-view.md
---

# Character animation and weapon layering

## Slice 1 direction

- 관리자와 궁수 동료는 전장에 서 있는 combatant다. 관리자만 전투 뒤 결계 오브젝트 봉인을 해제한다.
- 결계 수호자는 아마존 정글의 거대한 보스 silhouette로, 작은 cell marker보다 우선해 읽혀야 한다.
- 평상시에는 idle breathing과 foliage reaction을 사용하고, 입력·턴·피격 순간에는 명확한 key pose를 사용한다.
- 전투 인과는 `wind-up → 이동/투사체 → hit → hit-stop/반응 → HP/상태 변화` 순서로 보인다. 행동을 즉시 색만 바꿔 끝내지 않는다.

## Required action beats

- WASD 이동: 발걸음·몸 기울기·짧은 위치 tween. 공격 pose를 재사용하지 않는다.
- `밀치기`: 관리자의 접근/타격 pose, 수호자의 knockback, BODY Intent origin 이동을 한 시간 흐름으로 연결한다.
- 궁수 `사격`: 활시위 당김, release, 실제 화면을 가로지르는 투사체, 가장 앞의 적 hit flash를 사용한다.
- `내려찍기`: 관리자의 무기 wind-up·내려치는 순간, 수호자의 stun recoil과 중단된 `외침`을 보여준다.
- 보스 공격: `제압`은 2칸 이동과 1×1 impact, `외침`은 5×3 wind-up과 interrupt, `하수인 소환`은 등장과 다음 턴의 `돌진`으로 서로 다른 인과를 보여준다. canonical 이름은 이 명칭을 그대로 사용한다.
- 죽음: 보스의 mass와 정글 환경 반응을 짧게 남긴 뒤 결계문·봉인 오브젝트가 전경이 된다.

## Layering and anchor

- body, weapon, projectile, hit VFX는 공통 bottom-center baseline과 facing 기준을 공유한다.
- 행이 바뀌면 unit depth가 함께 갱신된다. 캐릭터 overlap은 허용하되 weapon·HP·Intent label이 서로 가려지지 않게 한다.
- bitmap asset이 없을 때도 같은 pose/time contract를 fallback silhouette가 소비해야 한다.
- 무기만 교체 가능한 layer를 유지하되 이번 slice의 canonical public names는 `사격`, `밀치기`, `내려찍기`이다.

## Under validation

정확한 픽셀 해상도, frame 수, clip FPS와 weapon attachment 좌표는 seed asset을 실제 Phaser 장면에 넣고 16:9·4:3·390px screenshot으로 검증한 뒤 확정한다. 검증 기준은 작은 캐릭터도 공격 원인과 피격 반응을 한눈에 읽을 수 있는가이다.
