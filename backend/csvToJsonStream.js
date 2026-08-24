// this file has our own custom transform stream, we are not using any csv library for this
// this reads the file piece by piece so big files dont crash the ram
const { Transform } = require("stream");

class CsvToJsonStream extends Transform {
  constructor(options) {
    super({ objectMode: true, ...options });
    this.leftOver = ""; // this holds the last incomplete line from previous chunk
    this.headers = null; // will store column names from first line
    this.rowCount = 0; // total rows converted so far
  }

  // this function runs every time a new chunk of the file arrives
  _transform(chunk, encoding, callback) {
    const data = this.leftOver + chunk.toString();
    const lines = data.split("\n");

    // last line might be incomplete, save it for next chunk
    this.leftOver = lines.pop();

    for (let line of lines) {
      line = line.trim();
      if (!line) continue; // skip empty lines

      if (!this.headers) {
        // first non empty line is the header row
        this.headers = line.split(",").map((h) => h.trim());
        continue;
      }

      const values = line.split(",");
      const rowObject = {};
      for (let i = 0; i < this.headers.length; i++) {
        rowObject[this.headers[i]] = values[i] ? values[i].trim() : "";
      }
      this.rowCount++;
      this.push(rowObject); // send this row object to the next stream
    }

    callback();
  }

  // this runs once when the file has fully ended
  _flush(callback) {
    if (this.leftOver && this.leftOver.trim() && this.headers) {
      const values = this.leftOver.split(",");
      const rowObject = {};
      for (let i = 0; i < this.headers.length; i++) {
        rowObject[this.headers[i]] = values[i] ? values[i].trim() : "";
      }
      this.rowCount++;
      this.push(rowObject);
    }
    callback();
  }
}

module.exports = CsvToJsonStream;
