---
title: Barrier Territory and Expansion
status: accepted
last_updated: 2026-08-19
related:
  - sector-map.md
  - tile-states.md
  - local-area-and-scouting.md
  - regional-core-and-stabilizer.md
  - ../../narrative/barrier-and-restoration.md
  - ../../adr/0008-persistent-coordinate-barrier-expansion.md
---

# Barrier territory and expansion

## Responsibility

이 문서는 월드 타일의 영토 소속, 인접 편입, 결계선 변화와 불안정화 계약을 소유한다. 타일 내부 탐색은 [Local area and scouting](./local-area-and-scouting.md), 화면 표현은 [Map view UX](../../ux/views/map-view.md)가 소유한다.

## Orthogonal tile state

한 타일의 상태를 하나의 색이나 단계로 합치지 않는다. 최소 네 축을 별도로 저장한다.

| Axis | States | Meaning |
|---|---|---|
| 지식 | `unseen`, `revealed`, `scouted` | 위치만 아는지, 내부 통로까지 아는지 |
| 위협 | `hostile`, `contested`, `secured` | 현재 안전 경로와 핵심 지점이 확보됐는지 |
| 영토 | `outside`, `incorporated` | 결계선 안에 영구 편입됐는지 |
| 효용 | `dormant`, `active`, `impaired` | 시설·자원·안전 이동이 기능하는지 |

`stabilized`는 별도 불리언 또는 안정도 속성이다. 안정화는 편입과 같지 않으며, 편입 타일의 불안정화를 예방하는 추가 관리다.

예를 들어 `scouted + secured + outside + dormant`인 전초지는 알고 안전하지만 아직 내 영토가 아니다. `scouted + contested + incorporated + impaired`인 타일은 내 영토지만 방치로 다시 위험해진 상태다.

## Expansion sequence

타일 편입은 다음 순서를 지킨다.

1. 결계선에 인접한 바깥 타일을 공개하고 현장 부대가 진입한다. 관찰하지 않은 규칙의 첫 조우는 본대 직접 플레이 또는 Decision 중단을 요구한다.
2. 중앙 목표를 해결해 통로를 정찰한다.
3. 기존 결계에서 확장 거점까지 이어지는 안전 경로 하나를 확보한다.
4. 해당 타일의 확장 조건과 결정 사건을 해결한다.
5. 주인공이 확장 거점에 물리적으로 도착해 관리자 권한으로 연결한다.
6. 타일을 `incorporated`로 등록하고 결계선을 그 타일 외곽까지 이동한다.
7. 타일의 기본 효용 하나와 다음 인접 좌표를 드러낸다.

동료는 1~4단계를 위임받을 수 있지만 5단계는 수행할 수 없다. 원격 메뉴 클릭, 반경 일괄 해제 또는 비인접 타일 건너뛰기로 편입할 수 없다.

## Contiguity and contour

- 새 편입 타일은 현재 편입 영토와 상하좌우 중 한 면 이상을 공유해야 한다.
- 결계선은 고정된 원이나 섹터 전체 해제가 아니라 편입 타일 집합의 외곽선을 따른다.
- 공개 범위와 편입 범위는 다르다. 높은 곳이나 지역 핵으로 먼 좌표를 볼 수 있어도 중간 타일 없이 편입할 수 없다.
- 섬처럼 단절된 예외 영토나 순간이동 거점은 완제품 확장 규칙 검증 뒤까지 **deferred**다.

## Instability and re-erosion

- 초기 제출본과 첫 캠페인에서는 결계선이 쉽게 축소되거나 편입이 취소되지 않는다.
- 방치, 단절된 보급, 지역 사건 또는 적 재유입은 편입 타일의 위협을 `contested`, 효용을 `impaired`로 바꿀 수 있다.
- 불안정 타일은 안전 이동·생산·자동 작업을 잃거나 제한하며 통로 인카운터를 새 generation으로 재추첨한다.
- 중앙 목표와 필요한 경로를 다시 확보하면 효용을 복구할 수 있다. 시설, 영토 소속과 소비한 일회성 보상은 유지된다.
- 안정화 장치는 재침식 위험을 낮추거나 제거하지만 모든 타일에 필수는 아니다.

정확한 불안정 발생 시간과 안정화 유지비는 **under-validation**이다.

## Sector completion

섹터의 지역 핵이나 주요 위협을 해결하면 장거리 연결, 최대 유지 용량 또는 다음 지역 접근이 열린다. 이는 섹터의 모든 타일을 자동 편입하거나 기존 영토를 삭제하지 않는다. 플레이어가 남겨 둔 전초지, 시설과 불안정 타일은 실제 좌표에 계속 존재한다.
