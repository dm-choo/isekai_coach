#!/usr/bin/env bash
set -euo pipefail

readonly local_base='http://127.0.0.1:8010'
readonly public_base='https://openai.ktwome.cc'
readonly slice_path='/slice2/'
readonly expected_font_sha='9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4'

verify_endpoint() {
  local label="$1" base="$2" html headers font_sha asset_path
  html="$(curl --fail --silent --show-error --max-time 20 "${base}${slice_path}")"
  [[ "${html}" == *'<title>Slice2</title>'* ]] || { echo "${label}: slice title mismatch" >&2; return 1; }
  headers="$(curl --fail --silent --show-error --max-time 20 --head "${base}${slice_path}")"
  grep --ignore-case --quiet '^cache-control:.*no-transform' <<<"${headers}" || { echo "${label}: Cache-Control no-transform is missing" >&2; return 1; }
  grep --ignore-case --quiet '^content-security-policy:.*img-src[^;]*blob:' <<<"${headers}" || { echo "${label}: CSP img-src does not allow Phaser blob images" >&2; return 1; }
  for asset_path in $(grep -oE '/slice2/assets/[^" ]+\.(css|js)' <<<"${html}"); do curl --fail --silent --show-error --max-time 30 "${base}${asset_path}" >/dev/null; done
  font_sha="$(curl --fail --silent --show-error --max-time 30 "${base}/slice2/fonts/PretendardVariable-v1.3.9.woff2" | sha256sum | awk '{print $1}')"
  [[ "${font_sha}" == "${expected_font_sha}" ]] || { echo "${label}: Pretendard SHA-256 mismatch" >&2; return 1; }
  for image in goblin-archer-v1.png goblin-warrior-v1.png goblin-bomber-v1.png; do curl --fail --silent --show-error --max-time 30 "${base}/slice2/assets/slice2/${image}" >/dev/null; done
}

root_html="$(curl --fail --silent --show-error --max-time 20 "${public_base}/")"
slice1_html="$(curl --fail --silent --show-error --max-time 20 "${public_base}/slice1/")"
[[ "${root_html}" == *'<title>OOH 기록전술 아카데미</title>'* ]] || { echo 'Public root OOH application regressed' >&2; exit 1; }
[[ "${slice1_html}" == *'<title>Slice1</title>'* ]] || { echo 'Public Slice 1 regressed' >&2; exit 1; }
verify_endpoint 'local' "${local_base}"
verify_endpoint 'public' "${public_base}"
echo 'OOH root, Slice 1 and Isekai Coach /slice2/ are healthy.'
