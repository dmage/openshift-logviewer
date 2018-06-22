import _ from "lodash";

const gitHubGoRe = /github.com\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)\/([^_][A-Za-z0-9\/._-]+.go):([0-9]+)/;
export function filterGitHubGoLink(parts) {
    return parts.reduce((r, part) => {
        if (typeof part === "string") {
            while (true) {
                let match = gitHubGoRe.exec(part);
                if (match === null) {
                    r.push(part);
                    break;
                }
                let link = `https://github.com/${match[1]}/${match[2]}/blob/master/${match[3]}#L${match[4]}`;
                r.push(part.substring(0, match.index));
                r.push({__html: "<a href=\"" + _.escape(link) + "\">"});
                r.push(match[0]);
                r.push({__html: "</a>"});
                part = part.substring(match.index + match[0].length);
            }
        } else {
            r.push(part);
        }
        return r;
    }, []);
}

const highlightRe = new RegExp("\\b(?:" + [
    /operation not permitted/,
    /no such file or directory/,
    /no such process/,
    /interrupted system call/,
    /input\/output error/,
    /permission denied/,
    /device or resource busy/,
    /invalid argument/,
    /too many open files/,
    /no space left on device/,
    /read-only file system/,
    /broken pipe/,
    /address already in use/,
    /network is down/,
    /network is unreachable/,
    /connection reset by peer/,
    /connection timed out/,
    /connection refused/,
    /host is down/,
    /no route to host/,
    /operation already in progress/,
    /disk quota exceeded/,
    /operation canceled/,
    /command not found/,
    /panic|oops|fatal|error|warning|can ?not|can't|could not|unable|unexpected|undefined/,
    /failed|failure/,
    /not supported|forbidden|denied/,
    /ContainersNotReady|Unhealthy|ready: false/,
    // F0304 13:37:30.948988       1 helpers.go:119] error: build...cker.io/fail/me not found: does not exist or no pull access
    /[WEF][0-9]{4} [0-9][0-9]:[0-9][0-9]:[0-9][0-9]\.[0-9]{6} [0-9 ]{7} [A-Za-z0-9._-]+:[0-9]+\]/,
    /Received interrupt\.  Running AfterSuite\.\.\./,
].map(r => r.source).join("|") + ")", "i");
export function filterHighlight(parts) {
    return parts.reduce((r, part) => {
        if (typeof part === "string") {
            while (true) {
                let match = highlightRe.exec(part);
                if (match === null) {
                    r.push(part);
                    break;
                }
                r.push(part.substring(0, match.index));
                r.push({__html: "<b class=\"highlight\">"});
                r.push(match[0]);
                r.push({__html: "</b>"});
                part = part.substring(match.index + match[0].length);
            }
        } else {
            r.push(part);
        }
        return r;
    }, []);
}

export function filterHTML(parts) {
    return parts.reduce((r, part) => {
        if (typeof part === "string") {
            return r + _.escape(part);
        }
        return r + part.__html;
    }, "");
}
