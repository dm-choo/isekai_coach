---
title: Operation Channel Gameplay
status: accepted
last_updated: 2026-08-17
related:
  - parties.md
  - world-time.md
  - ../../ux/flows/replay-and-analysis.md
  - ../../ux/views/operation-channel.md
  - ../../adr/0004-operation-channel-replay.md
---

# Operation channel gameplay

각 부대는 이동, 작업과 전투 사실을 시간순으로 보존하는 하나의 작전 채널을 가진다.

## Event grades

- **Routine**: 이동, 채굴, 적재, 하역. 자동 진행하고 요약한다.
- **Notable**: 경미한 피해, 알려진 적 승리. 진행하면서 기록·알림한다.
- **Decision**: 미확인 적, 특수 시설, 빈사, 경로 단절, 광맥 고갈. 해당 별동대만 대기한다.

다시보기와 분석의 상호작용은 [Replay and analysis UX](../../ux/flows/replay-and-analysis.md)가 소유한다. 작전 채널은 과거 사실을 변경하지 않는다.
