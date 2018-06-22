#!/bin/sh
set -eu

ID=${1?usage: $0 JOB_NAME/BUILD_ID}

JOB_NAME=${ID%/*}
BUILD_ID=${ID##*/}

if [ "$BUILD_ID" -gt 100000 ]; then
    echo "Unable to get fallback URL for $ID" >&2
    exit 1
fi

echo "https://ci.openshift.redhat.com/jenkins/job/$ID/consoleText"
