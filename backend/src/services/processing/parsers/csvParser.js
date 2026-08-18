import fs from "fs/promises";

export const parseCsvFile = async (filePath) => {
  const content = await fs.readFile(filePath, "utf8");

  if (!content.trim()) {
    throw new Error("CSV file is empty");
  }

  const lines = content
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error("CSV file must contain a header and at least one record");
  }

  const headers = lines[0]
    .split(",")
    .map((header) => header.trim());

  if (headers.some((header) => !header)) {
    throw new Error("CSV contains an empty header");
  }

  const records = lines.slice(1).map((line) => {
    const values = line.split(",");

    if (values.length !== headers.length) {
      throw new Error(
        "CSV row does not match the number of headers"
      );
    }

    return headers.reduce((record, header, index) => {
      record[header] = values[index].trim();
      return record;
    }, {});
  });

  return records;
};