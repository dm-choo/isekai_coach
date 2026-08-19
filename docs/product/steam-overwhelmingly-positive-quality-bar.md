---
title: Steam Overwhelmingly Positive Quality Bar
status: under-validation
last_updated: 2026-08-20
related:
  - ../research/current-game-assessment.md
  - ../submission/acceptance-criteria.md
  - ../submission/acceptance-evidence-matrix.md
  - p21-first-contact-readiness-contract.md
---

# Steam 압도적 긍정 품질 기준

## Verdict

현재 공개본을 유료 정식판으로 그대로 출시하면 `압도적으로 긍정적`을 받을 후보가 아니다. P21이 첫 전투의 검은 공백과 준비 전 입력을 제거했지만 종합 상용 출시 준비도는 약 **26/100**이다. 정확한 리뷰 비율은 가격·상점 기대·대상 사용자와 실제 플레이 없이는 예측할 수 없으며, 현재 통과를 주장할 증거는 없다.

현재 제품은 `직접 학습한 공간 규칙을 정책으로 위임하고 그 결과로 결계를 넓힌다`는 독창적인 15분 proof다. 하지만 확장 뒤 유일한 입력이 restart이고, 오디오·설정·게임패드·강건한 저장·캠페인 반복성이 없으며, 직관성·재미 사람 증거도 없다. 확장은 아직 반복 동사가 아니라 엔딩 연출이다.

Steam의 User Reviews는 구매자의 제품 경험과 기대 충족에 대한 피드백이다. 자동 검증은 크래시와 상태 불일치를 줄일 수 있지만 긍정 리뷰를 대신하지 않는다. 비교 대상인 Darkest Dungeon과 Northgard도 현재 전체 평가는 Very Positive이며, 유명 reference를 조합했다는 사실 자체가 더 높은 평가를 보장하지 않는다.

## Evidence-separated score

| 영역 | 현재 | 가장 큰 증거 부족 |
|---|---:|---|
| 핵심 Aesthetic 잠재력 | 65 | 독특한 직접 학습→정책→영토 인과가 있음 |
| 현재 핵심 경험 전달 | 42 | 확장이 다음 선택을 바꾸지 않음 |
| 조작감·타격감 | 36 | 첫 입력 신뢰는 회복, 무음·정지 PNG tween·키 재지정 부재 |
| UX·온보딩 | 44 | 전장 readiness는 닫힘, 신규 사용자 의미 이해 증거 없음 |
| 전투 인과 가독성 | 52 | 인과 문법은 있으나 바닥·정보 크기·장면 품질 불균일 |
| 선택 충돌·다이내믹 | 25 | 두 정책 중 진행 정답 하나인 고정 학습 퍼즐 |
| 콘텐츠·반복성 | 12 | 한 frontier 편입 뒤 restart |
| 아트·오디오 응집도 | 22 | 강한 배경과 prototype 전투·dashboard 화면이 충돌, 오디오 0 |
| 슬라이스 기술 안정성 | 76 | 94 tests·지연망 readiness·누적 RC·공개 save/reload는 강점 |
| 저장·옵션·접근성 | 14 | localStorage 한 슬롯, 설정·재지정·reduced motion 없음 |
| Steam 출시 준비 | 0 | 패키징·Steam Input/Deck·Cloud·crash recovery 증거 없음 |

이 숫자는 리뷰 예측 모델이 아니라 가장 큰 품질 손실을 먼저 고르기 위한 내부 계기판이다.

## Release-quality definition

아래 여섯 축 중 하나라도 `REQUIRED`면 압도적 긍정 후보라고 부르지 않는다.

1. **즉시성과 신뢰** — 화면에 보이는 입력만 작동하고 100ms 안에 수락 신호가 시작되며, 로딩·저장·복구가 진행을 속이지 않는다.
2. **인지 경제성** — 기본 플레이는 장면·실루엣·위치·형태·motion으로 읽히고 상세 설명은 요구할 때만 열린다.
3. **반복되는 핵심 Aesthetic** — 첫 확장의 효용이 다음 방향·정책·준비를 바꾸고 두 번째 영구 확장까지 이어진다.
4. **비지배 선택** — 시간·HP·보급·경로·미래 효용이 충돌하고 하나의 정책이나 경로가 모든 상황에서 우월하지 않다.
5. **감각적 완성도** — 전투와 세계의 인물 scale·grounding·animation·sound·UI motif가 같은 제품으로 느껴진다.
6. **상용 제품 표면** — 60~90분 이상 반복 가능한 campaign proof, pause/options/remap/controller, 강건한 save, 대표 해상도와 오류 복구가 있다.

## Highest-loss order

```text
P21 첫 전투 readiness와 입력 신뢰 — TECHNICAL PASS / HUMAN REQUIRED
→ P22 첫 확장이 여는 두 번째 비지배 영토 선택 — CURRENT
→ P23 전투의 연속 지면·큰 실루엣·타격 feedback
→ P24 입력·정보 크기·설정·접근성
→ P25 60~90분 campaign proof와 지역 변주
→ P26 실제 animation·audio·장면 전환 응집
→ P27 save recovery·Steam Input/Deck·패키징
→ P28 목표 사용자 closed test와 출시 후보 판정
```

P21은 공개 환경에서 `화면이 준비되기 전 조작 가능`이라는 신뢰 결함을 닫았다. 하지만 확장 뒤 유일한 행동이 restart인 상태는 그대로다. 따라서 다음 최대 손실은 P22이며, P21 통과를 콘텐츠 완성이나 조작감 전체 통과로 확대 해석하지 않는다.

새 기능 수가 아니라 현재 플레이어 손실이 가장 큰 순서다. 각 단계 뒤 다시 점수를 매기며 새 증거가 우선순위를 뒤집으면 순서를 바꾼다.

## Economical feedback loop

각 Goal은 하나의 관찰 가능한 실패만 소유한다.

```text
실패 증거 1개 고정
→ preserved contract와 부정 조건 작성
→ focused state/browser 검증
→ 직접 screenshot·입력 latency 판정
→ 누적 RC는 feature candidate 뒤 한 번
→ 배포·공개 smoke
→ 산출물과 판단 과정 회고
→ 다음 최대 손실 재평가
```

사람은 매 변경마다 부르지 않는다. 자동화로 판정 가능한 readiness·state parity·bounds·latency를 먼저 닫고, 서로 연결된 player-facing Goal 2~3개가 쌓였을 때 같은 build를 신규 사용자 2~3명에게 맡긴다. 사람만 판정할 수 있는 의미 이해·선호 역전·재미를 자동 PASS로 올리지 않는다.

## Stop condition

내부 technical·visual gate를 모두 통과한 뒤 실제 목표 사용자에게 다음을 확인할 build가 만들어졌을 때 사용자에게 호출한다.

- 도움 없이 첫 행동과 첫 plan을 발견한다.
- Intent·내 preview·동료 정책의 원인을 구분한다.
- 두 frontier의 손익을 설명하고 자신의 현재 상태에 맞는 하나를 고른다.
- 첫 샘과 결계 확장이 다음 선택을 바꿨다고 설명한다.
- 세션 뒤 자발적으로 `한 번 더` 또는 다음 확장 방향을 말한다.

이전에는 구현량이나 자동 test 수를 이유로 목표 달성을 선언하지 않는다.
