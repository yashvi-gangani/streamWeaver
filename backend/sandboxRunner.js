// this file handles running the user's own javascript code safely
// isolated-vm runs the code in a totally separate v8 isolate, so it cannot touch our real server
const ivm = require("isolated-vm");

// this builds one isolate and compiles a script for every column that has custom code
function buildSandbox(mapping) {
  const isolate = new ivm.Isolate({ memoryLimit: 8 }); // only 8mb allowed for user code
  const context = isolate.createContextSync();
  const compiledScripts = {};

  for (const col in mapping) {
    const rule = mapping[col];
    if (rule.transform === "custom" && rule.customCode) {
      // we wrap the user code inside a function so "return" works properly
      const wrappedCode = `(function(value) { ${rule.customCode} })(value)`;
      compiledScripts[col] = isolate.compileScriptSync(wrappedCode);
    }
  }

  return { isolate, context, compiledScripts };
}

// this runs one compiled script for one cell value, with a timeout so it cannot hang forever
function runCustomCode(context, script, value) {
  context.global.setSync("value", value);
  const result = script.runSync(context, { timeout: 1000, copy: true });
  return result;
}

module.exports = { buildSandbox, runCustomCode };
