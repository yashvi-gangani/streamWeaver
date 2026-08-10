import express from "express";
import Busboy from "busboy";
import { streamUpload } from "../services/upload/streamUpload.js";

const router = express.Router();

router.post("/upload", async (req, res) => {
  try {
    const contentType = req.headers["content-type"];

    if (!contentType || !contentType.includes("multipart/form-data")) {
      return res.status(400).json({
        success: false,
        message: "Request must be multipart/form-data"
      });
    }

    const busboy = Busboy({
      headers: req.headers
    });

    let uploadResult = null;

    busboy.on("file", async (fieldname, file, info) => {
      const { filename } = info;

      try {
        uploadResult = await streamUpload(file, filename);
      } catch (error) {
        file.destroy(error);
      }
    });

    busboy.on("finish", () => {
      res.status(201).json({
        success: true,
        message: "File uploaded successfully",
        file: uploadResult
      });
    });

    busboy.on("error", (error) => {
      console.error("Busboy error:", error);

      res.status(500).json({
        success: false,
        message: "File upload failed"
      });
    });

    req.pipe(busboy);
  } catch (error) {
    console.error("Upload error:", error);

    res.status(500).json({
      success: false,
      message: "Unexpected upload error"
    });
  }
});

export default router;