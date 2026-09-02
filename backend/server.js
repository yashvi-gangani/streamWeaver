// StreamWeaver backend server
// week 1 = multipart streaming upload
// week 2 = etl transform stream that turns csv into json on the fly
// week 3 = sandboxed custom code execution + live progress over websocket
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const CsvToJsonStream = require("./csvToJsonStream");
const ApplyMappingStream = require("./applyMappingStream");
const { buildSandbox } = require("./sandboxRunner");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = 5000;
const PREVIEW_LIMIT = 1000; // we only keep first 1000 rows for preview, rest we just count

// this keeps track of every uploaded file so we can process it fully later
// key = fileId, value = { path, size }
const uploadedFiles = {};

app.use(cors());
app.use(express.json());

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

app.get("/", (req, res) => {
  res.send("StreamWeaver backend is running");
});

// upload route, this streams the file to disk first (week 1) and gives back a quick preview (week 2)
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const filePath = req.file.path;
  const fileId = req.file.filename; // we use the saved filename itself as the id
  const previewRows = [];
  let columns = [];
  let totalRows = 0;
  const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

  const fileStream = fs.createReadStream(filePath);
  const csvTransform = new CsvToJsonStream();

  fileStream.pipe(csvTransform);

  csvTransform.on("data", (rowObject) => {
    totalRows++;
    if (previewRows.length < PREVIEW_LIMIT) {
      previewRows.push(rowObject);
    }
    if (columns.length === 0 && csvTransform.headers) {
      columns = csvTransform.headers;
    }
  });

  csvTransform.on("end", () => {
    const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log("Memory used for preview (MB):", (endMemory - startMemory).toFixed(2));

    // keep the file on disk this time, week 3 needs to re-read it for full processing
    uploadedFiles[fileId] = { path: filePath, size: req.file.size };

    res.json({
      message: "File processed successfully",
      fileId: fileId,
      columns: columns,
      totalRows: totalRows,
      previewRows: previewRows,
      memoryUsedMB: (endMemory - startMemory).toFixed(2),
    });
  });

  csvTransform.on("error", (err) => {
    console.log("Error while processing file:", err);
    res.status(500).json({ message: "Error processing file" });
  });
});

// week 3, this is where the real full file processing happens with live progress
io.on("connection", (socket) => {
  console.log("A client connected:", socket.id);

  socket.on("start-processing", (data) => {
    const { fileId, mapping } = data;
    const fileInfo = uploadedFiles[fileId];

    if (!fileInfo) {
      socket.emit("processing-error", { message: "File not found, please upload again" });
      return;
    }

    console.log("Starting full processing for:", fileId);

    const sandbox = buildSandbox(mapping); // compiles any custom code once, reused for every row
    const startTime = Date.now();
    let bytesRead = 0;

    const fileStream = fs.createReadStream(fileInfo.path);
    const csvTransform = new CsvToJsonStream();
    const mappingTransform = new ApplyMappingStream(mapping, sandbox);

    fileStream.on("data", (chunk) => {
      bytesRead += chunk.length;
    });

    // this sends a progress update to the frontend every second
    const progressInterval = setInterval(() => {
      const secondsElapsed = (Date.now() - startTime) / 1000;
      const rowsPerSec = Math.round(mappingTransform.rowsProcessed / secondsElapsed) || 0;
      const percent = Math.min(100, Math.round((bytesRead / fileInfo.size) * 100));

      socket.emit("progress", {
        rowsProcessed: mappingTransform.rowsProcessed,
        rowsPerSec: rowsPerSec,
        percent: percent,
      });
    }, 1000);

    fileStream.pipe(csvTransform).pipe(mappingTransform);

    mappingTransform.on("finish", () => {
      clearInterval(progressInterval);
      const totalTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

      socket.emit("progress", {
        rowsProcessed: mappingTransform.rowsProcessed,
        rowsPerSec: Math.round(mappingTransform.rowsProcessed / totalTimeSeconds) || 0,
        percent: 100,
      });

      socket.emit("processing-complete", {
        totalRows: mappingTransform.rowsProcessed,
        timeTakenSeconds: totalTimeSeconds,
      });

      // cleanup, we dont need the file on disk anymore after full processing
      fs.unlink(fileInfo.path, () => {});
      delete uploadedFiles[fileId];
      sandbox.isolate.dispose(); // free up the sandbox memory
    });

    mappingTransform.on("error", (err) => {
      clearInterval(progressInterval);
      console.log("Error during processing:", err);
      socket.emit("processing-error", { message: "Something went wrong during processing" });
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`StreamWeaver backend listening on http://localhost:${PORT}`);
});
