#!/bin/sh
set -eu

PROWJOBS=${1?usage: $0 ./cache/prowjobs.txt JOB_NAME/BUILD_ID}
ID=${2?usage: $0 ./cache/prowjobs.txt JOB_NAME/BUILD_ID}

if ! REC=$(grep -F "$(printf '\t%s\t' "$ID" | tr / '\t')" "$PROWJOBS"); then
    echo "failed to find prowjob for $ID" >&2
    exit 1
fi

echo "$REC" | cut -f6
