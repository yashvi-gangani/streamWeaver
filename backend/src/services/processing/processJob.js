import { parseFile } from "./parsers/parseFile.js";

import {
  getJob,
  updateProcessingProgress,
  completeJob,
  failJob,
} from "../../utils/jobStatus.js";

import { emitProgress } from "../../utils/progressEmitter.js";
import { transformRecords } from "./transformRecords.js";
import { validateRecords } from "./validateRecords.js";

export const processJob = async (jobId, io) => {
  const job = getJob(jobId);

  if (!job) {
    throw new Error("Job not found");
  }

  if (job.status !== "processing") {
    throw new Error(`Job cannot be processed from status: ${job.status}`);
  }

  try {
    const records = await parseFile(job.path);

    const transformedRecords = transformRecords(records);

    const { validRecords, errors } = validateRecords(transformedRecords);

    const totalRecords = transformedRecords.length;
    const startTime = Date.now();

    let rowsProcessed = 0;

    for (const record of validRecords) {
      // Placeholder for future ETL transformation.
      // Transformation logic can be added here later.

      rowsProcessed++;

      const elapsedSeconds = (Date.now() - startTime) / 1000;

      const rowsPerSecond =
        elapsedSeconds > 0 ? Math.round(rowsProcessed / elapsedSeconds) : 0;

      const percent =
        totalRecords > 0
          ? Math.round((rowsProcessed / totalRecords) * 100)
          : 100;

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
