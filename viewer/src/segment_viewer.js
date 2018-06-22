import React from "react";
import interpretANSI from "./interpret_ansi";
import { filterGitHubGoLink, filterHighlight, filterHTML } from "./line_filters";

export class SegmentLine extends React.Component {
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

export class SegmentText extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            lines: ["loading..."],
        };
    }
    componentDidMount() {
        let request = new XMLHttpRequest();
        request.open('GET', '?resource=raw', true);
        request.setRequestHeader("Range", "bytes=" + this.props.offset + "-" + (this.props.offset + this.props.length - 1));
        request.onload = () => {
            if (request.status >= 200 && request.status < 400) {
                let response = request.responseText;
                const trail = response.search(/[^\n]*\r\x1b\[0?K$/);
                if (trail !== -1) {
                    response = response.slice(0, trail);
                }
                if (response.endsWith("\n")) {
                    response = response.slice(0, -1);
                }
                this.setState({
                    loaded: true,
                    lines: (response === "" && this.props.stripNewLine ? [] : response.split("\n")),
                });
            } else {
                this.setState({
                    loaded: true,
                    lines: ["unable to load data, request status code: " + request.status],
                });
            }
        };
        request.onerror = function() {
            // There was some sort of connection error
        };
        request.send();
    }
    render() {
        return (
            <ul>
                {this.state.lines.map((line, i) => {
                    return (
                        <SegmentLine key={i}>{line}</SegmentLine>
                    );
                })}
            </ul>
        );
    }
}

export class SegmentContent extends React.Component {
    render() {
        let offset = 0;
        let segments = [];
        this.props.segments.forEach((segment, i) => {
            if (offset < segment.offset) {
                segments.push(<SegmentText offset={this.props.offset + offset} length={segment.offset - offset} key={"gap-" + i} />);
            }
            segments.push(<Segment offset={this.props.offset + segment.offset} length={segment.length} metadata={segment.metadata} segments={segment.segments} key={"item-" + i} />);
            offset = segment.offset + segment.length;
        });
        if (offset < this.props.length) {
            segments.push(<SegmentText offset={this.props.offset + offset} length={this.props.length - offset} stripNewLine={true} key="tail" />);
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
                        <SegmentContent {...this.props} />
                    </div>
                </div>
            );
        }
    }
}
