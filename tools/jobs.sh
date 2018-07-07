#!/bin/sh -eu
jq -r <${1?path to prowjobs.json} '.items[] |
select((.spec.agent == "jenkins" or .spec.agent == "kubernetes") and (.spec.refs.pulls | length == 1)) |
{
    spec: .spec | {
        agent,
        job,
        refs: .refs | {
            org,
            repo,
            base_sha,
            sha: .pulls[0].sha
        }
    },
    status: .status | {
        state,
        build_id,
        url
    }
} | "\(.spec.refs.org)/\(.spec.refs.repo)\t\(.spec.refs.base_sha)+\(.spec.refs.sha)\t\(.spec.agent)\t\(.spec.job)\t\(.status.build_id)\t\(.status.state)"'
