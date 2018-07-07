#!/bin/sh
set -eu
URL=$($(dirname $0)/normalize-url.js "$@")
if ! curl -fsIS "$URL" >/dev/null; then
    echo "curl: $URL" >&2
    exit 1
fi
echo "$URL"
