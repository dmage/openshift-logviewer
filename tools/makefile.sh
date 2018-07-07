#!/bin/sh
set -eu

OUT=${1?usage: $0 OUTPUT_FILENAME COMMAND ARGS...}
shift

TMPNAME="$OUT.$$.tmp"
ERR=0
"$@" >"$TMPNAME" || ERR=$?
if [ "$ERR" = 0 ]; then
    mv "$TMPNAME" "$OUT"
else
    rm -f "$TMPNAME"
    exit $ERR
fi
