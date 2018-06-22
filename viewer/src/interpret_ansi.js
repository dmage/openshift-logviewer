export default function interpretANSI(input) {
    let pos = 0;
    let output = "";
    let mods = [];
    let layer = 0;
    let state = { bold: false, fg: null, bg: null };

    const text = (chunk) => {
        output = output.slice(0, pos) + chunk + output.slice(pos + chunk.length);
        mods.push({
            pos: pos,
            end: false,
            layer: ++layer,
            ...state,
        });
        pos += chunk.length;
        mods.push({
            pos: pos,
            end: true,
            layer: layer,
            ...state,
        });
    };
    const sgr = (n) => {
        const params = n.split(";").map((x) => parseInt(x, 10));
        for (let i = 0; i < params.length; i++) {
            switch (params[i]) {
            case 0:
                state = {
                    bold: false,
                    fg: null,
                    bg: null,
                };
                break;
            case 1:
                state.bold = true;
                break;
            default:
                if (30 <= params[i] && params[i] <= 37) {
                    state.fg = params[i] - 30;
                    break;
                }
                if (params[i] == 38 && i + 2 < params.length && params[i+1] == 5) {
                    const min = 0x33, def = 0x99, max = 0xcc;
                    let r = 0, g = 0, b = 0;
                    let c = params[i+2];
                    if (c < 16) {
                        const val = (c & 8 ? max : def);
                        r = (c & 1 ? val : min);
                        g = (c & 2 ? val : min);
                        b = (c & 4 ? val : min);
                    } else if (c < 232) {
                        c -= 16;
                        b = min + Math.round((max-min)*(c%6)/5);
                        c = c/6|0;
                        g = min + Math.round((max-min)*(c%6)/5);
                        c = c/6|0;
                        r = min + Math.round((max-min)*(c%6)/5);
                    } else if (c < 256) {
                        c -= 232;
                        r = g = b = min + Math.round((max-min)*(c%24)/23)
                    } else {
                        console.log("unsupported SGR code", params[i], ["CSI", n, "m"]);
                        break;
                    }
                    const hex = (x) => ("0" + x.toString(16)).slice(-2);
                    state.fg = "#" + hex(r) + hex(g) + hex(b);
                    i += 2;
                    break;
                }
                if (40 <= params[i] && params[i] <= 47) {
                    state.bg = params[i] - 40;
                    break;
                }
                console.log("unsupported SGR code", params[i], ["CSI", n, "m"]);
            }
        }
    };
    const el = (n) => {
        switch (n) {
        case "":
        case "0":
            output = output.slice(0, pos);
            break;
        case "1":
            output = Array(pos + 1).join(" ") + output.slice(pos);
            break;
        case "2":
            output = Array(pos + 1).join(" ");
            break;
        default:
            console.log("unsupported escape sequence", ["CSI", n, "K"]);
        }
    };
    const csi = () => {
        const match = /^\[([\x30-\x3f]*)([\x20-\x2f]*)([\x40-\x7e])/.exec(input);
        if (match === null) {
            console.log("unsupported escape sequence", ["CSI", input.slice(0, 10)]);
            return;
        }
        input = input.slice(match[0].length);
        if (/[^0-9;]/.test(match[1]) || match[2] !== "") {
            console.log("unsupported escape sequence", ["CSI", match[0]]);
            return;
        }
        switch (match[3]) {
        case "m":
            sgr(match[1]);
            break;
        case "K":
            el(match[1]);
            break;
        default:
            console.log("unsupported escape sequence", ["CSI", match[0]]);
        }
    };
    const esc = () => {
        if (input === "") {
            console.log("unsupported escape sequence", ["ESC", "end-of-line"]);
            return;
        }
        const ch = input[0];
        switch (ch) {
        case "[":
            csi();
            break;
        default:
            console.log("unsupported escape sequence", ["ESC", ch]);
        }
    };

    while (true) {
        const p = input.search(/[\x1b\r]/);
        if (p === -1) {
            break;
        }
        if (p > 0) {
            text(input.slice(0, p));
        }
        const ch = input[p];
        input = input.slice(p + 1);
        switch (ch) {
        case "\r":
            pos = 0;
            break;
        case "\x1b":
            esc();
            break;
        default:
            console.log("bug? control byte", ch);
        }
    }
    if (input !== "") {
        text(input);
    }

    mods.sort((a, b) => {
        if (a.pos != b.pos) return a.pos - b.pos;
        return -(a.end - b.end);
    });
    let r = [];
    const print = (text, state) => {
        if (text === "") {
            return;
        }
        let attrClass = [];
        let attrStyle = [];
        if (state.bold) {
            attrClass.push("sgr-bold");
        }
        if (state.fg !== null) {
            if (typeof state.fg === "number") {
                attrClass.push("sgr-fg-" + state.fg);
            } else {
                attrStyle.push("color:" + state.fg);
            }
        }
        if (state.bg !== null) {
            attrClass.push("sgr-bg-" + state.bg);
        }
        if (attrClass.length === 0 && attrStyle.length === 0) {
            if (r.length > 0 && typeof r[r.length - 1] === "string") {
                r[r.length - 1] += text;
            } else {
                r.push(text);
            }
        } else {
            let attrs = "";
            if (attrClass.length !== 0) {
                attrs += " class=\"" + attrClass.join(" ") + "\"";
            }
            if (attrStyle.length !== 0) {
                attrs += " style=\"" + attrStyle.join(";") + "\"";
            }
            r.push({__html: "<span" + attrs + ">"});
            r.push(text);
            r.push({__html: "</span>"});
        }
    };
    const binarySearchLayer = (arr, v) => {
        let i = 0, j = arr.length; // arr[i - 1].layer < v, arr[j].layer >= v
        while (i != j) {
            let p = i + ((j - i)/2|0);
            if (arr[p].layer < v) {
                i = p + 1;
            } else {
                j = p;
            }
        }
        return i;
    };
    let stack = [{ layer: 0, bold: false, fg: null, bg: null }];
    pos = 0;
    for (let i = 0; i < mods.length && pos < output.length; i++) {
        if (mods[i].layer >= stack[stack.length - 1].layer && pos != mods[i].pos) {
            print(output.slice(pos, mods[i].pos), stack[stack.length - 1]);
            pos = mods[i].pos;
        }
        if (mods[i].end) {
            let idx = binarySearchLayer(stack, mods[i].layer);
            stack.splice(idx, 1);
        } else {
            stack.push(mods[i]);
        }
    }
    print(output.slice(pos), stack[stack.length - 1]);

    return r;
}
