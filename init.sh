#!/bin/bash
set -e

echo "=== Harness Initialization ==="

echo "=== bash -n init.sh ==="
bash -n init.sh

echo "=== scripts/run_tests.sh tests/hermes_cli/test_config.py ==="
scripts/run_tests.sh tests/hermes_cli/test_config.py

echo "=== Verification Complete ==="
echo ""
echo "Next steps:"
echo "1. Read feature_list.json and the relevant agent_state/features/*.json file"
echo "2. Pick ONE unfinished feature to work on"
echo "3. Implement only that feature"
echo "4. Add routine evidence to agent_state/progress/*.md"
echo "5. Re-run verification before claiming done"
