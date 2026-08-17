#!/usr/bin/env bash
set -euo pipefail

readonly local_base='http://127.0.0.1:8010'
readonly public_base='https://openai.ktwome.cc'
readonly slice_path='/slice1/'
readonly expected_font_sha='9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4'

verify_endpoint() {
  local label="$1"
  local base="$2"
  local html headers font_sha asset_path

  html="$(curl --fail --silent --show-error --max-time 20 "${base}${slice_path}")"
  [[ "${html}" == *'<title>Isekai Coach — 아마존 결계문</title>'* ]] || {
    echo "${label}: slice title mismatch" >&2
    return 1
  }

  headers="$(curl --fail --silent --show-error --max-time 20 --head "${base}${slice_path}")"
  grep --ignore-case --quiet '^cache-control:.*no-transform' <<<"${headers}" || {
    echo "${label}: Cache-Control no-transform is missing" >&2
    return 1
  }

  for asset_path in $(grep -oE '/slice1/assets/[^" ]+\.(css|js)' <<<"${html}"); do
    curl --fail --silent --show-error --max-time 30 "${base}${asset_path}" >/dev/null
  done

  font_sha="$(curl --fail --silent --show-error --max-time 30 \
    "${base}/slice1/fonts/PretendardVariable-v1.3.9.woff2" | sha256sum | awk '{print $1}')"
  [[ "${font_sha}" == "${expected_font_sha}" ]] || {
    echo "${label}: Pretendard SHA-256 mismatch" >&2
    return 1
  }
}

root_html="$(curl --fail --silent --show-error --max-time 20 "${public_base}/")"
[[ "${root_html}" == *'<title>OOH 기록전술 아카데미</title>'* ]] || {
  echo 'Public root OOH application regressed' >&2
  exit 1
}

verify_endpoint 'local' "${local_base}"
verify_endpoint 'public' "${public_base}"
echo 'OOH root and Isekai Coach /slice1/ are healthy.'
