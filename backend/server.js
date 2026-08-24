// StreamWeaver backend server
// week 1 = multipart streaming upload
// week 2 = etl transform stream that turns csv into json on the fly
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const CsvToJsonStream = require("./csvToJsonStream");

const app = express();
const PORT = 5000;
const PREVIEW_LIMIT = 1000; // we only keep first 1000 rows for preview, rest we just count

app.use(cors());
app.use(express.json());

// storage engine writes the file straight to disk in chunks, never holds the full file in memory
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

// simple test route
app.get("/", (req, res) => {
  res.send("StreamWeaver backend is running");
});

// upload route, this streams the file to disk first (week 1)
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const filePath = req.file.path;
  const previewRows = [];
  let columns = [];
  let totalRows = 0;
  const startMemory = process.memoryUsage().heapUsed / 1024 / 1024; // in MB

  const fileStream = fs.createReadStream(filePath);
  const csvTransform = new CsvToJsonStream();

  // we pipe the raw file stream through our custom transform stream (week 2 etl)
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
    console.log("Memory used for this upload (MB):", (endMemory - startMemory).toFixed(2));

    // cleanup the uploaded file after processing so disk does not fill up
    fs.unlink(filePath, () => {});

    res.json({
      message: "File processed successfully",
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

app.listen(PORT, () => {
  console.log(`StreamWeaver backend listening on http://localhost:${PORT}`);
});
