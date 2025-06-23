const { nodeResolve } = require("@rollup/plugin-node-resolve");

module.exports = {
  input: "index.js",
  output: {
    file: "dist/v2.js",
  },
  plugins: [nodeResolve()],
};
