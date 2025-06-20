const { nodeResolve } = require("@rollup/plugin-node-resolve");

module.exports = {
  input: "src/cli.js",
  output: [{ file: "bin/cli.js", format: "es" }],
  plugins: [
    nodeResolve({ resolveOnly: ["npm:@applura/ouroboros"] }),
  ],
};
