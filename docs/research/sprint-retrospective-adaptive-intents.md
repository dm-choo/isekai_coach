# Slice 2 적응형 Intent와 탐색 연속성 KPT

**작성:** 2026-08-19

**상태:** implementation evidence, playtest pending

**이번 질문:** 플레이어가 버그·마찰 목록을 따로 작성하지 않아도 될 만큼, 방향·행동 순서·표적·Intent 소유권과 탐색 흐름이 화면에서 자명한가?

외부 비교는 Pokémon Legends: Z-A의 공식 소개가 강조하는 `필드 안에서의 조우·전투`, 전투 중 위치·기술 범위·발동 시점의 중요성을 사용했다. [공식 게임 소개](https://www.pokemon.com/uk/pokemon-video-games/pokemon-legends-z-a), [공식 Adventure 소개](https://legends.pokemon.com/en-us/news/adventure), [공식 Battle Club 소개](https://legends.pokemon.com/en-us/news/z-a-battle-club)를 보았다. 실시간 전투나 카메라 연출을 그대로 복제하는 것이 아니라, 탐색 공간과 전투 공간 사이의 연속성 및 공격 주체–범위의 시각적 인과만 비교한다.

## 이번 스프린트에서 실제로 고친 인과

| 관찰된 실패 | 원인 | 변경한 계약 | 자동 검증 |
|---|---|---|---|
| 적이 파티 왼쪽을 지나면 계속 왼쪽만 공격 | 전사 방향이 authored 상수였고 sprite facing도 event와 분리 | 네 방향의 실제 이동·명중·잔여 거리를 매 턴 평가하고 이동/공격 event 직전에 facing 반영 | 왼쪽에서 오른쪽으로 되돌아 공격하는 domain test |
| 궁수는 `이동 → 공격`을 예고하지만 공격이 먼저 보임 | `ABILITY_USED` event를 source movement보다 먼저 emit | authored movement의 `UNIT_MOVED`를 먼저 emit한 뒤 `ABILITY_USED` | event 순서 assertion |
| 투척병이 같은 곳만 반복 | 첫 target을 영구 선택 | turn과 spawn order로 살아 있는 파티원을 결정론적으로 순환 | 연속 두 턴 ground origin 차이 assertion |
| 같은 종류의 적이 여럿이면 그림자 주인을 모름 | 모든 적이 같은 빨강과 같은 문구를 공유 | 카드–sprite–경로–effect–shadow에 A/B/C와 source color를 공유 | DOM marker 수·순서와 screenshot |
| 첫 A/B 캡처에서 warning glyph가 `A`처럼 보이고 폭탄 설명이 캐릭터를 가림 | 전투판에 ownership과 상세 설명을 함께 반복 | effect cell 모서리에는 source-color A/B/C badge만 남기고, 상세는 카드·tooltip으로 이동 | multi-enemy·bomber screenshot 재촬영 |
| 공격 불가능한 적도 대상 버튼에 남음 | living enemy와 actionable target을 동일시 | 현재 preview에서 실제 근접 적중 가능한 적만 picker에 노출 | targetable ID와 DOM button 수 비교 |
| 중간 정책 검토 화면이 탐색을 끊음 | policy 변경 시점을 progression gate로 고정 | 모든 비전투 장면의 캐릭터 정보에서 순서를 변경 | intro/explore controller test와 browser interaction |
| 통로에서 캐릭터가 화면을 미끄러짐 | progress를 party translate로 표현 | party는 고정하고 depth/ground가 반대 방향으로 흐름 | party X 고정과 background-position 변화 비교 |
| HP 1에서 필수 통로 덫으로 즉사 | 선형 경로의 비선택 사건도 일반 피해와 같은 하한을 사용 | 뿌리 덫은 HP 1을 보존하고 치명상을 피했다는 feedback 제공 | pure HP boundary test와 full-run smoke |

## KPT

### Keep

- Intent는 선언 뒤 같은 턴에 재조준하지 않는다. 적 policy는 다음 턴의 선택을 개선하되, 플레이어가 읽은 예고를 배신하지 않는다.
- engine event 순서를 presentation의 단일 시간축으로 사용한다. 화면만 순서를 바꾸거나 state를 추측하지 않는다.
- 색에는 항상 문자 표식과 공간 연결을 함께 둔다. A/B/C는 미술이 바뀌어도 유지할 수 있는 저비용 ownership channel이다.
- 상세 동료 정책은 기본 접힘을 유지한다. 전술을 확인하고 싶은 사용자만 펼치며 전투판을 기본적으로 가리지 않는다.
- full-run smoke가 실제 정책 편집을 사용하게 한다. 존재만 확인하는 UI 테스트보다 다음 전투까지 상태가 이어지는지를 검증한다.

### Problem

- 초기 구현은 `behavior`마다 한 함수를 연결했지만, 아직 아군처럼 여러 policy slot의 실패 이유를 기록하는 범용 evaluator는 아니다. 이번 slice에 필요한 직관성과 결정론은 얻었지만 이를 완성 enemy AI라고 부르면 안 된다.
- 현재 A/B/C 표식은 동일 적 다수의 원인을 잇지만, 색과 알파벳을 처음 보는 사용자가 sprite 위 badge까지 즉시 찾는지는 실제 5초 판독 테스트가 필요하다.
- 배경 scroll과 0.42초 combat transition은 공간 단절을 줄이는 최소 구현이다. 파티 보행 cycle, 카메라 easing, 적이 환경에서 드러나는 encounter staging은 production art/animation 단계가 남아 있다.
- local mini-map의 동쪽 화살표는 다음 월드 타일 방향을 보강했지만, 네 갈래 방 구조와 선형 월드 route가 동시에 보이므로 시각 정보가 여전히 많다. 현재 타일 구조와 세계 경로의 크기·위치 대비를 사용자에게 확인해야 한다.
- resource 표시는 프로젝트 소유 물방울·빵·횃불 SVG로 통일했지만, 11~16px 크기에서도 셋이 구별되는지는 실제 화면 거리에서 확인해야 한다.

### Try

1. 다음 enemy-AI 스프린트에서는 `조건 → 후보 action → cost → score → 실패 이유`를 data로 남기고, 개발자 overlay에서만 trace를 본다. 플레이어에게 policy dashboard를 노출하지 않는다.
2. 5초 Intent 판독 테스트에서 `A는 어디를 언제 공격하는가`, `B의 폭탄은 누구를 겨냥했는가`를 묻는다. 둘 중 하나라도 틀리면 선, pulse timing 또는 source badge 크기를 먼저 고친다.
3. 통로 조우 연출은 적 실루엣 출현 → 이동 감속 → battle grid reveal의 세 beat로 실험한다. 총 전환 시간은 1초 안을 우선 가설로 둔다.
4. local mini-map은 현재 방을 가장 밝고 크게, 연결 방은 낮은 alpha, 다음 월드 출구는 하나의 굵은 외향 arrow로 유지한다. 별도 world map은 월드 타일 사이에서만 조작 가능해야 한다.
5. 물·식량·조명 SVG는 색을 제거한 16px silhouette test도 통과해야 한다. 실패하면 내부 선을 줄이고 외곽 형태부터 다르게 만든다.

## 경량 검증 루프 결과

### Loop A — 텍스트를 읽지 않고 행동 순서 찾기

- 확인 대상: 궁수의 발밑 이동 destination, 이동 화살표, 사격 effect, animation event 순서.
- 통과 조건: `이동 위치 → 새 원점 → 공격 방향`을 왼쪽에서 오른쪽 시간축으로 설명할 수 있고 event history도 같은 순서다.

### Loop B — 같은 적 세 명의 소유권 찾기

- 확인 대상: 우측 Intent 카드의 A/B/C, sprite 위 badge, tile overlay label과 색.
- 통과 조건: 카드 하나를 고르면 대응하는 적과 최종 effect cell을 다른 카드와 혼동하지 않는다.

### Loop C — 탐색에서 전투로 넘어가기

- 확인 대상: 고정된 파티 screen position, 흐르는 배경·지면, 같은 stage의 combat reveal.
- 통과 조건: 통로 진행 중 map UI를 다시 조작하지 않고 encounter가 자동 개입하며, 해결 뒤 같은 거리에서 이동을 재개한다.

### 현재 판정

- 자동화가 증명하는 것은 state/event/DOM 연결과 한 deterministic 완주 경로다.
- 현재 screenshot 기준으로 상시 정책 설명과 전투명 잔존은 제거됐고, 다음 월드 방향·자원 종류·Intent ownership은 별도 텍스트 문단 없이도 1차 신호가 있다.
- 최종 자동 경로는 4타일·6전투를 재시도 0으로 완주했다. target picker의 숨김/노출 양쪽 상태, A/B/C marker, 투척병 GROUND ownership, 고정 party와 scrolling world, 야간 은폐/조명 공개 및 960×720 overflow 0을 각각 확인했다.
- 아직 증명하지 못한 것은 처음 보는 사람이 A/B/C 연결, mini-map의 두 scale, background scroll을 같은 의미로 읽는지다. 따라서 기능 회귀 기준에서는 통과 가능하지만 UX 가설은 외부 플레이테스트 전까지 `under-validation`이다.

## 다음 스프린트 참고사항

- AI가 영리해질수록 예고가 더 정직해야 한다. adaptive planning은 turn 경계에서만 허용하고 locked Intent는 보존한다.
- UI를 추가하기 전에 이미 존재하는 정보를 숨기거나 계층화할 방법을 먼저 본다.
- reference의 이름보다 이 프로젝트에 옮길 측정 가능한 문장을 기록한다. 이번 문장은 `탐색 공간과 전투 공간 사이에 별도 조작 화면을 끼우지 않는다`이다.
- 자동 플레이가 실패하면 AI 강화, 전투 난도, heuristic 한계를 분리한다. retry를 늘려 녹색으로 만들지 않는다.
- 완료 보고에는 domain test, production build, browser full-run, 4:3 overflow와 screenshot 판독을 각각 분리한다.
