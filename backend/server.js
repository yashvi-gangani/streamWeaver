// StreamWeaver backend server
// week 1 = multipart streaming upload
// week 2 = etl transform stream that turns csv into json on the fly
// week 3 = websocket foundation for live processing updates

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const CsvToJsonStream = require("./csvToJsonStream");

const app = express();
const httpServer = http.createServer(app);

const PORT = 5000;
const PREVIEW_LIMIT = 1000;

// -----------------------------
// WebSocket / Socket.IO setup
// -----------------------------

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

// -----------------------------
// Express setup
// -----------------------------

app.use(cors());
app.use(express.json());

// -----------------------------
// WebSocket connections
// -----------------------------

io.on("connection", (socket) => {
  console.log("WebSocket client connected:", socket.id);

  socket.on("join-processing-job", (jobId) => {
    if (!jobId) {
      return;
    }

    socket.join(jobId);

    console.log(
      `Socket ${socket.id} joined processing job: ${jobId}`
    );
  });

  socket.on("disconnect", () => {
    console.log("WebSocket client disconnected:", socket.id);
  });
});

// -----------------------------
// Multer storage
// -----------------------------

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "uploads"));
  },

  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage: storage });

// -----------------------------
// Health / test route
// -----------------------------

app.get("/", (req, res) => {
  res.send("StreamWeaver backend is running");
});

// -----------------------------
// Upload route
// -----------------------------

app.post("/upload", upload.single("file"), (req, res) => {
  const jobId = Date.now().toString();

  if (!req.file) {
    return res.status(400).json({
      message: "No file uploaded",
    });
  }

  const filePath = req.file.path;
  const previewRows = [];
  let columns = [];
  let totalRows = 0;

  const startMemory =
    process.memoryUsage().heapUsed / 1024 / 1024;

  const fileStream = fs.createReadStream(filePath);
  const csvTransform = new CsvToJsonStream();

  // Tell the client that processing has started
  io.emit("processing-progress", {
    jobId,
    status: "processing",
    rowsProcessed: 0,
    percent: 0,
  });

  fileStream.pipe(csvTransform);

  csvTransform.on("data", (rowObject) => {
    totalRows++;

    if (previewRows.length < PREVIEW_LIMIT) {
      previewRows.push(rowObject);
    }

    if (columns.length === 0 && csvTransform.headers) {
      columns = csvTransform.headers;
    }

    // Send progress periodically instead of on every row
    if (totalRows % 100 === 0) {
      io.emit("processing-progress", {
        jobId,
        status: "processing",
        rowsProcessed: totalRows,
        percent: 0,
      });
    }
  });

  csvTransform.on("end", () => {
    const endMemory =
      process.memoryUsage().heapUsed / 1024 / 1024;

    console.log(
      "Memory used for this upload (MB):",
      (endMemory - startMemory).toFixed(2)
    );

    // Tell client processing is complete
    io.emit("processing-progress", {
      jobId,
      status: "completed",
      rowsProcessed: totalRows,
      percent: 100,
    });

    fs.unlink(filePath, () => {});

    res.json({
      message: "File processed successfully",
      jobId,
      columns: columns,
      totalRows: totalRows,
      previewRows: previewRows,
      memoryUsedMB: (
        endMemory - startMemory
      ).toFixed(2),
    });
  });

  csvTransform.on("error", (err) => {
    console.log("Error while processing file:", err);

    io.emit("processing-progress", {
  jobId,
  status: "failed",
  error: err.message,
});

    if (!res.headersSent) {
      res.status(500).json({
        message: "Error processing file",
        jobId,
      });
    }
  });
});

// -----------------------------
// Start HTTP + WebSocket server
// -----------------------------

httpServer.listen(PORT, () => {
  console.log(
    `StreamWeaver backend listening on http://localhost:${PORT}`
  );

  console.log(
    `WebSocket server running on ws://localhost:${PORT}`
  );
});