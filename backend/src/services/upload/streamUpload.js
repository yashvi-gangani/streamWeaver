import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";

const uploadDirectory = path.resolve("uploads");

export const streamUpload = async (
  inputStream,
  filename,
  onProgress
) => {
  await fs.promises.mkdir(uploadDirectory, { recursive: true });

  let bytesReceived = 0;

  inputStream.on("data", (chunk) => {
    bytesReceived += chunk.length;

    if (onProgress) {
      onProgress(bytesReceived);
    }
  });

  const safeFilename = `${Date.now()}-${path.basename(filename)}`;

  const filePath = path.join(uploadDirectory, safeFilename);

  const outputStream = fs.createWriteStream(filePath);

  await pipeline(inputStream, outputStream);

  return {
    filename: safeFilename,
    path: filePath,
    size: bytesReceived
  };
};