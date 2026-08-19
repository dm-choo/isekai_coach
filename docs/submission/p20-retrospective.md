---
title: P20 Expansion Spatial Result Retrospective
status: under-validation
last_updated: 2026-08-20
related:
  - p20-expansion-spatial-result-contract.md
  - p19-retrospective.md
  - acceptance-evidence-matrix.md
---

# P20 첫 영역 확장의 공간 결과 회고

## Result

확장 결과의 대형 영문 label·제목·설명 문단, 세 칸 상태 ledger, 네 단계 causality strip, 다음 좌표 text panel을 제거했다. 화면의 가장 큰 owner는 같은 영구 좌표에 놓인 다섯 world tile이다. 초기 결계와 새로 편입된 물안개 전초지는 같은 흙 연결부와 하나의 6-edge outer contour로 이어지고, 이전 shared seam은 활성화 animation 뒤 사라진다.

새 타일 위에는 열린 anchor node와 주인공이 함께 남는다. 같은 타일의 샘은 water glyph·pulse·`+1`을 표시하고 상단 실제 water 값과 일치한다. 동·북·남 세 REVEALED/OUTSIDE tile은 새 타일에서 뻗는 세 link 끝에 어둡게 남는다. 다음 primary는 두 owned tile glyph→restart→SPACE 하나뿐이다.

## Verification evidence

- `npm run verify:submission:p4`: EXPANDED; activation 전후 revision +1, incorporated 2, revealed OUTSIDE 3, contour 6과 internal edge 0, open anchor·protagonist·spring +1·next link 3, 1280×720·960×720 overflow 0, browser error 0
- 13 files, 94 unit tests: pass
- production build: pass; P19 공개본 대비 CSS `122,118→123,653` bytes(+1,535), SubmissionApp JS `118,605→117,954` bytes(-651)
- 직접 비교: golden `14-expanded`, `14-expanded-text-off`, `15-expanded-4x3`
- retired expanded copy·ledger·causality·coordinate panel과 closed lock 0

자동·시각 증거는 결과 state와 공간 표현 parity를 닫는다. 신규 사용자가 설명 없이 `주인공이 거점을 켜 결계가 한 타일 넓어졌고 샘과 세 다음 길이 열렸다`고 설명하는지는 human gate 전까지 REQUIRED다.

## Initial model

- **사실:** activation은 이미 편입, 효용 ACTIVE, 안정화, water +1, 세 좌표 reveal과 contour 재계산을 한 atomic transition으로 소유한다.
- **문제:** 기존 결과는 실제 다섯 좌표와 contour를 오른쪽 장식처럼 두고, 왼쪽 제목·ledger·좌표 문장이 결과를 대신 해석했다.
- **가설:** P15에서 학습한 중심→방향 link, P19의 anchor, 기존 world tile·contour를 한 좌표계에 조합하면 새 결과 dashboard 없이 전체 cycle의 목적을 보일 수 있다.
- **제약:** 다음 세 좌표는 REVEALED일 뿐 incorporated가 아니다. 청록 contour나 active surface가 세 tile까지 감싸면 authoritative state와 충돌한다.

## Judgment log

1. 다섯 tile field를 화면 중앙으로 옮기고 다른 결과 panel을 모두 제거했다. map이 배경 장식이 아니라 결과 자체가 되게 하기 위해서다.
2. initial과 frontier의 내부 EAST/WEST contour는 렌더하지 않고, 활성화 전 seam만 1초 동안 사라지게 했다. 최종 frame은 외곽 6 segment만 소유한다.
3. 두 owned tile 사이 14px 시각 공백은 같은 ground atlas 연결부로 메웠다. 연결부는 tile 뒤에 두어 지형 표면과 actor를 가리지 않는다.
4. 세 다음 좌표는 이름 목록 대신 frontier 중심에서 동·북·남으로 뻗는 link와 어두운 `?` tile로 보인다. 텍스트를 숨겨도 방향과 미확보 상태가 남는다.
5. 샘 보상은 별도 reward card 대신 새 tile 위 droplet `+1`과 상단 실제 resource 증가로 연결했다.
6. restart는 결과 의미와 무관한 시스템 행동이므로 작게 두되, 유일한 다음 입력이라는 규칙은 유지했다.

## Cognitive errors and misses

- 처음 계약에서 world revision을 1로 고정했다. 실제 revision은 정찰·경로 update도 세므로 activation 전 4에서 후 5가 됐다. 첫 P4 실행이 이를 잡았고 조건을 `직전 +1`로 수정했다. 변수 이름의 의미를 확인하지 않고 결과 횟수로 해석한 오류다.
- 첫 owned bridge는 positive z-index로 두 tile 위를 넓게 덮어 평평한 초록 직사각형처럼 보였다. 자동 bounds는 통과했지만 캡처 비교에서 즉시 탈락시켰다. bridge를 tile 뒤로 보내 실제 gap만 메우고 ground atlas·외곽 glow를 맞췄다.
- next link는 얇은 청록선이므로 text-off에서 세 방향은 읽히지만, 이것이 `다음에 갈 수 있는 곳`인지 단순 장식인지 사람 증거는 없다.
- 새 tile의 열린 anchor와 주인공이 겹쳐 actor가 떠 보일 위험이 있다. 현재 sprite 발과 node 중심, drop shadow를 맞췄지만 최종 grounding 평가는 human gate에 남는다.
- exact RC와 배포 health가 통과한 뒤 공개 브라우저의 최초 960×720 진입에서 동쪽 OUTSIDE tile이 오른쪽으로 약 30px 잘렸다. 동적 viewport 변경으로 만든 local 4:3 캡처가 실제 cold-load 4:3을 완전히 대변하지 못한 것이다.
- 첫 공개 실패를 reload 직후 animation 안정화 문제로 오진해 reload assertion 앞에 1.3초를 더 기다렸다. 그러나 실패 지점은 reload 전 최초 assertion이었다. 로그의 정확한 line과 첫 frame bounds를 다시 대조한 뒤, 검증을 느슨하게 하지 않고 4:3 spatial field를 왼쪽으로 4vw 옮겨 고쳤다. reload 대기는 전이 animation 뒤의 안정된 최종 frame을 검증한다는 의미가 있어 유지했다.

## User and delegation boundary

사용자가 정한 방향은 세계와 내 영역의 확장, 영구 좌표, 주인공만 가능한 최종 결계 연결, 회복한 땅의 효용이 다음 모험을 여는 구조, 텍스트를 모르는 사람도 거친 의미를 읽는 UI다. outer contour, owned bridge, anchor·spring·next link 배치는 그 방향 안에서 자율 결정했다. 편입 조건, 좌표, water 보상, 안정화와 reveal state는 변경하지 않았다.

## Process and efficiency

P19의 next rule대로 P15 link, 기존 tile/contour, P19 anchor primitive를 재사용했다. 신규 state나 asset은 만들지 않았고 기존 P4 lifecycle 뒤 assertion만 교체했다. retired panel markup과 CSS를 함께 삭제해 시각 단순화가 JS 감소로 이어졌다.

긴 RC 전에 state→DOM parity, text-off, 4:3, 캡처 순으로 닫았다. 두 번의 실패는 각각 잘못된 revision 가정과 bridge의 시각 품질이었고 둘 다 focused 1분 안에서 발견됐다. 다만 local에서 viewport를 바꾸는 검사만으로 cold-load responsive layout까지 닫았다고 판단한 것은 성급했다. 공개 smoke가 실제 화면 잘림을 잡았고, 첫 원인 진단도 한 번 틀렸다. 다음부터 최종 공간 장면은 exact RC 전에 fresh context의 목표 viewport로 직접 시작하는 저비용 검사를 추가해야 한다.

## Next rules

1. revision·attempt 같은 누적 값은 고정 숫자가 아니라 전이 전후 delta로 검증한다.
2. 영역 변화는 상태표보다 같은 좌표의 before/after 경계로 보여 준다.
3. 연결 지형은 actor와 tile 위를 덮지 않고 실제 gap만 메운다.
4. REVEALED/OUTSIDE는 link를 가지되 owned surface와 contour를 받지 않는다.
5. 자동 bounds가 통과한 합성 레이어도 캡처에서 재질·z-order를 별도 판정한다.
6. responsive 최종 장면은 resize 결과뿐 아니라 fresh page의 목표 viewport 최초 frame으로도 검증한다.
7. 공개 실패를 고칠 때는 assertion line이 전이 전인지 reload 후인지 먼저 확인하고, 기다림을 추가하기 전에 실제 element bounds를 대조한다.

## Next task

P20 뒤에는 제출 cycle의 새 기능 장면을 더 만들지 않는다. exact-SHA 누적 RC와 공개 save/reload에서 expansion state를 검증하고, 같은 build를 신규 사용자에게 무설명으로 맡겨 `영역 확장 원인`, `샘의 다음 원정 효용`, `다음에 갈 방향`을 자기 말로 설명하는지 확인한다. 실패하면 콘텐츠를 늘리지 않고 관찰된 첫 오해를 소유한 기존 장면만 보완한다.
