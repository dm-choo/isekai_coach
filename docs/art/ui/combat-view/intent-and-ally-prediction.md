---
title: Intent and Ally Prediction Art
status: accepted
last_updated: 2026-08-17
related:
  - ../../../gameplay/combat/turn-and-intent.md
  - ../../../ux/views/combat-view.md
  - ../../vfx/information-vfx.md
---

# Intent and ally prediction art

- 적 Intent는 빨강, 동료 현재 예상은 파랑, 주인공 후보 이후 동료 예상은 옅은 파랑이다.
- cell highlight, path line과 icon을 함께 사용한다.
- 일반 공격과 가드 불가 공격은 색 외에 border, pattern과 icon으로 구분한다.
- 이동 경로를 공격 cell과 같은 red threat로 그리지 않는다.
- BODY 범위가 밀치기로 이동하면 old/new 관계가 연출 순서에서 읽혀야 한다.
- 정보 VFX는 화려함보다 cell 점유와 행동 순서를 우선한다.
