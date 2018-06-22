#!/bin/sh
set -eu

INFO_JSON=${1?usage: $0 job/info.json}

URL=$(jq -r .job_url "$INFO_JSON")

echo $URL | sed -e '
/openshift-gce-devel.appspot.com/ {
    s,/openshift-gce-devel.appspot.com/build/,/storage.googleapis.com/,
    s,$,build-log.txt,
}
'
