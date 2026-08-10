import express from "express";

const router = express.Router();

// TODO: Member 2/4 implements dataset preview, validation and result endpoints.

router.get("/status", (req, res) => {
  res.json({ module: "dataset", status: "ready" });
});

export default router;
