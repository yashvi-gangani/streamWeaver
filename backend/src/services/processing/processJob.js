import fs from "fs";
import readline from "readline";

import {
  getJob,
  updateProcessingProgress,
  completeJob,
  failJob
} from "../../utils/jobStatus.js";

export const processJob = async (jobId) => {
  const job = getJob(jobId);

  if (!job) {
    throw new Error("Job not found");
  }

  if (job.status !== "processing") {
    throw new Error(
      `Job cannot be processed from status: ${job.status}`
    );
  }

  try {
    const fileStream = fs.createReadStream(job.path);

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let rowsProcessed = 0;
    const startTime = Date.now();

    for await (const line of rl) {
      if (!line.trim()) {
        continue;
      }

      rowsProcessed++;

      const elapsedSeconds =
        (Date.now() - startTime) / 1000;

      const rowsPerSecond =
        elapsedSeconds > 0
          ? Math.round(rowsProcessed / elapsedSeconds)
          : 0;

      updateProcessingProgress(
        jobId,
        rowsProcessed,
        rowsPerSecond,
        0
      );
    }

    const elapsedSeconds =
      (Date.now() - startTime) / 1000;

    const rowsPerSecond =
      elapsedSeconds > 0
        ? Math.round(rowsProcessed / elapsedSeconds)
        : 0;

    return completeJob(
      jobId,
      rowsProcessed,
      rowsPerSecond
    );
  } catch (error) {
    failJob(jobId, error.message);
    throw error;
  }
};