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
- 작은 정수 HP는 어두운 후면, 진영별 fill, 최대 10개 눈금과 지연 피해 layer를 사용한다. 적 하수인은 보스가 아니어도 적색 HP 문법을 유지한다.
- 선택된 적은 논리 점유 cell 크기의 ground ring으로 표시하며 sprite 외곽 크기를 hitbox처럼 사용하지 않는다.
- 위험 HP, AP 소비와 회복은 색 외에도 길이, segment, icon이나 motion 변화로 읽혀야 한다.
- playfield를 가리는 대형 status dashboard를 만들지 않는다.
