const { nodeResolve } = require("@rollup/plugin-node-resolve");

module.exports = {
  output: {
    file: "dist/v4.js",
  },
  plugins: [nodeResolve()],
};
