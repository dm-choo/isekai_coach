---
title: Action Bar and Ally Policy Label Art
status: accepted
last_updated: 2026-08-17
related:
  - ../../../ux/views/combat-view.md
  - ../../../gameplay/combat/policy/action-policy.md
  - intent-and-ally-prediction.md
  - ../foundations.md
---

# Action bar and ally policy label art

- 관리자 action bar는 하단 중앙에 작고 넓게 두며 장면·캐릭터·보스 HP를 가리지 않는다.
- public Slice 1의 공격 이름은 `밀치기`와 `내려찍기`만 사용한다. 이동은 action bar 공격이 아니라 WASD와 이동 후보 표시로 전달한다.
- 각 action button은 큰 silhouette icon, 짧은 이름, AP 표시를 가진다. 기술의 세부 효과와 태그는 hover/focus tooltip에서만 확장한다.
- 선택 불가 상태는 흐림·잠금·AP 부족 icon을 함께 사용한다. 색만으로 비활성 상태를 전달하지 않는다.
- 턴 종료는 공격과 구별되는 작은 전용 control이다. `<아군 턴>`으로 넘어가는 변화가 버튼 상태와 배너로 명확해야 한다.
- 궁수의 자동 policy는 5-slot 목록을 전투 중 편집할 수 없다. 현재 실행한 `회피`, `포지셔닝`, `사격`, `밀치기`의 icon/name과 한 줄 reason만 짧게 노출한다.
- `방어 전개`, `맥동 밀치기`, `신호 창격` 등 승인되지 않은 명칭을 label·tooltip·fallback text에 사용하지 않는다.
- 전체 policy 판정표, 후보 전투 dashboard와 개발 event log는 production-intent scene 밖에 둔다.

정확한 icon geometry, typography, spacing과 16:9·4:3·390px 대응은 browser screenshot과 실제 플레이테스트로 검증한다.
