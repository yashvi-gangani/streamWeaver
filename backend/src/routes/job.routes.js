import express from "express";

import {
  getJob,
  updateJob,
  JOB_STATUS,
  updateProcessingProgress,
  completeJob,
  failJob,
} from "../utils/jobStatus.js";

import { processJob } from "../services/processing/processJob.js";

const router = express.Router();

router.get("/jobs/:jobId", (req, res) => {
  const { jobId } = req.params;

  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: "Job not found",
    });
  }

  return res.status(200).json({
    success: true,
    job,
  });
});

router.post("/jobs/:jobId/process", async (req, res) => {
  const { jobId } = req.params;

  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: "Job not found",
    });
  }

  if (job.status !== JOB_STATUS.UPLOADED) {
    return res.status(409).json({
      success: false,
      jobId,
      message: `Job cannot be processed from status: ${job.status}`,
    });
  }

  updateJob(jobId, {
    status: JOB_STATUS.PROCESSING,
    percent: 0,
    rowsProcessed: 0,
    rowsPerSecond: 0,
    errors: [],
  });

  processJob(jobId).catch((error) => {
    console.error("Processing error:", error);
  });

  return res.status(202).json({
    success: true,
    message: "Processing started",
    jobId,
  });
});

router.patch("/jobs/:jobId/progress", (req, res) => {
  const { jobId } = req.params;

  const { rowsProcessed, rowsPerSecond, percent } = req.body;

  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: "Job not found",
    });
  }

  if (job.status !== JOB_STATUS.PROCESSING) {
    return res.status(409).json({
      success: false,
      jobId,
      message: `Job is not processing. Current status: ${job.status}`,
    });
  }

  if (
    typeof rowsProcessed !== "number" ||
    typeof rowsPerSecond !== "number" ||
    typeof percent !== "number"
  ) {
    return res.status(400).json({
      success: false,
      jobId,
      message: "rowsProcessed, rowsPerSecond and percent must be numbers",
    });
  }

  const updatedJob = updateProcessingProgress(
    jobId,
    rowsProcessed,
    rowsPerSecond,
    percent,
  );

  return res.status(200).json({
    success: true,
    message: "Processing progress updated",
    job: updatedJob,
  });
});

router.patch("/jobs/:jobId/complete", (req, res) => {
  const { jobId } = req.params;

  const { rowsProcessed, rowsPerSecond } = req.body;

  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: "Job not found",
    });
  }

  if (job.status !== JOB_STATUS.PROCESSING) {
    return res.status(409).json({
      success: false,
      jobId,
      message: `Job is not processing. Current status: ${job.status}`,
    });
  }

  const updatedJob = completeJob(jobId, rowsProcessed || 0, rowsPerSecond || 0);

  return res.status(200).json({
    success: true,
    message: "Processing completed",
    job: updatedJob,
  });
});

router.patch("/jobs/:jobId/fail", (req, res) => {
  const { jobId } = req.params;
  const { error } = req.body;

  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: "Job not found",
    });
  }

  if (!error) {
    return res.status(400).json({
      success: false,
      jobId,
      message: "Error message is required",
    });
  }

  const updatedJob = failJob(jobId, error);

  return res.status(200).json({
    success: true,
    message: "Processing failed",
    job: updatedJob,
  });
});

export default router;
