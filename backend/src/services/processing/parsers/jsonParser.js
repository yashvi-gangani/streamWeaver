import fs from "fs/promises";

export const parseJsonFile = async (filePath) => {
  const content = await fs.readFile(filePath, "utf8");

  if (!content.trim()) {
    throw new Error("JSON file is empty");
  }

  let data;

  try {
    data = JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON file");
  }

  if (!Array.isArray(data)) {
    throw new Error("JSON file must contain an array of records");
  }

  return data;
};