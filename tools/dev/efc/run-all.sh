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
  if "$@" > "$log" 2>&1; then tail -1 "$log"; else grep -E '^FAIL |^ECHEC' "$log" || true; tail -5 "$log"; echo "FAILED: $*"; fail=1; fi
}
run python3 build.py
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
run env MAP=sable node tools/dev/efc/test-e2e.mjs
run env MAP=claudov node tools/dev/efc/test-e2e.mjs
run node tools/dev/efc/test-net.mjs
run node tools/dev/efc/test-e2e-net.mjs
run node tools/dev/efc/test-weapon-check-net.mjs
[ $fail = 0 ] && echo "ALL CHECKS PASSED" || echo "SOME CHECKS FAILED"
exit $fail
