import React from "react";
import interpretANSI from "./interpret_ansi";
import { filterGitHubGoLink, filterHighlight, filterHTML } from "./line_filters";

export function httpDataSource(offset, length) {
    return new Promise((resolve, reject) => {
        let request = new XMLHttpRequest();
        request.open('GET', '?resource=raw', true);
        request.setRequestHeader("Range", "bytes=" + offset + "-" + (offset + length - 1));
        request.onload = () => {
            if (request.status >= 200 && request.status < 400) {
                resolve(request.responseText);
            } else {
                reject(new Error("unable to load data, request status code: " + request.status));
            }
        };
        request.onerror = function() {
            reject(new Error("connection error"));
        };
        request.send();
    });
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
            lines: ["loading..."],
        };
    }
    componentDidMount() {
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
                this.setState({
                    loaded: true,
                    lines: [err.toString()],
                });
            });
    }
    render() {
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
            segments.push(<Segment
                {...segment}
                dataSource={(off, len) => this.props.dataSource(segment.offset + off, len)}
                key={"item-" + i} />);
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

export class Segment extends React.Component {
    static defaultProps = {
        metadata: {},
        segments: [],
    }
    constructor(props) {
        super(props);
        this.state = {
            collapsed: true,
        };
    }
    render() {
        let status = this.props.metadata.status || "unknown";
        if (this.state.collapsed) {
            return (
                <div className="segment">
                    <div className={"segment-header segment-status-"+status} onClick={() => this.setState({collapsed: false})}>
                        <div className="segment-box">▶</div><div className="segment-title">{this.props.metadata.name}</div>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="segment">
                    <div className={"segment-header segment-status-"+status} onClick={() => this.setState({collapsed: true})}>
                        <div className="segment-box">▼</div><div className="segment-title">{this.props.metadata.name}</div>
                    </div>
                    <div className="segment-more">
                        <Content {...this.props} />
                    </div>
                </div>
            );
        }
    }
}
