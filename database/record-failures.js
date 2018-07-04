#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const database = require("./index");

const RESOURCES_ROOT = process.env.DIGDOWN_RESOURCES_ROOT;
if (typeof RESOURCES_ROOT === "undefined" || RESOURCES_ROOT === "") {
    console.error("The environment variable DIGDOWN_RESOURCES_ROOT should be set and point to a directory with resources.");
    process.exit(1);
}

function resourceRead(namespace, name, callback) {
    fs.readFile(RESOURCES_ROOT + "/" + namespace + "/" + name, callback);
}

function readSegments(namespace, callback) {
    resourceRead(namespace, "segments.json", callback);
}

const namespace = process.argv[2];
if (!namespace) {
    throw "the first argument should be a namespace";
}

function findFailures(base, namePrefix, id, segment) {
    let result = [];
    if (id !== "" || segment.offset !== 0) {
        id += (id === "" ? "" : ":") + segment.offset;
    }
    if (segment.metadata && segment.metadata.status === "failure") {
        result.push({
            offset: base + segment.offset,
            length: segment.length,
            segment: id,
            name: namePrefix + segment.metadata.name,
        });
    }
    if (segment.segments) {
        if (segment.metadata && typeof segment.metadata.name !== "undefined") {
            namePrefix = namePrefix + segment.metadata.name + " → ";
        }
        for (let seg of segment.segments) {
            result = result.concat(findFailures(base + segment.offset, namePrefix, id, seg));
        }
    }
    return result;
}

database.init(RESOURCES_ROOT + "/trigrams.db", (err, db) => {
    if (err) {
        throw err;
    }
    readSegments(namespace, (err, data) => {
        if (err) {
            throw new Error("unable to read segments: " + err);
        }
        const failures = findFailures(0, "", "", JSON.parse(data));
        for (let failure of failures) {
            database.buildTrigrams(RESOURCES_ROOT + "/" + namespace + "/raw", failure.offset, failure.length, (err, trigrams) => {
                if (err) {
                    throw new Error("unable to generate trigrams: " + err);
                }
                database.storeTrigrams(db, namespace, failure.segment, failure.name, trigrams, (err) => {
                    if (err) {
                        throw new Error("unable to store trigrams: " + err);
                    }
                });
            });
        }
    });
});
