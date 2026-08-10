import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";

const uploadDirectory = path.resolve("uploads");

export const streamUpload = async (inputStream, filename) => {
  await fs.promises.mkdir(uploadDirectory, { recursive: true });

  const safeFilename = `${Date.now()}-${filename}`;
  const filePath = path.join(uploadDirectory, safeFilename);

  const outputStream = fs.createWriteStream(filePath);

  await pipeline(inputStream, outputStream);

  return {
    filename: safeFilename,
    path: filePath
  };
};