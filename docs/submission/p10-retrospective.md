---
title: P10 Solo Combat Interaction Retrospective
status: technical-candidate
last_updated: 2026-08-19
related:
  - p10-solo-combat-interaction-contract.md
  - acceptance-evidence-matrix.md
  - p9-retrospective.md
---

# P10 첫 단독 전투 조작 회고

## Result

첫 단독 전투의 첫 턴을 `위협 → 이동 → 예정 결과 → 실행` 네 순간으로 나눴다. 시작 시에는 적 A의 이동·공격 관계와 WASD만 보이고, 이동을 계획한 뒤에만 결과 실루엣과 다음 입력을 공개한다. 예정 위치가 여전히 공격 범위라면 `! → Z`만 남고 실행은 잠긴다. 안전한 결과에서만 `◇ → SPACE`를 보여 준다. 첫 실행과 적 턴이 끝난 뒤 정상 기술·AP·계획 UI가 열린다.

함께 닫은 표현 결함은 다음과 같다.

- 적 Intent의 이동 수를 작성 당시 경로가 아니라 현재 재계산된 경로로 표시한다.
- 새 버튼이 정지한 포인터 아래 나타났다는 이유만으로 tooltip이 자동 노출되지 않는다.
- 공격 카메라 이동 중 고정 배경 밖의 검은 공간이 보이지 않는다.
- 제출 전투의 캐릭터 크기와 발 anchor를 줄이고, 12×3 논리 cell을 같은 마름모 투영을 쓰는 불투명 흙 지형으로 렌더링한다.
- 적 경로·공격 cell과 플레이어 예정 위치도 지형과 같은 cell polygon을 공유한다.

자동 검증은 첫 상태, 위험한 이동, 되돌리기, 안전한 이동, 실행 후 둘째 턴을 authoritative state와 DOM으로 함께 확인한다. 16:9와 4:3 캡처, overflow 0과 browser error 0도 같은 focused gate가 소유한다. 처음 보는 사람이 이것을 실제로 도움 없이 이해하고 조작의 쾌감을 느끼는지는 여전히 사람 gate다.

### Verification evidence

- `npm run typecheck`: pass
- `npm test`: 13 files, 93 tests pass
- `npm run build:submission`: production build pass
- `npm run verify:submission:solo-combat`: `SOLO_COMBAT_INTERACTION_PASS`, 위험 이동의 `SPACE` 잠금, 안전 이동의 `SPACE`, turn 2 full controls, 4:3 overflow 0, browser error 0
- `npm run verify:submission:golden`: `EXPANDED`, 첫 입력 `W → SPACE`, 4:3 overflow 0, browser error 0

이 증거는 현재 working tree의 focused/product 검증이다. exact-SHA 누적 RC와 공개 배포 증거는 커밋 뒤 별도 release gate에서만 판정한다.

## Initial model

- **사실:** P9는 단독 각성→첫 전투→동료 해방의 순서를 복구했지만 첫 전투에 Intent, 도움 문장, 기술, AP와 plan strip이 동시에 나타났다.
- **가설:** 설명을 추가하는 대신 실제 입력 가능성과 화면 전경을 함께 제한하면 플레이어가 매 순간 하나의 관계만 추론할 수 있다.
- **reference:** Darkest Dungeon의 scene-first 비율과 하단 contextual action, One Step From Eden의 순간적인 고대비 cell signal을 초기 문법으로 삼는다.
- **제약:** 새 적·기술·경제·정책 규칙을 만들지 않고 첫 턴의 정보 순서와 그 과정에서 발견된 P0 표현 결함만 소유한다.

## Judgment log

1. CSS로 요소만 감추지 않고 controller에서도 첫 턴의 기술, 두 번째 이동과 유효하지 않은 확정을 거부했다. 화면과 authoritative 입력 계약이 다르면 숨은 단축키가 튜토리얼 순서를 깨기 때문이다.
2. focused browser driver가 처음 선택한 왼쪽 이동이 갱신된 적 공격 범위 안임을 드러냈다. 테스트를 안전한 입력으로 바꿔 숨기지 않고, 위험한 preview에는 `Z`만 허용하는 상태를 별도로 만들었다.
3. 세계의 actor·Intent·destination을 같은 캡처에서 판정하도록 했다. DOM assertion만 통과했을 때 발견하지 못하는 카메라 검은 공간, 캐릭터 겹침과 떠 있는 지형을 함께 잡기 위해서다.
4. 3~13초 focused gate에서 전이와 캡처를 반복하고, 전체 제품 golden과 긴 누적 RC는 시각 반복이 끝난 뒤에만 실행하도록 분리했다.

## Cognitive errors and misses

- 첫 하단 제어안은 world guide와 control panel 양쪽에 `◇ → SPACE`를 중복 표시했다. 점진 공개를 구현하면서도 같은 정보를 두 번 강조하면 경쟁이 줄었다고 착각했다. world guide를 제거하고 실제 입력 지점 한 곳만 남겼다.
- 위험한 destination도 `SPACE`로 실행할 수 있다는 사실을 처음에는 고려하지 않았다. ‘예정 결과를 보여 준다’와 ‘그 결과를 이해하고 수정하게 한다’는 다른 계약이었다. preview effect cell을 controller gate와 연결해 수정했다.
- 공격 연출이 카메라를 흔들 때 background가 world보다 작아 검은 여백이 보였다. 정적 전투 캡처만 생각한 탓이다. 카메라 bounds와 고정 레이어 scroll factor를 명시했다.
- 새로 공개된 기술 버튼이 기존 포인터 아래 생성되면서 tooltip이 즉시 열렸다. hover를 CSS 상태로만 취급한 것이 원인이다. 실제 pointer movement 또는 keyboard focus가 있을 때만 세부 정보를 공개하도록 바꿨다.
- 지형은 세 번 잘못 설계했다. 큰 직사각형 행은 벽처럼 보였고, 간격 있는 사다리꼴은 유리다리처럼 떠 보였으며, cell 높이만큼 행을 띄운 마름모는 틈이 생겼다. 최종안은 `rowStep × 2 = cellHeight`라는 tessellation 조건을 먼저 고정하고 지형 atlas를 동일한 마름모로 잘라 연속된 흙 plane을 만들었다.
- 첫 clean-SHA RC에서 패배 fixture가 첫 턴의 빈 `SPACE`로 적 턴을 넘긴다는 오래된 가정 때문에 멈췄다. 제품의 패배 전이가 실패한 것이 아니라 검증 도구가 새 학습 gate를 통과하지 못한 것이었다. fixture도 고정 안전 이동 `W → SPACE`를 수행한 뒤에만 저체력 패배를 유도하도록 고쳤다.

가장 큰 과정 낭비는 투영의 불변식을 먼저 적지 않고 그림을 보며 수치를 반복한 것이다. 다음 지형 변경은 코드 전에 `cell polygon`, `인접 조건`, `actor foot anchor`, `effect overlay 일치`를 testable contract로 고정해야 한다.

## User boundary and delegated judgment

사용자가 고정한 것은 텍스트를 모르는 사람도 읽는 UI, 레퍼런스 충실도, 불투명 지형 tilemap, 캐릭터의 명확한 cell 점유, 신경 소모값 감소와 구현 과정 회고다. 구현자가 자율 결정한 것은 첫 턴의 단계 수, 위험 이동의 `Z` 전용 상태, sprite scale, 제출 전용 투영 수치와 focused verifier 구성이다. 전투 밸런스·새 콘텐츠·장기 UI 문법은 바꾸지 않았다.

## Efficiency

효율적이었던 흐름은 `상호작용 계약 → controller unit → focused browser state/capture → 4:3 → product golden → exact-SHA RC`였다. 위험한 이동과 카메라 결함을 긴 검증 전에 발견했고, 첫 턴만 재생하는 verifier를 누적 RC에 편입해 이후 회귀 비용도 제한했다.

낭비는 네 차례의 지형 시각 반복과 중복 guide에서 발생했다. 이는 레퍼런스를 보지 않아서라기보다, 레퍼런스에서 추출한 원리를 렌더링 불변식으로 번역하지 않은 문제였다. 다음 작업은 시각 목표뿐 아니라 인접·겹침·공개 조건을 먼저 실행 가능한 assertion으로 만든다.

## Next rule

1. 화면 작업 전에 `지금 플레이어가 알아야 할 관계 하나`와 `아직 보이면 안 되는 어휘`를 함께 쓴다.
2. UI 제한은 authoritative 입력 제한과 같은 test에서 검증한다.
3. preview가 위험·불가를 나타내면 실행 가능 상태도 반드시 함께 바뀐다.
4. world projection 변경은 tessellation과 actor/effect 공통 polygon test를 먼저 통과시킨다.
5. phase 전환마다 screenshot을 남기고 정지 pointer, camera motion과 4:3을 포함한다.
6. focused gate가 통과한 뒤에만 product golden과 exact-SHA 누적 RC를 한 번씩 실행한다.
7. 공통 입력 계약을 바꾸면 성공 경로뿐 아니라 failure/retry fixture의 선행 행동도 함께 검색한다.

## Next task

P11은 둘째 턴 이후 정상 전투의 정보 위계를 소유한다. 현재 첫 턴은 한 질문씩 공개되지만 정상 턴은 큰 turn banner, Intent, AP, 세 기술과 plan strip이 한꺼번에 돌아온다. 새 콘텐츠를 추가하기 전에 `현재 위협 → 가능한 응답 → 선택 결과 → 실행`의 문법을 정상 턴에도 유지하면서 숙련자에게 필요한 선택 폭은 감추지 않는 action panel을 검증한다.
