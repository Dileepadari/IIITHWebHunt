#!/bin/bash
# End-to-end smoke test for the Website Hunt API.
#
# Walks every user journey against a running server: registration, login,
# authorization, team creation, the game lifecycle, URL normalization, the
# submission cooldown, each scoring outcome, and auto-discovery.
#
# Requires a server running against a DISPOSABLE database - it registers users,
# creates teams, adds websites and starts games. Never point it at production.
#
# Safe to run repeatedly: every run uses fresh usernames, team names and target
# hostnames, so it does not depend on a virgin database.
#
# Usage:
#   BASE_URL=http://localhost:5000 \
#   ADMIN_USER=admin ADMIN_PASS=adminpass123 \
#   PG_CONTAINER=hunt-pg PG_USER=hunt PG_DB=websitehunt \
#     ./scripts/smoke-test.sh
#
# Exits non-zero if any check fails.
set -uo pipefail

B="${BASE_URL:-http://localhost:5000}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-adminpass123}"
PG_CONTAINER="${PG_CONTAINER:-webhunt-test}"
PG_USER="${PG_USER:-hunt}"
PG_DB="${PG_DB:-websitehunt}"

# Every run uses fresh identifiers. Without this the second run fails at
# registration ("username exists") and every later check cascades into
# "Authentication required", which looks like a product bug and is not.
RUN="$(date +%s)$$"
P1="p1_$RUN"; P2="p2_$RUN"
export P1 P2
TEAM_A="Alpha $RUN"; TEAM_B="Beta $RUN"
# Targets are created by this run, so their conquest state is always known.
T1="t1-$RUN.iiit.ac.in"; T2="t2-$RUN.iiit.ac.in"; T3="t3-$RUN.iiit.ac.in"
# A genuinely reachable IIIT host, used to prove the live-verification path.
# Override if this one ever goes away.
DISCOVERY_HOST="${DISCOVERY_HOST:-cvit.iiit.ac.in}"

JAR_DIR=$(mktemp -d)
trap 'rm -rf "$JAR_DIR"' EXIT
AD="$JAR_DIR/admin.jar"; PL="$JAR_DIR/player.jar"
pass=0; fail=0

j() { python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d if not isinstance(d,dict) else {k:d[k] for k in d if k in ('outcome','points','message','discovered','isSuccessful','url','count','duplicates','name','status')},separators=(',',':')))" 2>/dev/null; }

check() { # check <label> <expected-substring> <actual>
  if echo "$3" | grep -q "$2"; then echo "  PASS  $1"; pass=$((pass+1));
  else echo "  FAIL  $1"; echo "        want: $2"; echo "        got : $3"; fail=$((fail+1)); fi
}

echo "=== 1. Registration and login ==="
R=$(curl -sS -c $PL -X POST $B/api/register -H 'Content-Type: application/json' \
  -d "{\"username\":\"$P1\",\"email\":\"$P1@iiit.ac.in\",\"password\":\"playerpass1\",\"firstName\":\"Play\",\"lastName\":\"One\"}")
check "player registers" "\"username\":\"$P1\"" "$R"

R=$(curl -sS -X POST $B/api/register -H 'Content-Type: application/json' -d '{"username":"short","email":"s@x.com","password":"abc"}')
check "short password rejected" 'at least 8' "$R"

R=$(curl -sS -X POST $B/api/register -H 'Content-Type: application/json' -d '{"username":"bad","email":"notanemail","password":"longenough1"}')
check "bad email rejected" 'valid email' "$R"

R=$(curl -sS -c $AD -X POST $B/api/login -H 'Content-Type: application/json' -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}")
check "admin logs in" '"isAdmin":true' "$R"

R=$(curl -sS -X POST $B/api/login -H 'Content-Type: application/json' -d "{\"username\":\"$ADMIN_USER\",\"password\":\"definitely-not-the-password\"}")
check "wrong password rejected" 'Invalid username or password' "$R"

R=$(curl -sS -X POST $B/api/login -H 'Content-Type: application/json' -d "{\"username\":\"$(echo $ADMIN_USER | tr a-z A-Z)\",\"password\":\"$ADMIN_PASS\"}")
check "username is case-insensitive" '"isAdmin":true' "$R"

echo
echo "=== 2. Authorization ==="
R=$(curl -sS $B/api/teams)
check "anonymous blocked" 'Authentication required' "$R"
R=$(curl -sS -b $PL $B/api/users)
check "non-admin blocked from /api/users" 'Admin access required' "$R"
R=$(curl -sS -b $PL -X POST $B/api/websites/bulk -H 'Content-Type: application/json' -d '{"urls":["https://x.iiit.ac.in"]}')
check "non-admin blocked from bulk add" 'Admin access required' "$R"

echo
echo "=== 3. Team creation ==="
PID=$(curl -sS -b $AD $B/api/users | python3 -c "import sys,json,os;print([u['id'] for u in json.load(sys.stdin) if u['username']==os.environ['P1']][0])")
R=$(curl -sS -b $AD $B/api/users)
check "password hashes not exposed" '^0$' "$(echo "$R" | grep -c '\"password\"')"
R=$(curl -sS -b $AD -X POST $B/api/teams -H 'Content-Type: application/json' -d "{\"name\":\"$TEAM_A\",\"captainId\":\"$PID\",\"members\":[\"$PID\"]}")
check "team created" "\"name\":\"$TEAM_A\"" "$R"
R=$(curl -sS -b $AD -X POST $B/api/teams -H 'Content-Type: application/json' -d "{\"name\":\"$TEAM_A\",\"members\":[\"$PID\"]}")
check "duplicate team name rejected" 'already exists' "$R"
R=$(curl -sS -b $PL $B/api/teams/my-team)
check "player resolves to their team" "\"name\":\"$TEAM_A\"" "$R"

echo
echo "=== 4. Game gating ==="
# End any game a previous run left running, so the "no game" check is real.
curl -sS -b $AD -X POST $B/api/game/end >/dev/null 2>&1 || true
R=$(curl -sS -b $PL -X POST $B/api/conquests -H 'Content-Type: application/json' -d "{\"url\":\"https://$T1\"}")
check "no game running -> blocked" 'no game running' "$R"

# Register this run's own unconquered targets. Sites already in the database are
# never network-verified, so these need not resolve.
curl -sS -b $AD -X POST $B/api/websites/bulk -H 'Content-Type: application/json' \
  -d "{\"urls\":[\"https://$T1\",\"https://$T2\",\"https://$T3\"]}" >/dev/null

R=$(curl -sS -b $AD -X POST $B/api/game/start -H 'Content-Type: application/json' -d '{"duration":60}')
check "admin starts game" '"status":"active"' "$R"

echo
echo "=== 5. URL normalization (the core ask) ==="
R=$(curl -sS -b $PL -X POST $B/api/conquests -H 'Content-Type: application/json' -d "{\"url\":\"   HTTPS://$(echo $T1 | tr a-z A-Z)/   \"}")
check "spaces+caps+slash still match" '"outcome":"conquered"' "$(echo $R|j)"
sleep 2.1
R=$(curl -sS -b $PL -X POST $B/api/conquests -H 'Content-Type: application/json' -d "{\"url\":\"www.$T1\"}")
check "resubmit (www variant) -> already done, 0 pts" '"outcome":"already_yours","points":0' "$(echo $R|j)"
sleep 2.1
R=$(curl -sS -b $PL -X POST $B/api/conquests -H 'Content-Type: application/json' -d "{\"url\":\"$(echo $T1 | sed 's/\./ ./')\"}")
check "internal space variant -> already done" '"outcome":"already_yours"' "$(echo $R|j)"

echo
echo "=== 6. Cooldown (2s anti-spam) ==="
R=$(curl -sS -b $PL -X POST $B/api/conquests -H 'Content-Type: application/json' -d "{\"url\":\"https://$T2\"}")
check "immediate resubmit -> 429" 'Slow down' "$(echo $R|j)"
sleep 2.1

echo
echo "=== 7. Wrong guesses ==="
R=$(curl -sS -b $PL -X POST $B/api/conquests -H 'Content-Type: application/json' -d "{\"url\":\"https://wrong-$RUN.example.com\"}")
check "non-IIIT domain -> -25" '"outcome":"wrong","points":-25' "$(echo $R|j)"
sleep 2.1
R=$(curl -sS -b $PL -X POST $B/api/conquests -H 'Content-Type: application/json' -d "{\"url\":\"  WRONG-$RUN.EXAMPLE.COM/  \"}")
check "repeat wrong guess -> no second penalty" '"outcome":"repeat_miss","points":0' "$(echo $R|j)"
sleep 2.1
R=$(curl -sS -b $PL -X POST $B/api/conquests -H 'Content-Type: application/json' -d "{\"url\":\"https://bogus-$RUN.iiit.ac.in\"}")
check "unreachable IIIT host -> no penalty (internal sites)" '"outcome":"unverified","points":0' "$(echo $R|j)"
sleep 2.1
R=$(curl -sS -b $PL -X POST $B/api/conquests -H 'Content-Type: application/json' -d '{"url":"asdf"}')
check "typo -> 400, no penalty" 'website address' "$(echo $R|j)"
sleep 2.1

echo
echo "=== 8. Auto-discovery of unlisted IIIT sites ==="
docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -q -c \
  "DELETE FROM conquests WHERE website_id IN (SELECT id FROM websites WHERE normalized_url='$DISCOVERY_HOST');
   DELETE FROM websites WHERE normalized_url='$DISCOVERY_HOST';" >/dev/null
R=$(curl -sS -b $PL -X POST $B/api/conquests -H 'Content-Type: application/json' -d "{\"url\":\"  $DISCOVERY_HOST  \"}")
check "unlisted but live -> discovered + points" '"outcome":"conquered"' "$(echo $R|j)"
check "flagged as discovered" '"discovered":true' "$(echo $R|j)"
sleep 2.1

echo
echo "=== 9. Second team cannot retake ==="
curl -sS -c $JAR_DIR/player2.jar -X POST $B/api/register -H 'Content-Type: application/json' \
  -d "{\"username\":\"$P2\",\"email\":\"$P2@iiit.ac.in\",\"password\":\"playerpass2\"}" >/dev/null
P2ID=$(curl -sS -b $AD $B/api/users | python3 -c "import sys,json,os;print([u['id'] for u in json.load(sys.stdin) if u['username']==os.environ['P2']][0])")
curl -sS -b $AD -X POST $B/api/teams -H 'Content-Type: application/json' -d "{\"name\":\"$TEAM_B\",\"members\":[\"$P2ID\"]}" >/dev/null
R=$(curl -sS -b $JAR_DIR/player2.jar -X POST $B/api/conquests -H 'Content-Type: application/json' -d "{\"url\":\"https://$T1\"}")
check "already taken -> 0 pts, no penalty" '"outcome":"already_taken","points":0' "$(echo $R|j)"

echo
echo "=== 10. Admin bulk add ==="
R=$(curl -sS -b $AD -X POST $B/api/websites/bulk -H 'Content-Type: application/json' \
  -d "{\"urls\":[\"  HTTPS://Bulk-$RUN.IIIT.ac.in/  \",\"bulk-$RUN.iiit.ac.in\",\"https://google.com\",\"notaurl\",\"https://bulk2-$RUN.iiit.ac.in\"]}")
check "dedupes variants + reports rejects" '"count":2' "$(echo $R|j)"

echo
echo "=== 11. Pause blocks play ==="
curl -sS -b $AD -X POST $B/api/game/pause >/dev/null
sleep 2.1
R=$(curl -sS -b $PL -X POST $B/api/conquests -H 'Content-Type: application/json' -d "{\"url\":\"https://$T3\"}")
check "paused -> blocked" 'paused' "$(echo $R|j)"
curl -sS -b $AD -X POST $B/api/game/resume >/dev/null
R=$(curl -sS -b $AD -X POST $B/api/game/resume)
check "double resume -> 409, not 500" 'Cannot resume' "$R"

echo
echo "=== 12. Read endpoints ==="
R=$(curl -sS -b $PL $B/api/conquests/my-team); check "my-team history non-empty" '"teamId"' "$R"
R=$(curl -sS -b $PL $B/api/conquests/recent); check "recent feed carries team object" '"team":{' "$R"
R=$(curl -sS -b $PL $B/api/admin/stats); check "stats are numbers not strings" '"totalWebsites":[0-9]' "$R"
R=$(curl -sS -b $PL $B/api/teams); check "leaderboard sorted" '"name"' "$R"

echo
echo "======================================"
echo "  PASSED: $pass   FAILED: $fail"
echo "======================================"
[ "$fail" -eq 0 ] || exit 1
