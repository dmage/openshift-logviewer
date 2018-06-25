import React from "react";
import ReactDOM from "react-dom";
import { Content, httpDataSource } from "./segment_viewer";

class CheckBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            checked: this.props.checked,
        };
    }
    onChange(event) {
        this.setState({
            checked: event.target.checked,
        });
        this.props.onChange(event.target.checked);
    }
    render() {
        return (
            <label className="checkbox"><input type="checkbox" checked={this.state.checked} onChange={(event) => this.onChange(event)} /><span>{this.props.children}</span></label>
        );
    }
}

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            chopLongLines: false,
        };
    }
    render() {
        return (
            <div className={this.state.chopLongLines ? "chop-long-lines" : ""}>
                <div className="global-buttons"><CheckBox checked={this.state.chopLongLines} onChange={checked => this.setState({chopLongLines: checked})}>-S</CheckBox></div>
                <a href={APP_ROOT + "/"}>Home</a>
                <Content {...this.props.segment} dataSource={httpDataSource} />
            </div>
        );
    }
}

ReactDOM.render(
    <App segment={segment} />,
    document.getElementById('root')
);
