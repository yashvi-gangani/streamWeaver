import express from "express";
import Busboy from "busboy";
import path from "path";
import crypto from "crypto";

import { streamUpload } from "../services/upload/streamUpload.js";
import { emitProgress } from "../utils/progressEmitter.js";

import { createJob, updateJob, JOB_STATUS } from "../utils/jobStatus.js";

const router = express.Router();

const ALLOWED_EXTENSIONS = new Set([".csv", ".json"]);

const ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "application/json",
  "text/json",
  "application/octet-stream",
]);

const MAX_FILE_SIZE = 100 * 1024 * 1024;

router.post("/upload", async (req, res) => {
  const jobId = crypto.randomUUID();

  createJob(jobId);

  try {
    const contentType = req.headers["content-type"];

    if (!contentType || !contentType.includes("multipart/form-data")) {
      updateJob(jobId, {
        status: JOB_STATUS.FAILED,
        errors: ["Request must be multipart/form-data"],
      });

      return res.status(400).json({
        success: false,
        jobId,
        message: "Request must be multipart/form-data",
      });
    }

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
    });

    let uploadPromise = null;
    let fileFound = false;

    busboy.on("file", (fieldname, file, info) => {
      if (fileFound) {
        file.resume();
        return;
      }

      fileFound = true;

      file.on("limit", () => {
        updateJob(jobId, {
          status: JOB_STATUS.FAILED,
          errors: ["File size exceeds the maximum allowed limit"],
        });
      });

      const { filename, mimeType } = info;

      const extension = path.extname(filename).toLowerCase();

      if (!ALLOWED_EXTENSIONS.has(extension)) {
        file.resume();

        updateJob(jobId, {
          status: JOB_STATUS.FAILED,
          errors: [`Unsupported file type: ${extension || "unknown"}`],
        });

        return;
      }

      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        file.resume();

        updateJob(jobId, {
          status: JOB_STATUS.FAILED,
          errors: [`Unsupported MIME type: ${mimeType}`],
        });

        return;
      }

      updateJob(jobId, {
        status: JOB_STATUS.UPLOADING,
        filename,
      });

      uploadPromise = streamUpload(
        file,
        filename,
        (bytesReceived) => {
          updateJob(jobId, {
            status: JOB_STATUS.UPLOADING,
            fileSize: bytesReceived,
            bytesReceived,
          });

          emitProgress(req.app.get("io"), jobId, {
            status: JOB_STATUS.UPLOADING,
            bytesReceived,
          });
        },
        MAX_FILE_SIZE,
      );
    });

    busboy.on("finish", async () => {
      try {
        if (!fileFound) {
          updateJob(jobId, {
            status: JOB_STATUS.FAILED,
            errors: ["No file was uploaded"],
          });

          return res.status(400).json({
            success: false,
            jobId,
            message: "No file uploaded",
          });
        }

        if (!uploadPromise) {
          const job = updateJob(jobId, {
            status: JOB_STATUS.FAILED,
          });

          return res.status(400).json({
            success: false,
            jobId,
            message: job?.errors?.[0] || "File validation failed",
          });
        }

        const result = await uploadPromise;

        const updatedJob = updateJob(jobId, {
          status: JOB_STATUS.UPLOADED,
          filename: result.filename,
          fileSize: result.size,
        });

        return res.status(201).json({
          success: true,
          message: "File uploaded successfully",
          jobId,
          file: {
            filename: result.filename,
            size: result.size,
          },
          status: updatedJob.status,
        });
      } catch (error) {
        console.error("Upload processing error:", error);

        updateJob(jobId, {
          status: JOB_STATUS.FAILED,
          errors: [error.message],
        });

        if (error.code === "FILE_TOO_LARGE") {
          return res.status(413).json({
            success: false,
            jobId,
            message: "File size exceeds the maximum allowed limit",
            maxFileSize: "100MB",
          });
        }

        return res.status(500).json({
          success: false,
          jobId,
          message: "File upload failed",
        });
      }
    });

    busboy.on("error", (error) => {
      console.error("Busboy error:", error);

      updateJob(jobId, {
        status: JOB_STATUS.FAILED,
        errors: [error.message],
      });

      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          jobId,
          message: "File upload failed",
        });
      }
    });

    req.pipe(busboy);
  } catch (error) {
    console.error("Upload error:", error);

    updateJob(jobId, {
      status: JOB_STATUS.FAILED,
      errors: [error.message],
    });

    return res.status(500).json({
      success: false,
      jobId,
      message: "Unexpected upload error",
    });
  }
});

export default router;
