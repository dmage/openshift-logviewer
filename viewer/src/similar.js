import React from "react";
import ReactDOM from "react-dom";

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            error: null,
            similar: [],
        };
    }
    componentDidMount() {
        fetch(APP_ROOT + "/-/info?namespace=" + encodeURIComponent(namespace) + "&segment=" + encodeURIComponent(segment))
            .then(response => response.json())
            .then(json => {
                this.setState({
                    loaded: true,
                    similar: json.similar,
                });
            }).catch(err => {
                this.setState({
                    loaded: true,
                    error: err.toString(),
                });
            });
    }
    render() {
        if (!this.state.loaded) {
            return (
                <div>Loading...</div>
            );
        }
        if (this.state.error !== null) {
            return (
                <div>{this.state.error}</div>
            );
        }
        return (
            <div>
                <h1>Similar ({this.state.similar.length})</h1>
                <ul className="similar">
                {this.state.similar.map((x, i) => {
                    return <li key={i}><div>{x.flake ? [<span className="flake-marker">[flake]</span>, " "]: []}{x.namespace}</div><div><a href={APP_ROOT + "/" + x.namespace + "/#segment:" + x.segment}>{x.name}</a></div></li>;
                })}
                </ul>
            </div>
        );
        /*
        let selected = "";
        if (window.location.hash.startsWith("#segment:")) {
            selected = this.props.id + window.location.hash.slice("#segment".length);
        }
        return (
            <div className={this.state.chopLongLines ? "chop-long-lines" : ""}>
                <div className="global-buttons"><CheckBox checked={this.state.chopLongLines} onChange={checked => this.setState({chopLongLines: checked})}>-S</CheckBox></div>
                <a href={APP_ROOT + "/"}>Home</a>
                <Content {...this.props.segment} id={this.props.id} selected={selected} dataSource={httpDataSource("?resource=raw")} />
            </div>
        );
        */
    }
}

ReactDOM.render(
    <App segment={segment} id={namespace} />,
    document.getElementById('root')
);
