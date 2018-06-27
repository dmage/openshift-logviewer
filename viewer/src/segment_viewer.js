import React from "react";
import interpretANSI from "./interpret_ansi";
import { filterGitHubGoLink, filterHighlight, filterHTML } from "./line_filters";

export function httpDataSource(url) {
    return function(offset, length) {
        return new Promise((resolve, reject) => {
            let request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.setRequestHeader("Range", "bytes=" + offset + "-" + (offset + length - 1));
            request.onload = () => {
                if (request.status >= 200 && request.status < 400) {
                    resolve(request.responseText);
                } else {
                    reject(new Error("unable to load data, request status code: " + request.status));
                }
            };
            request.onerror = function(e) {
                reject(new Error("unable to load data: " + (request.statusText !== "" ? request.statusText : "connection error")));
            };
            request.send();
        });
    };
}

export class Line extends React.Component {
    renderChildren() {
        let parts = interpretANSI(this.props.children);
        parts = filterGitHubGoLink(parts);
        parts = filterHighlight(parts);
        return {
            __html: filterHTML(parts) + "\n",
        };
    }
    render() {
        return (
            <li dangerouslySetInnerHTML={this.renderChildren()} />
        );
    }
}

export class Text extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            error: "",
            lines: [],
        };
        this.attempts = 0;
        this.error = "";
        this.delay = 0;
        this.reloadTimer = null;
    }
    updateError() {
        this.setState({
            error: ["🛑 " + this.error + " (next attempt in " + this.delay + " seconds)"],
        });
    }
    loadLines() {
        this.setState({
            error: "loading...",
        });
        this.props.dataSource(this.props.offset, this.props.length)
            .then((response) => {
                const trail = response.search(/[^\n]*\r\x1b\[0?K$/);
                if (trail !== -1) {
                    response = response.slice(0, trail);
                }
                let hasEOL = false;
                if (response.endsWith("\n")) {
                    response = response.slice(0, -1);
                    hasEOL = true;
                }
                if (this.props.last) {
                    hasEOL = false;
                }
                this.setState({
                    loaded: true,
                    lines: (response === "" && !hasEOL ? [] : response.split("\n")),
                });
            })
            .catch((err) => {
                this.error = err.toString();
                this.delay = (1 << this.attempts);
                if (this.delay > 30) {
                    this.delay = 30;
                }
                this.attempts++;
                this.updateError();
                const waiter = () => {
                    this.delay--;
                    if (this.delay === 0) {
                        this.loadLines();
                    } else {
                        this.updateError();
                        this.reloadTimer = setTimeout(waiter, 1000);
                    }
                };
                this.reloadTimer = setTimeout(waiter, 1000);
            });
    }
    componentDidMount() {
        this.loadLines()
    }
    componentWillUnmount() {
        if (this.reloadTimer !== null) {
            clearTimeout(this.reloadTimer);
        }
    }
    render() {
        if (!this.state.loaded) {
            return (
                <ul><li>{this.state.error}</li></ul>
            );
        }
        return (
            <ul>
                {this.state.lines.map((line, i) => {
                    return (
                        <Line key={i}>{line}</Line>
                    );
                })}
            </ul>
        );
    }
}

export class Content extends React.Component {
    static defaultProps = {
        segments: [],
    }
    render() {
        let offset = 0;
        let segments = [];
        this.props.segments.forEach((segment, i) => {
            if (offset < segment.offset) {
                segments.push(<Text
                    offset={offset}
                    length={segment.offset - offset}
                    dataSource={this.props.dataSource}
                    key={"gap-" + i} />);
            }
            let id = this.props.id + ":" + segment.offset;
            let selected = (this.props.selected == id || this.props.selected.startsWith(id + ":"));
            segments.push(<Segment {...segment} id={id} collapsed={!selected} scrollTo={this.props.selected == id} key={"item-" + i}>
                <Content
                    {...segment}
                    id={id}
                    selected={this.props.selected}
                    dataSource={(off, len) => this.props.dataSource(segment.offset + off, len)}
                    />
            </Segment>);
            offset = segment.offset + segment.length;
        });
        if (offset < this.props.length) {
            segments.push(<Text
                offset={offset}
                length={this.props.length - offset}
                last={true}
                dataSource={this.props.dataSource}
                key="tail" />);
        }
        return (
            <div className="segment-content">
                {segments}
            </div>
        );
    }
}

export class Info extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            similar: [],
        };
    }
    componentDidMount() {
        if (!this.props.metadata || this.props.metadata.status !== "failure") {
            return;
        }
        let fragment = this.props.id, idx = fragment.indexOf(":");
        if (idx === -1) {
            return;
        }
        setTimeout(() => {
            let namespace = fragment.slice(0, idx);
            let segment = fragment.slice(idx + 1);
            fetch(APP_ROOT + "/-/info?namespace=" + encodeURIComponent(namespace) + "&segment=" + encodeURIComponent(segment))
                .then(function(response) {
                    return response.json()
                }).then(json => {
                    console.log('parsed json', json)
                    this.setState({
                        similar: json.similar,
                    });
                }).catch(function(ex) {
                    console.log('parsing failed', ex)
                });
        }, 1000);
    }
    render() {
        let fragment = this.props.id, idx = fragment.indexOf(":");
        if (idx !== -1) {
            fragment = fragment.slice(idx + 1);
        }
        const id = "segment:" + fragment;
        return (
            <div style={{display: "block", float: "right"}} onClick={(e) => e.stopPropagation()}>
                <span style={{opacity: 0.1}}>{this.state.similar.length > 0 ? "" + this.state.similar.length + " " : ""}</span>
                <a href={"#" + id}>§</a>
            </div>
        );
    }
}

export class Segment extends React.Component {
    static defaultProps = {
        metadata: {},
        segments: [],
    }
    constructor(props) {
        super(props);
        this.state = {
            collapsed: this.props.collapsed,
        };
    }
    componentDidMount() {
        if (this.props.scrollTo) {
            setTimeout(() => {
                this.node.scrollIntoView();
            }, 1000);
        }
    }
    render() {
        const status = this.props.metadata.status || "unknown";
        let fragment = this.props.id, idx = fragment.indexOf(":");
        if (idx !== -1) {
            fragment = fragment.slice(idx + 1);
        }
        const id = "segment:" + fragment;
        let box;
        if (this.state.collapsed) {
            box = <div className="segment-box">▶</div>;
        } else {
            box = <div className="segment-box">▼</div>;
        }
        return (
            <div className="segment" id={id} ref={el => this.node = el}>
                <div className={"segment-header segment-status-"+status + (this.props.scrollTo ? " segment-selected" : "")} onClick={() => this.setState({collapsed: !this.state.collapsed})}>
                    {box}<div className="segment-title">{this.props.metadata.name}<Info id={this.props.id} metadata={this.props.metadata} segments={this.props.segments} /></div>
                </div>
                {this.state.collapsed ? [] : <div className="segment-more">
                    {this.props.children}
                </div>}
            </div>
        );
    }
}
