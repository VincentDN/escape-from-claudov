#!/usr/bin/env bash
# Builds the game and runs every Escape From Claudov check. Run from the repo root: bash tools/dev/efc/run-all.sh
# Needs Python 3, Node and Playwright with Chromium. About 20 minutes with software rendering.
export NODE_PATH="${NODE_PATH:-/opt/node22/lib/node_modules}"
fail=0
run() { echo "### $*"; if "$@" > /tmp/efc-run.log 2>&1; then tail -1 /tmp/efc-run.log; else tail -5 /tmp/efc-run.log; echo "FAILED: $*"; fail=1; fi; }
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
run node tools/dev/efc/test-map.mjs
run node tools/dev/efc/test-e2e.mjs
run env MAP=claudov node tools/dev/efc/test-e2e.mjs
run node tools/dev/efc/test-net.mjs
run node tools/dev/efc/test-e2e-net.mjs
[ $fail = 0 ] && echo "ALL CHECKS PASSED" || echo "SOME CHECKS FAILED"
exit $fail
