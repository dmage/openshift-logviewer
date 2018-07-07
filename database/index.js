const sqlite3 = require("sqlite3").verbose();
const segment = require("digdown/segment");
const machine = require("digdown/machine");

module.exports.buildTrigrams = function(file, offset, length, callback) {
    const stream = segment.open(file, offset, length);
    let set = new Set();
    const denoise = x => {
        const re = /(?:[:=.-][A-Za-z0-9]+)+|: [A-Za-z0-9]*[0-9][A-Za-z0-9]*|[0-9a-f-]{16,}|0x[0-9a-f]+|[0-9]+(?:\.[0-9]+)?|[0-9]*\.[0-9]+(e[+-][0-9]+)?|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[^\x00-\x7f]+/g;
        return x.replace(re, "?");
    };
    const fillSet = (ctx) => {
        const line = denoise(ctx.line);
        for (let i = 0; i <= line.length - 3; i++) {
            set.add(line.slice(i, i + 3));
        }
        return fillSet;
    };
    machine.run(stream, fillSet, (err) => {
        if (err) {
            callback(err);
            return;
        }
        callback(null, set);
    });
};

module.exports.init = function init(filename, callback) {
    let db = new sqlite3.Database(filename);
    db.run(`CREATE TABLE IF NOT EXISTS trigrams(
        namespace TEXT NOT NULL,
        segment TEXT NOT NULL,
        name TEXT NOT NULL,
        trigrams TEXT NOT NULL,
        size INTEGER NOT NULL,
        PRIMARY KEY (namespace, segment)
    )`, (err) => {
        callback(err, db);
    });
};

function trigramsSerialize(trigrams) {
    return JSON.stringify(Array.from(trigrams));
}

function trigramsDeserialize(data) {
    return new Set(JSON.parse(data));
}

function intersectionSize(as, bs) {
    let c = 0;
    for (let a of as) {
        if (bs.has(a)) {
            c++;
        }
    }
    return c;
}

function trigramsDistance(as, bs) {
    const al = as.size, bl = bs.size;
    const m = (al > bl ? al : bl);
    const d = m - intersectionSize(as, bs);
    return d;
}

module.exports.storeTrigrams = function storeTrigrams(db, namespace, segment, name, trigrams, callback) {
    db.run("REPLACE INTO trigrams(namespace, segment, name, trigrams, size) VALUES(?, ?, ?, ?, ?)", [
        namespace,
        segment,
        name,
        trigramsSerialize(trigrams),
        trigrams.size,
    ], callback);
};

module.exports.findSimilarTrigrams = function findSimilarTrigrams(db, trigrams, callback) {
    const n = 20;
    db.all("SELECT * FROM trigrams WHERE ABS(size - ?) < ?", [trigrams.size, n], (err, rows) => {
        if (err) {
            callback(err);
            return;
        }
        let result = [];
        const cb = (i) => {
            if (i === rows.length) {
                callback(err, result);
                return;
            }
            let row = rows[i];
            if (trigramsDistance(trigrams, trigramsDeserialize(row.trigrams)) < n) {
                result.push({
                    namespace: row.namespace,
                    segment: row.segment,
                    name: row.name,
                });
            }
            setTimeout(() => cb(i + 1), 0);
        };
        cb(0);
    });
};
