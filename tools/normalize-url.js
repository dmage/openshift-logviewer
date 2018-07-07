#!/usr/bin/env node
const path = require("path");

if (process.argv.length !== 2 /* node script.js */ + 2) {
    console.error(`usage: ${path.basename(process.argv[1])} <method> <url>`);
    process.exit(1);
}
const method = process.argv[2];
const url = process.argv[3];

if (["id-type", "jenkins", "openshift-gce"].indexOf(method) === -1) {
    console.error(`${path.basename(process.argv[1])}: unknown method ${method}`);
    process.exit(1);
}

function result(type, id, url) {
    switch (method) {
    case "id-type":
        process.stdout.write(id + "\t" + type + "\n");
        process.exit(0);
    case type:
        process.stdout.write(url + "\n");
        process.exit(0);
    default:
        process.exit(1);
    }
}

let match = /^https?:\/\/openshift-gce-devel\.appspot\.com\/+build\/+origin-ci-test\/+pr-logs\/+pull\/+([A-Za-z0-9\/_-]+)\/+([A-Za-z0-9_-]+\/+[0-9]+)\/*(\?[A-Za-z0-9=%&._-]*)?(#.*)?$/.exec(url);
if (match !== null) {
    const pr = match[1];
    const id = match[2].replace(/\/\/+/g, "/");
    result("openshift-gce", id, `https://storage.googleapis.com/origin-ci-test/pr-logs/pull/${pr}/${id}/build-log.txt`);
}

// https://openshift-gce-devel.appspot.com/build/origin-ci-test/logs/test_branch_origin_cmd/2190/
match = /^https?:\/\/openshift-gce-devel\.appspot\.com\/+build\/+origin-ci-test\/+logs\/+([A-Za-z0-9_-]+\/+[0-9]+)\/*(\?[A-Za-z0-9=%&._-]*)?(#.*)?$/.exec(url);
if (match !== null) {
    const id = match[1].replace(/\/\/+/g, "/");
    result("openshift-gce", id, `https://storage.googleapis.com/origin-ci-test/logs/${id}/build-log.txt`);
}

match = /^https?:\/\/ci\.openshift\.redhat\.com\/+jenkins\/+job\/+([A-Za-z0-9_-]+\/+[0-9]+)(\/+[A-Za-z0-9\/=%._-]*)?(#.*)?$/.exec(url);
if (match !== null) {
    const id = match[1].replace(/\/\/+/g, "/");
    result("jenkins", id, `https://ci.openshift.redhat.com/jenkins/job/${id}/consoleText`);
}

match = /^https?:\/\/travis-ci\.org\/+[A-Za-z0-9_-]+\/+[A-Za-z0-9_-]+\/+builds\/+([0-9]+)(\?[A-Za-z0-9=%&._-]*)?(#.*)?$/.exec(url);
if (match !== null) {
    let build = parseInt(match[1], 10) + 1;
    result("TODO-travis", "travis-ci-org/" + build, `https://api.travis-ci.org/v3/job/${build}/log.txt`);
}

console.error(`${path.basename(process.argv[1])}: unknown location: ${url}`);
process.exit(1);
