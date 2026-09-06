// this file just turns row objects into csv lines and writes them to disk
// kept simple, handles commas and quotes inside values so the csv doesn't break

function escapeCsvValue(value) {
  const stringValue = value === undefined || value === null ? "" : String(value);
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return '"' + stringValue.replace(/"/g, '""') + '"';
  }
  return stringValue;
}

function rowToCsvLine(row, columnNames) {
  return columnNames.map((col) => escapeCsvValue(row[col])).join(",");
}

module.exports = { rowToCsvLine, escapeCsvValue };