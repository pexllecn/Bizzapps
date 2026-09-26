// Bundles each world in src/ into one classic script in assets/js/.
// Classic IIFE scripts, not ES modules, so the pages still open from file://.
import * as esbuild from "esbuild";

const entries = {
  "assets/js/worlds.js": "src/worlds.js",
};
const watch = process.argv.includes("--watch");

for (const [out, entry] of Object.entries(entries)) {
  const opts = {
    entryPoints: [entry], outfile: out, bundle: true, format: "iife",
    minify: true, target: ["es2019"], legalComments: "none", logLevel: "info",
  };
  if (watch) (await esbuild.context(opts)).watch();
  else await esbuild.build(opts);
}
