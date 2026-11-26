#!/usr/bin/env bash
# Builds the game and runs every Escape From Claudov check. Run from the repo root: bash tools/dev/efc/run-all.sh
# Needs Python 3, Node and Playwright with Chromium. About 20 minutes with software rendering.
export NODE_PATH="${NODE_PATH:-/opt/node22/lib/node_modules}"
fail=0
test_number=0
if [ -n "${EFC_TEST_LOG_DIR:-}" ]; then mkdir -p "$EFC_TEST_LOG_DIR" || exit 1; fi
run() {
  echo "### $*"
  test_number=$((test_number + 1))
  local log=/tmp/efc-run.log
  if [ -n "${EFC_TEST_LOG_DIR:-}" ]; then log="$EFC_TEST_LOG_DIR/$test_number.log"; fi
  if "$@" > "$log" 2>&1; then tail -1 "$log"; else grep -vE "^\s+at " "$log" | tail -25; echo "FAILED: $*"; fail=1; fi
}
run python3 build.py
# Some tests need the game over HTTP (the workbench iframe, the #bench route). CI sets EFC_TEST_URL; locally, serve dist/ here.
if [ -z "${EFC_TEST_URL:-}" ]; then
  python3 -m http.server 8231 --bind 127.0.0.1 --directory dist > /dev/null 2>&1 &
  efc_server_pid=$!
  trap 'kill "$efc_server_pid" 2>/dev/null' EXIT
  export EFC_TEST_URL=http://127.0.0.1:8231/
  sleep 1
fi
run python3 tools/dev/check_decl.py
run python3 tools/dev/check_i18n.py
run node tools/dev/efc/smoke.mjs
run env MODE=raid MAP=claudov node tools/dev/efc/smoke.mjs
run node tools/dev/efc/test-items.mjs
run node tools/dev/efc/test-world.mjs
run node tools/dev/efc/test-raid.mjs
run node tools/dev/efc/test-warden.mjs
run node tools/dev/efc/test-ui.mjs
run node tools/dev/efc/test-inventory-layout.mjs
run node tools/dev/efc/test-grid-placement.mjs
run node tools/dev/efc/test-inventory-keys.mjs
run node tools/dev/efc/test-inventory-drag.mjs
run node tools/dev/efc/test-weapon-check.mjs
run node tools/dev/efc/test-omni-sprint.mjs
run node tools/dev/efc/test-panel-event.mjs
run node tools/dev/efc/test-thumbs.mjs
run node tools/dev/efc/test-sounds.mjs
run node tools/dev/efc/test-bench.mjs
run node tools/dev/efc/test-artlab.mjs
run node tools/dev/efc/test-sks.mjs
run node tools/dev/efc/test-warden-pace.mjs
run node tools/dev/efc/test-lean.mjs
run node tools/dev/efc/test-music.mjs
run node tools/dev/efc/test-map.mjs
run node tools/dev/efc/test-spawns.mjs
run node tools/dev/efc/test-operator.mjs
run node tools/dev/efc/test-weaponmods.mjs
run node tools/dev/efc/test-partisan-rifles.mjs
run node tools/dev/efc/test-stg44.mjs
run node tools/dev/efc/test-scavengers.mjs
run node tools/dev/efc/test-migration.mjs
run node tools/dev/efc/test-container-collision.mjs
run node tools/dev/efc/test-iron-sight-kick.mjs
run node tools/dev/efc/test-bench-route.mjs
run env MAP=sable node tools/dev/efc/test-e2e.mjs
run env MAP=claudov node tools/dev/efc/test-e2e.mjs
run node tools/dev/efc/test-net.mjs
run node tools/dev/efc/test-e2e-net.mjs
run node tools/dev/efc/test-weapon-check-net.mjs
[ $fail = 0 ] && echo "ALL CHECKS PASSED" || echo "SOME CHECKS FAILED"
exit $fail
