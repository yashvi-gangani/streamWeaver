import path from "path";

import { parseCsvFile } from "./csvParser.js";
import { parseJsonFile } from "./jsonParser.js";

export const parseFile = async (filePath) => {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".csv":
      return parseCsvFile(filePath);

    case ".json":
      return parseJsonFile(filePath);

    default:
      throw new Error(
        `Unsupported processing file type: ${extension || "unknown"}`
      );
  }
};