#!/bin/sh
set -eu
: ${DIGDOWN_RESOURCES_ROOT?}
URL=${1?usage: $0 URL}
TOOLS=$(dirname "$0")

ID_TYPE=$("$TOOLS/normalize-url.js" id-type "$URL")
ID=$(printf "%s" "$ID_TYPE" | cut -f1)
TYPE=$(printf "%s" "$ID_TYPE" | cut -f2)

echo "$ID"

OUT="$DIGDOWN_RESOURCES_ROOT/$ID/$TYPE.url"
if [ -e "$OUT" ]; then
    exit 0
fi

mkdir -p "$DIGDOWN_RESOURCES_ROOT/$ID"
"$TOOLS/makefile.sh" $OUT "$TOOLS/check-url.sh" "$TYPE" "$URL"
