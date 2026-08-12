import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";

const uploadDirectory = path.resolve("uploads");

export const streamUpload = async (
  inputStream,
  filename,
  onProgress,
  maxFileSize
) => {
  await fs.promises.mkdir(uploadDirectory, { recursive: true });

  let bytesReceived = 0;
  let sizeLimitExceeded = false;

  inputStream.on("data", (chunk) => {
    bytesReceived += chunk.length;

    if (maxFileSize && bytesReceived > maxFileSize) {
      sizeLimitExceeded = true;
    }

    if (onProgress) {
      onProgress(bytesReceived);
    }
  });

  const safeFilename = `${Date.now()}-${path.basename(filename)}`;

  const filePath = path.join(uploadDirectory, safeFilename);

  const outputStream = fs.createWriteStream(filePath);

  try {
    await pipeline(inputStream, outputStream);
  } catch (error) {
    await fs.promises.rm(filePath, { force: true });
    throw error;
  }

  if (sizeLimitExceeded) {
    await fs.promises.rm(filePath, { force: true });

    const error = new Error("File size exceeds the maximum allowed limit");
    error.code = "FILE_TOO_LARGE";

    throw error;
  }

  return {
    filename: safeFilename,
    path: filePath,
    size: bytesReceived
  };
};