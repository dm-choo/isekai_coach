---
title: P9 First Experience Retrospective
status: technical-candidate
last_updated: 2026-08-19
related:
  - p9-first-experience-contract.md
  - acceptance-evidence-matrix.md
  - ../research/submission-retrospective-p8.md
---

# P9 첫 경험 회고

## Result

첫 화면을 영토 카드와 설명 headline에서 실제 world scene으로 교체했다. 플레이 순서는 `결계 안 단독 각성 → D로 바깥 접근 → 주인공만 존재하는 첫 전투 → 봉인된 궁수 발견 → Space로 해방 → 합류 뒤 HUD와 자동행동 공개`가 되었다. 기존 Slice bitmap은 제출 경로에서 제거하고, 이 인과를 위해 제작한 배경 3장·캐릭터 5종·지형 atlas만 사용한다.

자동 증거는 다음을 소유한다.

- controller unit: 시작 state, 100m 시간, solo unit 수, v2 save/load
- interaction browser: 설명 headline·동료·HUD 0개, D/pointer 즉시 이동, checkpoint 복구
- failure browser: solo 패배 비용, 안전 영역 복귀, 같은 고정 조우 재진입
- golden browser: solo 승리, sealed→joined, 첫 합동 전투의 ally prediction, 이후 EXPANDED까지 완주

사람이 첫 3초에 실제로 `내가 이 사람이고 오른쪽으로 나가야 한다`고 이해하는지와 동료 해방을 획득으로 느끼는지는 아직 사람 증거가 아니다.

## Initial model

- **사실**: 승인된 과거 문서에는 주인공 단독 첫 전투와 이후 동료 합류가 있었다.
- **drift**: 현재 구현과 일부 최신 문서는 처음부터 동료를 배치하고 각성·합류를 범위 밖으로 밀었다.
- **가설**: 큰 설명문을 고치는 것보다 실제 party state와 공개 순서를 복구하면 텍스트 의존과 주인공 불명이 함께 줄어든다.
- **제약**: 장기 경제나 새 콘텐츠를 추가하지 않고 첫 경험 한 결과만 소유한다.

## Judgment log

1. UI부터 고치지 않고 controller에 solo state를 먼저 만들었다. 브라우저에서 동료를 숨기는 방식은 authoritative state와 화면이 다시 어긋날 수 있기 때문이다.
2. 전체 에셋을 한 번에 만들기 전에 각성 배경 한 장을 먼저 생성·검사했다. 안전한 왼쪽, 위험한 오른쪽, 물리적 출구가 읽힌 뒤 같은 시각 문법으로 나머지를 파생했다.
3. 첫 전투 캡처에서 큰 조우 headline과 벽처럼 보이는 tilemap을 발견했다. 테스트 통과를 완료로 취급하지 않고 조우 gate를 비언어적 Space control로 축소하고 제출본 전용 grid projection을 만들었다.
4. 봉인 장면 첫 캡처에서는 사람이 수정 안에 보이지 않았다. 생성물 자체가 좋다는 이유로 통과시키지 않고 overlay의 world coordinate와 대비를 다시 맞췄다.

## Cognitive errors and misses

- 첫 grid 수정은 행 간격만 줄여 벽돌 띠를 더 얇게 만들었을 뿐, 지면으로 읽히는 문제를 완전히 풀지 못했다. 두 번째 캡처 뒤에 행 offset과 사다리꼴 contour를 추가했다. geometry mask도 시도했지만 Phaser 4 WebGL 경고가 셀마다 발생해 즉시 제거했다. 현재 투영은 이전보다 지면에 가깝지만 reference 수준의 원근은 다음 combat presentation Goal에서 다시 비교해야 한다.
- React prop을 추가할 때 임시로 `arguments[0]`를 사용한 패치를 두 번 만들었다가 즉시 typecheck 전에 고쳤다. 빠른 patch 작성이 명시적 데이터 흐름보다 앞선 실수였다.
- 크로마 처리에서 이 환경의 Python 실행 계약을 먼저 확인하지 않아 `python` 별칭 부재와 Pillow 부재로 두 번 실패했다. 이미지 skill의 처리 단계 전에 `python3`/`uv` 가용성을 확인했어야 했다.
- 브라우저 수동 one-liner는 빠른 시각 판정에는 유효했지만 같은 전투 자동 플레이 코드를 반복했다. 검증 script로 승격하기 전까지 중복이 생겼다.
- 누적 RC 통과 뒤 manifest를 다시 읽으며 Slice 테마도 제출 에셋을 preload하는 비용을 발견했다. 기능 gate가 통과했다는 이유로 네트워크 비용까지 안전하다고 추론하지 않고 theme별 loader로 분리했다.

## User boundary and delegated judgment

사용자가 결정한 것은 핵심 경험, 단독→동료 합류 순서, 텍스트 비의존, reference 우선, 기존 에셋 무비판 재사용 금지다. 구현자가 자율 결정한 것은 100m 첫 접근, 고블린 전사 HP 2, cyan/amber 장면 대비, `D`와 `SPACE`의 contextual mapping, 제출본 전용 투영 수치다. 새 경제·서사·정책 문법은 이번 Goal에서 만들지 않았다.

## Efficiency

효율적이었던 순서는 `문서 drift 증거 → state contract/unit → 배경 한 장 visual spike → 전용 asset set → browser capture → 낮은 gate → 전체 golden 1회`였다. 이 덕분에 전체 golden을 매 시각 수정마다 돌리지 않고 3~6초짜리 focused browser로 결함을 닫았다.

낭비는 이미지 처리 환경 확인 누락, 임시 prop 표현, 반복 one-liner와 grid의 한 차례 불충분한 수정에서 발생했다. 다음 Goal에서는 기존 helper를 먼저 검증 script로 만들고 시각 iteration은 그 script의 state checkpoint를 재사용한다.

## Next rule

다음 Goal은 아래 순서를 그대로 시작 조건으로 사용한다.

1. 첫 캡처 전에 `플레이어가 글 없이 무엇을 추론해야 하는가`를 한 문장으로 고정한다.
2. 화면에 보일 관계를 authoritative state assertion으로 먼저 만든다.
3. reference와 첫 visual spike 한 장을 비교한 뒤에만 asset·screen set을 확장한다.
4. focused browser에서 state와 screenshot을 함께 판정하고, 낮은 gate가 통과한 뒤 전체 golden을 한 번만 실행한다.
5. 완료 회고는 첫 시도에서 틀린 판단과 재작업 비용을 반드시 기록한다.

## Next task

P9 다음 보완 Task는 첫 단독 전투의 조작 언어다. 현재 공간·적 Intent·입력은 기능하지만 첫 턴 화면의 도움 문장, intent card, plan strip과 하단 기술판이 동시에 경쟁한다. 다음 Goal은 새 콘텐츠가 아니라 `적 위협 확인 → 내 이동/기술 선택 → 예정 결과 확인 → 실행` 네 순간의 정보 우선순위를 한 번에 하나씩 보이게 해, 첫 전투에서의 신경 소모값을 낮추는 것을 소유한다.
