const path = require("path");

module.exports = {
    entry: {
        log: ["core-js/fn/promise", "whatwg-fetch", "./src/index.js"],
        similar: ["core-js/fn/promise", "whatwg-fetch", "./src/similar.js"],
    },
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
        filename: "[name].bundle.js",
    },
    optimization: {
        splitChunks: {
            cacheGroups: {
                commons: {
                    name: "commons",
                    chunks: "initial",
                    minChunks: 2,
                },
            },
        },
    },
};
