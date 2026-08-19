---
title: Slice 1 Deployment Contract
status: accepted
last_updated: 2026-08-17
implementation:
  - ../../../vite.config.ts
  - ../../../deploy/openai-8010.caddy
  - ../../../deploy/install-slice1.sh
  - ../../../deploy/verify-slice1.sh
related:
  - index.md
  - ../../submission/vertical-slice.md
  - ../architecture/existing-scaffold-contract.md
---

# Slice 1 — Amazon Barrier Guardian deployment contract

## Public endpoint

- URL: [https://openai.ktwome.cc/slice1/](https://openai.ktwome.cc/slice1/)
- Vite base: `/slice1/`
- release root: `/srv/ooh/current/slice1`
- loopback origin: `http://127.0.0.1:8010`

`openai.ktwome.cc`의 `/`는 기존 OOH application이 소유한다. Isekai Coach는 `/slice1/*`만 소유하며 root fallback, Cloudflare ingress 또는 다른 공개 서비스 설정을 임의로 바꾸지 않는다.

## Build and release

Node.js 20.19 이상에서 다음 순서로 실행한다.

최초 한 번 `npm run deploy:setup`으로 제한된 root 배포기를 설치한 뒤에는 다음 명령이 build와 검증을 포함한다.

```bash
npm run deploy:slice1
```

수동 복구 절차는 다음과 같다.

```bash
npm test
npm run typecheck
npm run build:slice
sudo ./deploy/install-slice1.sh
./deploy/verify-slice1.sh
```

`install-slice1.sh`는 다음을 수행한다.

1. 현재 shared release가 `/srv/ooh/releases/` 아래인지 검증한다.
2. 현재 OOH root를 새 release에 복사하고 `slice1/`만 검증 build로 교체한다.
3. 기존 Caddy fragment를 날짜가 붙은 파일로 백업한다.
4. `/slice1/*` 전용 `handle_path`와 root OOH fallback을 포함한 Caddy fragment를 검증한다.
5. 새 release symlink를 원자적으로 전환하고 Caddy를 재시작한다.
6. local OOH title과 Isekai Coach title을 확인한다.
7. 실패하면 이전 release link와 Caddy fragment를 복구한다.

`dist/`는 반드시 같은 source에서 test, typecheck와 build를 통과한 결과여야 한다.

## Verification boundary

`verify-slice1.sh`는 local/public 양쪽에서 다음을 확인한다.

- 기존 public root가 OOH application을 계속 제공한다.
- `/slice1/`이 Amazon Barrier Guardian boss-room build의 HTML을 제공한다.
- HTML이 참조한 JS/CSS bundle이 모두 2xx다.
- HTML response에 `Cache-Control: no-cache, no-transform`이 있어 배포 후 브라우저가 문서를 재검증한다.
- Phaser가 runtime SVG를 rasterize할 수 있도록 CSP `img-src`가 self/data/blob만 허용한다.
- same-origin Pretendard font SHA-256이 pinned value와 같다.

공개 브라우저 smoke는 별도로 다음 production-intent 흐름을 확인한다.

```text
intro reveal
→ <내 턴>에서 WASD로 제압 범위를 벗어나 plan 확정
→ <아군 턴>에서 궁수가 포지셔닝 후 투사체 발사
→ <적 턴>에서 수호자가 2칸 이동 후 제압 해결
→ 다음 <내 턴>에서 WASD 접근 후 내려찍기로 외침 interrupt
→ 세 번째 턴에 수호자가 하수인을 소환
→ 다음 턴에 하수인이 원거리 동료를 향해 돌진
```

이때 확인할 것:

- 이동(WASD)과 공격 action bar가 서로 다른 입력으로 보이는가
- `<내 턴>`, `<아군 턴>`, `<적 턴>` 배너와 실제 actor animation이 일치하는가
- `제압`의 이동 경로와 1×1 공격 범위, 궁수의 앞선 적 투사체, `외침`의 stun interrupt가 화면에서 이해되는가
- 소환된 하수인의 overhead Intent와 원거리 동료를 향한 `돌진` 인과가 읽히는가
- console/page/request error가 0건인가

정책 편집·reorder와 동일 상태 분석은 이 slice smoke 범위가 아니다. 현재 자동 smoke는 소환과 하수인 등장까지를 검증하며, 수호자 처치와 봉인 해제는 별도의 완주 검증 전까지 완료를 주장하지 않는다. HTTP readiness나 service active만으로 플레이 흐름 완료를 주장하지 않는다.

## Current release evidence

현재 release path와 public SHA는 고정 문서에 임의로 적지 않는다. 배포 직후 `readlink -f /srv/ooh/current`, `verify-slice1.sh`, public browser smoke의 timestamp·build SHA를 실행 결과와 함께 기록한다.

직전 Caddy fragment backup은 배포 script 출력에서 확인한다. credential, tunnel token, Cloudflare config 내용은 문서나 로그에 복사하지 않는다.
