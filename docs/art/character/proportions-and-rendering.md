---
title: Character Proportions and Rendering
status: accepted
last_updated: 2026-08-17
related:
  - animation-and-weapon-layering.md
  - ../../narrative/protagonist-and-companions.md
  - ../../development/codex/assets/generation-and-validation.md
  - ../ui/combat-view/grid.md
---

# Character proportions and rendering

- 전투 캐릭터는 4.5~5.5등신의 세미 데포르메를 기본으로 하되, 한 셀 안에 갇힌 작은 token처럼 보이지 않는다.
- 화면에서는 논리 cell보다 큰 1×2에 가까운 인간 실루엣을 사용한다. 캐릭터가 일부 겹치는 것은 깊이감과 중요도를 위한 의도된 선택이다.
- 관리자는 무거운 무기와 실용적 탐험 장비로 즉시 전투원으로 읽혀야 한다. 원격 운영자·콘솔 조작자처럼 보이는 별도 silhouette는 사용하지 않는다.
- 궁수는 활, 팔 자세와 긴 projectile line으로 관리자와 구별한다.
- 결계 수호자는 좌우에서 읽히는 넓은 shoulder/body mass, 뿌리·moss와 고대 결계문 물성으로 보스임을 전달한다.
- 아마존 정글의 유기적 녹색·갈색 환경 위에서 아군은 청백 계열의 작은 관리자 신호, 적은 붉은 경고 신호로 구분한다. 색 외에도 silhouette, stroke와 motion을 사용한다.
- 얼굴을 작은 HUD portrait에 의존하지 않는다. 전투 크기에서 머리·무기·행동 pose가 먼저 읽혀야 한다.
- 귀엽지만 유아적으로 만들지 않으며, 거친 붓질과 실제 흙바닥의 물성을 유지한다.

정확한 표시 크기와 camera framing은 그리드 열 수를 줄여 해결하지 않는다. occupied/relevant area framing, event zoom과 world-space Intent label을 함께 검증한다.
