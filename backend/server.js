require("dotenv").config();

// StreamWeaver backend server
// week 1 = multipart streaming upload
// week 2 = etl transform stream that turns csv into json on the fly
// week 3 = sandboxed custom code execution + live progress over websocket
// week 4 = mongodb bulk insertion + error handling for bad rows
// extra = duplicate removal, live column stats, failed rows csv export
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const { Server } = require("socket.io");

const CsvToJsonStream = require("./csvToJsonStream");
const ApplyMappingStream = require("./applyMappingStream");
const { buildSandbox } = require("./sandboxRunner");
const { connectToDatabase, getCollection, getJobsCollection } = require("./db");
const { calculateQualityScore } = require("./qualityScore");
const { createStatsTracker, updateStats, getStatsSnapshot } = require("./columnStats");
const { rowToCsvLine } = require("./csvWriter");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = 5000;
const PREVIEW_LIMIT = 1000; // we only keep first 1000 rows for preview, rest we just count
const BATCH_SIZE = 5000; // how many rows we buffer before writing to mongodb at once
const MAX_FAILED_SAMPLE = 50; // we only send a sample of failed rows back to the frontend, not all of them

// connect to mongodb once when the server boots up
connectToDatabase();

// this keeps track of every uploaded file so we can process it fully later
// key = fileId, value = { path, size }
const uploadedFiles = {};

// this is where we save the exported failed-rows csv files so they can be downloaded later
const FAILED_EXPORTS_DIR = path.join(__dirname, "failed_exports");
if (!fs.existsSync(FAILED_EXPORTS_DIR)) {
  fs.mkdirSync(FAILED_EXPORTS_DIR);
}

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

// this feeds the job history dashboard on the frontend
app.get("/jobs", async (req, res) => {
  const jobsCollection = getJobsCollection();

  if (!jobsCollection) {
    return res.json({ jobs: [], databaseConnected: false });
  }

  try {
    const jobs = await jobsCollection.find().sort({ startedAt: -1 }).limit(50).toArray();
    res.json({ jobs: jobs, databaseConnected: true });
  } catch (err) {
    console.log("Error fetching jobs:", err.message);
    res.status(500).json({ message: "Could not fetch job history" });
  }
});

// lets the user download every failed row from a finished job as a real csv file
app.get("/download-failed/:jobId", (req, res) => {
  const failedFilePath = path.join(__dirname, "failed_exports", `${req.params.jobId}.csv`);

  if (!fs.existsSync(failedFilePath)) {
    return res.status(404).json({ message: "No failed rows file found for this job" });
  }

  res.download(failedFilePath, "failed_rows.csv");
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
    uploadedFiles[fileId] = { path: filePath, size: req.file.size, originalName: req.file.originalname };

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
    const { fileId, mapping, dedupeColumn } = data; // dedupeColumn is optional, e.g. "email"
    const fileInfo = uploadedFiles[fileId];

    if (!fileInfo) {
      socket.emit("processing-error", { message: "File not found, please upload again" });
      return;
    }

    console.log("Starting full processing for:", fileId, dedupeColumn ? `(dedupe by ${dedupeColumn})` : "");

    const sandbox = buildSandbox(mapping); // compiles any custom code once, reused for every row
    const startTime = Date.now();
    let bytesRead = 0;

    const collection = getCollection(); // will be null if mongodb is not connected
    const jobsCollection = getJobsCollection();
    const jobId = fileId; // reusing the fileId as the job id keeps things simple

    // create a job history record straight away, marked as still processing
    if (jobsCollection) {
      jobsCollection
        .insertOne({
          jobId: jobId,
          fileName: fileInfo.originalName,
          status: "processing",
          startedAt: new Date(),
        })
        .catch((err) => console.log("Could not create job record:", err.message));
    }

    // week 4 bookkeeping
    let insertBuffer = []; // rows waiting to be written to mongodb
    let insertedCount = 0; // how many rows actually made it into the database
    let failedCount = 0; // how many rows failed validation
    let failedRowsSample = []; // small sample of failed rows to show in the ui
    let rowNumber = 0;

    // extra bookkeeping just for the data quality score and duplicate removal
    let duplicateCount = 0;
    let emptyCellCount = 0;
    let totalCells = 0;
    const seenKeys = new Set(); // stores either a full row hash or a single dedupe column value

    // live streaming statistics, one tracker per destination column
    const destinationColumns = Object.values(mapping).map((rule) => rule.destination);
    const statsTracker = createStatsTracker(destinationColumns);

    // this writes every failed row to a real csv file on disk, so it can be downloaded in full later
    const failedFilePath = path.join(FAILED_EXPORTS_DIR, `${jobId}.csv`);
    const failedFileStream = fs.createWriteStream(failedFilePath);
    failedFileStream.write(destinationColumns.join(",") + "\n");

    const fileStream = fs.createReadStream(fileInfo.path);
    const csvTransform = new CsvToJsonStream();
    const mappingTransform = new ApplyMappingStream(mapping, sandbox);

    // this checks if a row is bad, either a custom code error or an empty required value
    function isRowInvalid(row) {
      return Object.values(row).some((value) => value === "ERROR" || value === "" || value === undefined);
    }

    // this makes a short fingerprint of a row so we can spot exact duplicates cheaply
    function hashRow(row) {
      return crypto.createHash("md5").update(JSON.stringify(row)).digest("hex");
    }

    // this writes whatever is in the buffer to mongodb, then empties the buffer
    async function flushBuffer() {
      if (insertBuffer.length === 0) return;
      const batch = insertBuffer;
      insertBuffer = [];

      if (!collection) return; // mongodb not connected, just skip saving

      try {
        await collection.insertMany(batch, { ordered: false });
        insertedCount += batch.length;
      } catch (err) {
        console.log("Mongo bulk insert error:", err.message);
      }
    }

    // IMPORTANT: a transform stream stops accepting new data once its own internal
    // output buffer gets full (16 objects by default) if nobody reads that output.
    // here we actually use that output now, to validate the row and buffer it for mongodb
    mappingTransform.on("data", (row) => {
      rowNumber++;

      // quality score + live stats bookkeeping, done for every row regardless of pass/fail
      const values = Object.values(row);
      totalCells += values.length;
      emptyCellCount += values.filter((value) => value === "" || value === undefined).length;
      updateStats(statsTracker, row);

      // if a dedupe column was chosen, key on just that value, otherwise key on the whole row
      const dedupeKey = dedupeColumn ? row[dedupeColumn] : hashRow(row);
      const isDuplicate = seenKeys.has(dedupeKey);

      if (isDuplicate) {
        duplicateCount++;
        // only actually drop the row if the user turned on duplicate removal for a column
        if (dedupeColumn) {
          return; // skip this row entirely, its not saved and not counted as failed either
        }
      } else {
        seenKeys.add(dedupeKey);
      }

      if (isRowInvalid(row)) {
        failedCount++;
        failedFileStream.write(rowToCsvLine(row, destinationColumns) + "\n");
        if (failedRowsSample.length < MAX_FAILED_SAMPLE) {
          failedRowsSample.push({ rowNumber: rowNumber, data: row });
        }
        return;
      }

      insertBuffer.push(row);
      if (insertBuffer.length >= BATCH_SIZE) {
        flushBuffer(); // fires every 5000 good rows, we dont wait for it to keep the stream moving
      }
    });

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
        failedCount: failedCount,
        duplicateCount: duplicateCount,
        columnStats: getStatsSnapshot(statsTracker, mappingTransform.rowsProcessed),
      });
    }, 1000);

    fileStream.pipe(csvTransform).pipe(mappingTransform);

    mappingTransform.on("finish", async () => {
      clearInterval(progressInterval);
      await flushBuffer(); // write out whatever is left in the buffer, even if under 5000
      failedFileStream.end();

      const totalTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

      // work out the data quality score now that we know the final counts
      const qualityStats = calculateQualityScore({
        totalRows: mappingTransform.rowsProcessed,
        failedCount: failedCount,
        duplicateCount: duplicateCount,
        emptyCellCount: emptyCellCount,
        totalCells: totalCells,
      });

      const finalColumnStats = getStatsSnapshot(statsTracker, mappingTransform.rowsProcessed);

      socket.emit("progress", {
        rowsProcessed: mappingTransform.rowsProcessed,
        rowsPerSec: Math.round(mappingTransform.rowsProcessed / totalTimeSeconds) || 0,
        percent: 100,
        failedCount: failedCount,
        duplicateCount: duplicateCount,
        columnStats: finalColumnStats,
      });

      socket.emit("processing-complete", {
        totalRows: mappingTransform.rowsProcessed,
        insertedCount: insertedCount,
        failedCount: failedCount,
        failedRowsSample: failedRowsSample,
        failedFileAvailable: failedCount > 0,
        jobId: jobId,
        duplicateCount: duplicateCount,
        dedupeEnabled: !!dedupeColumn,
        savedToDatabase: collection !== null,
        timeTakenSeconds: totalTimeSeconds,
        qualityScore: qualityStats,
        columnStats: finalColumnStats,
      });

      // update the job history record with the final results
      if (jobsCollection) {
        jobsCollection
          .updateOne(
            { jobId: jobId },
            {
              $set: {
                status: "completed",
                completedAt: new Date(),
                totalRows: mappingTransform.rowsProcessed,
                insertedCount: insertedCount,
                failedCount: failedCount,
                duplicateCount: duplicateCount,
                timeTakenSeconds: totalTimeSeconds,
                qualityScore: qualityStats.score,
              },
            }
          )
          .catch((err) => console.log("Could not update job record:", err.message));
      }

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