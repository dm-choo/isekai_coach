---
title: Sector 1 Golden Run
status: accepted
last_updated: 2026-08-17
related:
  - scope.md
  - first-15-minutes.md
  - acceptance-criteria.md
  - ../gameplay/world/index.md
  - ../gameplay/economy/index.md
---

# Sector 1 golden run

이 문서는 첫 섹터에서 canonical mechanics를 보여주는 대표 진행 순서를 소유한다. 각 단계의 규칙은 링크된 gameplay·narrative·UX owner가 소유한다.

## Awakening

1. 맵뷰에서 유적을 클릭한다.
2. 로컬 영역에서 자유 이동한다.
3. 첫 빈 지점을 지난다.
4. 의문의 혼령과 전투한다.
5. 특수 회로를 찾는다.
6. 관리자 권한으로 회로를 작동시킨다.
7. 유적을 탈출한다.

배경과 권한은 [Premise](../narrative/premise.md)와 [Administrator system](../narrative/administrator-system.md), 이동 경험은 [Local area](../gameplay/world/local-area-and-scouting.md)가 소유한다. 첫 근접 행동의 정확한 이름과 수치는 **under-validation**이며 별도 `Jab` 정책은 사용하지 않는다.

## Beacon trail

1. 유적 주변 8칸이 밝음으로 보인다.
2. 북쪽 흐린 경로와 비콘 silhouette를 발견한다.
3. 첫 타일에서 쇠파이프를 얻는다.
4. 다음 타일에서 단검 고블린을 만난다.
5. 고블린의 접근과 비껴 찌르기를 관찰한다.
6. 낡은 단검을 획득한다.
7. 비콘에 도달한다.

타일의 의미는 [Tile states](../gameplay/world/tile-states.md)가 소유한다.

## Beacon activation

1. 관리자 권한으로 비콘을 재가동한다.
2. 반지름 3칸을 흐림으로 공개한다.
3. 주요 시설 silhouette를 확인한다.
4. 동료 2명을 해방한다.
5. 작전 채널이 활성화된다.
6. 동료 A가 철광산 후보 조사를 제안한다.
7. 동료 B는 주인공과 동행한다.

비콘의 공개·복원 규칙은 [Beacon and magic torch](../gameplay/world/beacon-and-magic-torch.md)가 소유한다.

## Split operations

- 동료 A와 단검은 철광산 방향 별동대를 구성한다.
- 주인공과 원거리 동료 B는 대장간 방향 본대를 구성한다.
- 첫 합동 전투에서 주인공은 접근한 적을 밀쳐 원거리 동료의 예상 행동을 후퇴에서 사격으로 바꾼다.
- 본대 전투 중 별동대는 고블린 자동전투를 진행한다.

부대와 시간 처리는 [Parties](../gameplay/operations/parties.md)와 [Shared world time](../gameplay/operations/world-time.md), 전투 연쇄는 [Turn and Intent](../gameplay/combat/turn-and-intent.md)가 소유한다.

## Policy revision (post-Slice 1, under validation)

이 단계는 Slice 1 public boss room의 범위가 아니다. 후속 build에서만 검증한다.

1. 별동대 작전 채널에서 전투를 관전한다.
2. 분석 모드로 전환한다.
3. 비껴 찌르기 정책을 회피 위로 옮긴다.
4. 다음 실제 자동전투를 진행한다.
5. 이전보다 줄어든 턴, 시간과 피해를 객관적으로 비교한다.

정책 규칙은 [Action policy](../gameplay/combat/policy/action-policy.md), 비교 경험은 [Replay and analysis](../ux/flows/replay-and-analysis.md)가 소유한다. 정책 변경은 과거 기록을 다시 계산하지 않는다.

## Sector completion

1. 철광산을 확보한다.
2. 채집·적재·운송을 수행한다.
3. 대장간을 복구한다.
4. 장비를 제작한다.
5. 횃불로 경로를 안정화한다.
6. 최종 던전에 진입한다.
7. 결계 수호자와 싸운다.
8. 관리자 권한으로 결계를 해제한다.
9. `Thanks for Playing Demo`를 표시한다.
10. 완료 뒤에도 첫 섹터를 자유 플레이할 수 있다.

경제 흐름은 [Economy](../gameplay/economy/index.md), 진행 고정은 [Beacon and magic torch](../gameplay/world/beacon-and-magic-torch.md), 완료 뒤 저장은 [Failure, save, and recovery](../gameplay/operations/failure-save-and-recovery.md)가 소유한다.

## Under validation

- 첫 섹터 총 플레이 시간은 약 25~40분 예상이다.
- 결계 수호자는 주인공과 동료 1명으로 클리어 가능해야 한다.
- 현재 후보는 빠른 접근 뒤 짧고 치명적인 BODY 공격, 그리고 중단 가능한 강공격과 낮은 HP 종속 몬스터를 조합한 2단계다.
- 정확한 pattern, 수치와 종속 몬스터 구성은 플레이테스트 전에는 확정하지 않는다.
