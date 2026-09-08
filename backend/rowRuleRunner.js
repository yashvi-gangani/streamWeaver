// this runs "whole row" rules safely, used by the natural language rule builder
// different from sandboxRunner.js which only sees one column's value, this sees the full row
// so it can do things like "if age < 18 mark as minor" which needs to read one field and set another
const ivm = require("isolated-vm");

// only allow the simple row-based JavaScript that our rule builder is designed to create
function validateRowRuleCode(code) {
  if (typeof code !== "string" || !code.trim()) {
    throw new Error("Row rule code must be a non-empty string");
  }

  const dangerousPatterns = [
    /\brequire\s*\(/,
    /\bprocess\b/,
    /\bglobal\b/,
    /\beval\s*\(/,
    /\bFunction\s*\(/,
    /\bimport\b/,
    /\bconstructor\b/,
    /\bprototype\b/,
    /__proto__/,
  ];

  if (dangerousPatterns.some((pattern) => pattern.test(code))) {
    throw new Error("Row rule contains unsupported JavaScript");
  }

  if (!/\breturn\b/.test(code)) {
    throw new Error("Row rule must return a value");
  }

  return code;
}

// builds one isolate and compiles every approved row rule once, reused for every row
function buildRowRuleSandbox(rowRules) {
  const isolate = new ivm.Isolate({ memoryLimit: 8 });
  const context = isolate.createContextSync();

  try {
    const compiledRules = rowRules.map((rule) => {
      if (!rule || typeof rule.targetField !== "string") {
        throw new Error("Invalid row rule target field");
      }

      const code = validateRowRuleCode(rule.code);
      const wrappedCode = `(function(row) { ${code} })(row)`;

      return {
        targetField: rule.targetField,
        script: isolate.compileScriptSync(wrappedCode),
      };
    });

    return { isolate, context, compiledRules };
  } catch (err) {
    isolate.dispose();
    throw err;
  }
}

// runs every rule against one row, returns a new row object with the extra/updated fields
function applyRowRules(sandbox, row) {
  if (sandbox.compiledRules.length === 0) return row;

  const updatedRow = { ...row };

  for (const rule of sandbox.compiledRules) {
    try {
      sandbox.context.global.setSync("row", updatedRow, { copy: true });

      const result = rule.script.runSync(sandbox.context, {
        timeout: 1000,
        copy: true,
      });

      updatedRow[rule.targetField] = result;
    } catch (err) {
      updatedRow[rule.targetField] = "RULE_ERROR";
    }
  }

  return updatedRow;
}

module.exports = {
  buildRowRuleSandbox,
  applyRowRules,
};