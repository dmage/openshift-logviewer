#!/bin/sh
set -eu

ID=${1?usage: $0 JOB_NAME/BUILD_ID}

TOOLSDIR=$(dirname -- "$0")
TOPDIR=$TOOLSDIR/..

if JOB_URL=$("$TOOLSDIR/get-prowjob-url.sh" "$TOPDIR/cache/prowjobs.txt" "$ID"); then
    : # ok
elif JOB_URL=$("$TOOLSDIR/get-fallback-raw-url.sh" "$ID"); then
    curl -IsS "$JOB_URL" >/dev/null
fi

jq -n \
    --arg id "$ID" \
    --arg job_url "$JOB_URL" \
    '{$id,$job_url}'
