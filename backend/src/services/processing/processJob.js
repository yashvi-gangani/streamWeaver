import fs from "fs";
import readline from "readline";

import {
  getJob,
  updateProcessingProgress,
  completeJob,
  failJob,
} from "../../utils/jobStatus.js";

import { emitProgress } from "../../utils/progressEmitter.js";

export const processJob = async (jobId, io) => {
  const job = getJob(jobId);

  if (!job) {
    throw new Error("Job not found");
  }

  if (job.status !== "processing") {
    throw new Error(`Job cannot be processed from status: ${job.status}`);
  }

  try {
    const fileStream = fs.createReadStream(job.path);

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let rowsProcessed = 0;
    let bytesProcessed = 0;

    const startTime = Date.now();

    for await (const line of rl) {
      if (!line.trim()) {
        continue;
      }

      rowsProcessed++;

      bytesProcessed += Buffer.byteLength(line, "utf8") + 1;

      const elapsedSeconds = (Date.now() - startTime) / 1000;

      const rowsPerSecond =
        elapsedSeconds > 0 ? Math.round(rowsProcessed / elapsedSeconds) : 0;

      const percent =
        job.fileSize > 0
          ? Math.min(100, Math.round((bytesProcessed / job.fileSize) * 100))
          : 0;

      const progress = updateProcessingProgress(
        jobId,
        rowsProcessed,
        rowsPerSecond,
        percent,
      );

      if (io) {
        emitProgress(io, jobId, {
          status: progress.status,
          rowsProcessed: progress.rowsProcessed,
          rowsPerSecond: progress.rowsPerSecond,
          percent: progress.percent,
        });
      }
    }

    const elapsedSeconds = (Date.now() - startTime) / 1000;

    const rowsPerSecond =
      elapsedSeconds > 0 ? Math.round(rowsProcessed / elapsedSeconds) : 0;

    const completedJob = completeJob(jobId, rowsProcessed, rowsPerSecond);

    if (io) {
      emitProgress(io, jobId, {
        status: completedJob.status,
        rowsProcessed: completedJob.rowsProcessed,
        rowsPerSecond: completedJob.rowsPerSecond,
        percent: 100,
      });
    }

    return completedJob;
  } catch (error) {
    const failedJob = failJob(jobId, error.message);

    if (io && failedJob) {
      emitProgress(io, jobId, {
        status: failedJob.status,
        percent: failedJob.percent,
        errors: failedJob.errors,
      });
    }

    throw error;
  }
};
