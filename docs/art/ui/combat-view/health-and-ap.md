---
title: Combat Health and AP Art
status: accepted
last_updated: 2026-08-17
related:
  - ../../../ux/views/combat-view.md
  - action-bar-and-policy-label.md
  - ../foundations.md
---

# Combat health and AP art

- HP와 AP는 전투 판단에 필요한 동안 캐릭터 또는 action bar와 공간적으로 연결한다.
- 작은 정수 HP는 세그먼트 표현을 사용할 수 있으나 정확한 최종 형태는 실제 sprite와 함께 검증한다.
- 위험 HP, AP 소비와 회복은 색 외에도 길이, segment, icon이나 motion 변화로 읽혀야 한다.
- playfield를 가리는 대형 status dashboard를 만들지 않는다.
