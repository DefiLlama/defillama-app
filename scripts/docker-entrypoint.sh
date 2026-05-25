#!/bin/sh

set -eu

SERVER_SCRIPT="${1:-server.js}"
SHUTDOWN_TIMEOUT_SECONDS="${SHUTDOWN_TIMEOUT_SECONDS:-10}"
PRESTART_PID=""
SERVER_PID=""

signal_child() {
	pid="$1"
	signal="$2"

	if [ -n "$pid" ]; then
		kill "-$signal" "$pid" 2>/dev/null || true
	fi
}

wait_child() {
	pid="$1"

	if [ -z "$pid" ]; then
		return 0
	fi

	(
		sleep "$SHUTDOWN_TIMEOUT_SECONDS"
		kill -KILL "$pid" 2>/dev/null || true
	) &
	killer_pid=$!

	wait "$pid" 2>/dev/null || true
	kill "$killer_pid" 2>/dev/null || true
	wait "$killer_pid" 2>/dev/null || true
}

stop_children() {
	signal="$1"

	signal_child "$PRESTART_PID" "$signal"
	signal_child "$SERVER_PID" "$signal"
	wait_child "$PRESTART_PID"
	wait_child "$SERVER_PID"

	PRESTART_PID=""
	SERVER_PID=""
}

handle_signal() {
	trap - INT TERM HUP
	stop_children "$1"
	exit "$2"
}

trap 'handle_signal HUP 129' HUP
trap 'handle_signal INT 130' INT
trap 'handle_signal TERM 143' TERM

./scripts/prestart.sh &
PRESTART_PID=$!

node "$SERVER_SCRIPT" &
SERVER_PID=$!

set +e
wait "$SERVER_PID"
STATUS=$?
set -e
SERVER_PID=""

stop_children TERM
exit "$STATUS"
