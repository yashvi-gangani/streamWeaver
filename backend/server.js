require("dotenv").config();

// StreamWeaver backend server
// week 1 = multipart streaming upload
// week 2 = etl transform stream that turns csv into json on the fly
// week 3 = sandboxed custom code execution + live progress over websocket
// week 4 = mongodb bulk insertion + error handling for bad rows
// extra = duplicate removal, live column stats, failed rows csv export, resume/retry, AI features
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
const { buildRowRuleSandbox, applyRowRules } = require("./rowRuleRunner");
const { connectToDatabase, getCollection, getJobsCollection } = require("./db");
const { calculateQualityScore } = require("./qualityScore");
const { createStatsTracker, updateStats, getStatsSnapshot } = require("./columnStats");
const { rowToCsvLine } = require("./csvWriter");
const { detectAnomalies } = require("./anomalyDetector");
const { askGemini, askGeminiForJson } = require("./geminiClient");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 5000;
const PREVIEW_LIMIT = 1000; // we only keep first 1000 rows for preview, rest we just count
const BATCH_SIZE = 5000; // how many rows we buffer before writing to mongodb at once
const MAX_FAILED_SAMPLE = 50; // we only send a sample of failed rows back to the frontend, not all of them

// connect to mongodb once when the server boots up
connectToDatabase();

// this keeps track of every uploaded file so we can process it fully later
// key = fileId, value = { path, size, originalName }
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
  const failedFilePath = path.join(FAILED_EXPORTS_DIR, `${req.params.jobId}.csv`);

  if (!fs.existsSync(failedFilePath)) {
    return res.status(404).json({ message: "No failed rows file found for this job" });
  }

  res.download(failedFilePath, "failed_rows.csv");
});

// ============================================================
// AI ROUTES - all powered by google gemini, called only when the
// user explicitly clicks a button, never automatically (keeps api usage low)
// ============================================================

// suggests a clean destination field name for each uploaded column, based on column names + sample values
app.post("/ai/suggest-mapping", async (req, res) => {
  try {
    const { columns, sampleRows } = req.body;

    const prompt = `You are helping map CSV columns to clean camelCase database field names.

CSV columns: ${columns.join(", ")}

Sample data (first few rows): ${JSON.stringify((sampleRows || []).slice(0, 3))}

For each column, suggest a clean camelCase target field name and a confidence percentage (0-100) for how sure you are.

Respond with ONLY a JSON array, no explanation, no markdown, in this exact format:
[{"column": "first_name", "suggestedField": "firstName", "confidence": 98}]`;

    const suggestions = await askGeminiForJson(prompt);
    res.json({ suggestions });
  } catch (err) {
    console.log("AI mapping error:", err.message);
    res.status(500).json({ message: "AI mapping suggestion failed: " + err.message });
  }
});

// writes a short plain-english summary of the data quality results
app.post("/ai/quality-summary", async (req, res) => {
  try {
    const { totalRows, failedCount, duplicateCount, qualityScore, columnStats } = req.body;

    const prompt = `You are a data analyst. Write a short, plain-English summary (3-4 sentences max) of this dataset's quality for a non-technical user. Be specific about the numbers below and mention what to consider fixing if the score is under 90.

Total rows: ${totalRows}
Failed rows: ${failedCount}
Duplicate rows: ${duplicateCount}
Overall quality score: ${qualityScore.score}/100
Completeness: ${qualityScore.completeness}%
Validity: ${qualityScore.validity}%
Uniqueness: ${qualityScore.uniqueness}%
Column stats: ${JSON.stringify(columnStats)}

Respond with plain text only, no markdown formatting, no headers.`;

    const summary = await askGemini(prompt);
    res.json({ summary });
  } catch (err) {
    console.log("AI quality summary error:", err.message);
    res.status(500).json({ message: "AI summary failed: " + err.message });
  }
});

// explains detected statistical anomalies in plain english
app.post("/ai/anomaly-summary", async (req, res) => {
  try {
    const { anomalies } = req.body;

    if (!anomalies || anomalies.length === 0) {
      return res.json({ summary: "No anomalies were detected in this dataset, all numeric values looked within a normal range." });
    }

    const prompt = `You are a data analyst. Explain these detected data anomalies in plain English, one short sentence per anomaly, and mention a likely cause if it seems obvious (like a data entry mistake or unit mismatch).

Anomalies: ${JSON.stringify(anomalies)}

Respond with plain text only, no markdown, no headers.`;

    const summary = await askGemini(prompt);
    res.json({ summary });
  } catch (err) {
    console.log("AI anomaly summary error:", err.message);
    res.status(500).json({ message: "AI anomaly summary failed: " + err.message });
  }
});

// converts a plain english instruction into a structured row-level rule
app.post("/ai/generate-rule", async (req, res) => {
  try {
    const { instruction, columns } = req.body;

    const prompt = `You are generating a small JavaScript rule for a data pipeline. The rule receives a variable called "row" which is a plain JS object with these fields: ${columns.join(", ")}.

Convert this instruction into JavaScript code that computes ONE new value and returns it: "${instruction}"

Respond with ONLY a JSON object, no explanation, no markdown, in this exact format:
{"targetField": "customerType", "code": "return row.age < 18 ? 'minor' : 'adult';"}

The code must be a single return statement using only row.<fieldName> for existing fields, no function declarations, no loops, no external variables.`;

    const rule = await askGeminiForJson(prompt);
    res.json({ rule });
  } catch (err) {
    console.log("AI rule generation error:", err.message);
    res.status(500).json({ message: "AI rule generation failed: " + err.message });
  }
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

// ============================================================
// THE MAIN PROCESSING PIPELINE
// pulled into its own function so both a fresh "start-processing" and a
// "resume-processing" (after a crash) can share the exact same logic
// ============================================================
function runProcessingJob(options) {
  const {
    socket,
    fileInfo,
    mapping,
    dedupeColumn,
    rowRules,
    jobId,
    resumeFromRow, // 0 for a fresh job, > 0 when resuming
    checkpointCounts, // { insertedCount, failedCount, duplicateCount } already saved from before
    isResume,
  } = options;

  console.log(
    isResume ? `Resuming job ${jobId} from row ${resumeFromRow}` : `Starting full processing for: ${jobId}`,
    dedupeColumn ? `(dedupe by ${dedupeColumn})` : ""
  );

  const sandbox = buildSandbox(mapping); // compiles any per-column custom code once, reused for every row
  const rowRuleSandbox = buildRowRuleSandbox(rowRules || []); // compiles any AI-generated row rules once
  const startTime = Date.now();
  let bytesRead = 0;

  const collection = getCollection(); // will be null if mongodb is not connected
  const jobsCollection = getJobsCollection();

  // bookkeeping, seeded from the checkpoint if we are resuming an old job
  let insertBuffer = [];
  let insertedCount = checkpointCounts.insertedCount || 0;
  let failedCount = checkpointCounts.failedCount || 0;
  let duplicateCount = checkpointCounts.duplicateCount || 0;
  let failedRowsSample = [];
  let rowNumber = 0;

  let emptyCellCount = 0;
  let totalCells = 0;
  const seenKeys = new Set();

  // output columns include both the mapped destination fields and any ai row-rule fields
  const destinationColumns = Object.values(mapping).map((rule) => rule.destination);
  const allOutputColumns = [...destinationColumns, ...(rowRules || []).map((r) => r.targetField)];
  const statsTracker = createStatsTracker(allOutputColumns);

  // this writes every failed row to a real csv file on disk, so it can be downloaded in full later
  // when resuming, we append instead of overwriting whatever was already exported before the crash
  const failedFilePath = path.join(FAILED_EXPORTS_DIR, `${jobId}.csv`);
  const failedFileStream = fs.createWriteStream(failedFilePath, { flags: isResume ? "a" : "w" });
  if (!isResume) {
    failedFileStream.write(allOutputColumns.join(",") + "\n");
  }

  const fileStream = fs.createReadStream(fileInfo.path);
  const csvTransform = new CsvToJsonStream();
  const mappingTransform = new ApplyMappingStream(mapping, sandbox);

  function isRowInvalid(row) {
    return Object.values(row).some((value) => value === "ERROR" || value === "RULE_ERROR" || value === "" || value === undefined);
  }

  function hashRow(row) {
    return crypto.createHash("md5").update(JSON.stringify(row)).digest("hex");
  }

  async function flushBuffer() {
    if (insertBuffer.length === 0) return;
    const batch = insertBuffer;
    insertBuffer = [];
    if (!collection) return;
    try {
      await collection.insertMany(batch, { ordered: false });
      insertedCount += batch.length;
    } catch (err) {
      console.log("Mongo bulk insert error:", err.message);
    }
  }

  mappingTransform.on("data", (row) => {
    rowNumber++;

    // apply any ai-generated row-level rules to add derived fields
    row = applyRowRules(rowRuleSandbox, row);

    // if we are resuming, rows up to the checkpoint were already fully handled before the crash
    // we still need to replay them through dedupe-tracking and stats so that state stays correct,
    // but we must NOT count or insert them again
    const isReplayOnly = isResume && rowNumber <= resumeFromRow;

    const values = Object.values(row);
    totalCells += values.length;
    emptyCellCount += values.filter((value) => value === "" || value === undefined).length;
    updateStats(statsTracker, row);

    const dedupeKey = dedupeColumn ? row[dedupeColumn] : hashRow(row);
    const isDuplicate = seenKeys.has(dedupeKey);

    if (isDuplicate) {
      if (!isReplayOnly) duplicateCount++;
      seenKeys.add(dedupeKey); // still fine to re-add, Set just ignores duplicates
      if (dedupeColumn) return; // row is dropped either way
    } else {
      seenKeys.add(dedupeKey);
    }

    if (isReplayOnly) return; // dont insert or count replayed rows again

    if (isRowInvalid(row)) {
      failedCount++;
      failedFileStream.write(rowToCsvLine(row, allOutputColumns) + "\n");
      if (failedRowsSample.length < MAX_FAILED_SAMPLE) {
        failedRowsSample.push({ rowNumber: rowNumber, data: row });
      }
      return;
    }

    insertBuffer.push(row);
    if (insertBuffer.length >= BATCH_SIZE) {
      flushBuffer();
    }
  });

  fileStream.on("data", (chunk) => {
    bytesRead += chunk.length;
  });

  // this sends a progress update to the frontend every second, and also saves a checkpoint to mongo
  // so if the server crashes mid-way, we know exactly where to resume from later
  const progressInterval = setInterval(() => {
    const secondsElapsed = (Date.now() - startTime) / 1000;
    const rowsPerSec = Math.round(mappingTransform.rowsProcessed / secondsElapsed) || 0;
    const percent = Math.min(100, Math.round((bytesRead / fileInfo.size) * 100));

    socket.emit("progress", {
      rowsProcessed: rowNumber,
      rowsPerSec: rowsPerSec,
      percent: percent,
      failedCount: failedCount,
      duplicateCount: duplicateCount,
      columnStats: getStatsSnapshot(statsTracker, rowNumber),
    });

    if (jobsCollection) {
      jobsCollection
        .updateOne(
          { jobId: jobId },
          {
            $set: {
              rowsCheckpoint: rowNumber,
              insertedCountCheckpoint: insertedCount,
              failedCountCheckpoint: failedCount,
              duplicateCountCheckpoint: duplicateCount,
            },
          }
        )
        .catch(() => {}); // non critical, dont spam the console if this occasionally fails
    }
  }, 1000);

  fileStream.pipe(csvTransform).pipe(mappingTransform);

  mappingTransform.on("finish", async () => {
    clearInterval(progressInterval);
    await flushBuffer();
    failedFileStream.end();

    const totalTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

    const qualityStats = calculateQualityScore({
      totalRows: rowNumber,
      failedCount: failedCount,
      duplicateCount: duplicateCount,
      emptyCellCount: emptyCellCount,
      totalCells: totalCells,
    });

    const finalColumnStats = getStatsSnapshot(statsTracker, rowNumber);
    const anomalies = detectAnomalies(finalColumnStats);

    socket.emit("progress", {
      rowsProcessed: rowNumber,
      rowsPerSec: Math.round(rowNumber / totalTimeSeconds) || 0,
      percent: 100,
      failedCount: failedCount,
      duplicateCount: duplicateCount,
      columnStats: finalColumnStats,
    });

    socket.emit("processing-complete", {
      totalRows: rowNumber,
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
      anomalies: anomalies,
    });

    if (jobsCollection) {
      jobsCollection
        .updateOne(
          { jobId: jobId },
          {
            $set: {
              status: "completed",
              completedAt: new Date(),
              totalRows: rowNumber,
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

    fs.unlink(fileInfo.path, () => {});
    delete uploadedFiles[jobId];
    sandbox.isolate.dispose();
    rowRuleSandbox.isolate.dispose();
  });

  mappingTransform.on("error", (err) => {
    clearInterval(progressInterval);
    console.log("Error during processing:", err);
    socket.emit("processing-error", { message: "Something went wrong during processing" });
  });
}

io.on("connection", (socket) => {
  console.log("A client connected:", socket.id);

  socket.on("start-processing", (data) => {
    const { fileId, mapping, dedupeColumn, rowRules } = data;
    const fileInfo = uploadedFiles[fileId];

    if (!fileInfo) {
      socket.emit("processing-error", { message: "File not found, please upload again" });
      return;
    }

    const jobId = fileId;
    const jobsCollection = getJobsCollection();

    if (jobsCollection) {
      jobsCollection
        .insertOne({
          jobId: jobId,
          fileName: fileInfo.originalName,
          filePath: fileInfo.path,
          fileSize: fileInfo.size,
          mapping: mapping,
          dedupeColumn: dedupeColumn || null,
          rowRules: rowRules || [],
          status: "processing",
          startedAt: new Date(),
          rowsCheckpoint: 0,
          insertedCountCheckpoint: 0,
          failedCountCheckpoint: 0,
          duplicateCountCheckpoint: 0,
        })
        .catch((err) => console.log("Could not create job record:", err.message));
    }

    runProcessingJob({
      socket,
      fileInfo,
      mapping,
      dedupeColumn,
      rowRules: rowRules || [],
      jobId,
      resumeFromRow: 0,
      checkpointCounts: { insertedCount: 0, failedCount: 0, duplicateCount: 0 },
      isResume: false,
    });
  });

  // resumes a job that got stuck in "processing" status, usually because the server crashed or restarted
  socket.on("resume-processing", async (data) => {
    const { jobId } = data;
    const jobsCollection = getJobsCollection();

    if (!jobsCollection) {
      socket.emit("processing-error", { message: "MongoDB not connected, cannot resume without job history" });
      return;
    }

    const jobDoc = await jobsCollection.findOne({ jobId });

    if (!jobDoc) {
      socket.emit("processing-error", { message: "Job not found" });
      return;
    }
    if (jobDoc.status === "completed") {
      socket.emit("processing-error", { message: "This job already completed" });
      return;
    }
    if (!jobDoc.filePath || !fs.existsSync(jobDoc.filePath)) {
      socket.emit("processing-error", { message: "Original file is no longer available, please re-upload and start a new job" });
      return;
    }

    runProcessingJob({
      socket,
      fileInfo: { path: jobDoc.filePath, size: jobDoc.fileSize, originalName: jobDoc.fileName },
      mapping: jobDoc.mapping,
      dedupeColumn: jobDoc.dedupeColumn,
      rowRules: jobDoc.rowRules || [],
      jobId: jobId,
      resumeFromRow: jobDoc.rowsCheckpoint || 0,
      checkpointCounts: {
        insertedCount: jobDoc.insertedCountCheckpoint || 0,
        failedCount: jobDoc.failedCountCheckpoint || 0,
        duplicateCount: jobDoc.duplicateCountCheckpoint || 0,
      },
      isResume: true,
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`StreamWeaver backend listening on http://localhost:${PORT}`);
});
