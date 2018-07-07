#!/bin/sh
set -eu
if [ $# -ne 2 ]; then
    echo "usage: $0 CACHE_JSON PROWJOB" >&2
    exit 1
fi
exec jq --arg id "$2" '.items | [
    .[] |
        select("\(.spec.job)/\(.status.build_id)" == $id) |
        select(.status.state as $state | ["aborted", "error", "failure", "success"] | index($state))] |
    if (. | length) != 1 then error("found \(. | length) results") else first end' "$1"
