const { nodeResolve } = require("@rollup/plugin-node-resolve");

module.exports = {
  output: {
    file: "dist/v2.js",
  },
  plugins: [nodeResolve()],
};
