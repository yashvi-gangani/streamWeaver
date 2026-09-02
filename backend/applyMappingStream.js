// this stream takes row objects and applies the user's mapping rules to each one
// mapping rules can be a preset transform (uppercase/lowercase/capitalize) or custom sandboxed code
const { Transform } = require("stream");
const { runCustomCode } = require("./sandboxRunner");

class ApplyMappingStream extends Transform {
  constructor(mapping, sandbox, options) {
    super({ objectMode: true, ...options });
    this.mapping = mapping;
    this.sandbox = sandbox; // has isolate, context, compiledScripts
    this.rowsProcessed = 0;
  }

  // this small helper does the built in preset transforms
  applyPreset(value, transformType) {
    if (!value) return value;
    if (transformType === "uppercase") return value.toUpperCase();
    if (transformType === "lowercase") return value.toLowerCase();
    if (transformType === "capitalize") {
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }
    return value;
  }

  _transform(rowObject, encoding, callback) {
    const finalRow = {};

    for (const col of Object.keys(this.mapping)) {
      const rule = this.mapping[col];
      let value = rowObject[col];

      if (rule.transform === "custom" && this.sandbox.compiledScripts[col]) {
        try {
          value = runCustomCode(this.sandbox.context, this.sandbox.compiledScripts[col], value);
        } catch (err) {
          value = "ERROR"; // if the user code is broken or times out, mark it instead of crashing
        }
      } else {
        value = this.applyPreset(value, rule.transform);
      }

      const destinationKey = rule.destination || col;
      finalRow[destinationKey] = value;
    }

    this.rowsProcessed++;
    this.push(finalRow);
    callback();
  }
}

module.exports = ApplyMappingStream;
