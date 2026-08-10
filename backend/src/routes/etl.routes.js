import express from "express";

const router = express.Router();

// TODO: Member 2 implements ETL processing endpoints.

router.get("/status", (req, res) => {
  res.json({ module: "etl", status: "ready" });
});

export default router;
