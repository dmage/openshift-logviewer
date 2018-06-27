const path = require("path");

module.exports = {
    entry: ["core-js/fn/promise", "whatwg-fetch", "./src/index.js"],
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: ["babel-loader"],
            },
        ],
    },
    resolve: {
        extensions: ["*", ".js", ".jsx"],
    },
    output: {
        path: path.resolve(__dirname, "assets"),
        filename: "bundle.js",
    },
};
