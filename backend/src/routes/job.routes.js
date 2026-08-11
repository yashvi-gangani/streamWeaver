import express from "express";
import { getJob } from "../utils/jobStatus.js";

const router = express.Router();

router.get("/jobs/:jobId", (req, res) => {
  const { jobId } = req.params;

  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: "Job not found"
    });
  }

  return res.status(200).json({
    success: true,
    job
  });
});

export default router;