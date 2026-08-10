import express from "express";

const router = express.Router();

// TODO: Member 1 implements streaming upload endpoint.

router.get("/status", (req, res) => {
  res.json({ module: "upload", status: "ready" });
});

export default router;
