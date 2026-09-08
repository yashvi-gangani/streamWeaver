# StreamWeaver

A high-throughput, no-code ETL pipeline that lets users upload large CSV files, map and transform columns visually (including AI-assisted mapping and custom sandboxed rules), and stream the cleaned data into MongoDB — without ever loading the whole file into memory.

Built for Infotact Solutions - Advanced MERN Stack Engineering project.

---

## What this covers

### Week 1
- **Backend:** Multer streams the uploaded CSV straight to disk, the file is never held fully in memory.
- **Frontend:** react-window virtual list shows a preview of the CSV rows, only visible rows are rendered in the DOM.

### Week 2
- **Backend:** A custom `stream.Transform` class (`csvToJsonStream.js`) reads the file in chunks and converts each line into a JSON object on the fly, no CSV library used.
- **Frontend:** Column Mapper UI lets you map each source column to a destination field name and pick a simple transform (uppercase, lowercase, capitalize). Mapping state lives in `App.js` and updates the preview grid live.

### Week 3
- **Backend:** `sandboxRunner.js` uses `isolated-vm` to run the user's own custom JS rule (e.g. `return value.toUpperCase()`) in a separate, memory-limited sandbox with a timeout. `applyMappingStream.js` applies this to every row as it streams through. Socket.IO streams live progress (`rowsProcessed`, `rowsPerSec`, `percent`) back to the client.
- **Frontend:** ColumnMapper has a "custom" transform option with a code textarea. `ProgressBar.js` connects over websocket with a "Process Full File" button and a live progress bar.

### Week 4
- **Backend:** Buffers processed rows and writes them to MongoDB using `insertMany` in batches of 5,000. Every row is validated (missing values / custom code errors get flagged, not inserted) and a running count plus a sample of failed rows is tracked.
- **Frontend:** `ErrorRows.js` shows failed rows highlighted in red, with counts, and a fallback message if MongoDB isn't connected.

### Extra features (beyond the original 4-week plan)

| Feature | What it does |
|---|---|
| **Data Quality Score** | Deterministic 0-100 score (`qualityScore.js`) based on Completeness, Validity, and Uniqueness — no AI needed. |
| **Job History Dashboard** | Every processing run is saved to a `jobs` collection in MongoDB and listed in a dashboard (filename, rows, saved/failed counts, quality score, status). |
| **Duplicate Removal** | Pick a column (e.g. `email`) to automatically drop rows with a repeated value during the same streaming pass (keeps the first occurrence). |
| **Live Streaming Statistics** | Per-column min/max/avg and missing % update live every second while processing runs (`columnStats.js`). |
| **Failed-Row CSV Export** | Every failed row (not just the on-screen sample) is written to a real file you can download after processing. |
| **Resume/Retry Failed Jobs** | Processing checkpoints (rows processed, insert/fail/duplicate counts) save to MongoDB every second. If the server crashes mid-job, click "Resume" in the Job Dashboard to continue from where it left off instead of starting over. |
| **AI Auto Column Mapping** | Gemini looks at your column names + sample values and suggests clean destination field names with a confidence %. |
| **AI Data Quality Summary** | Gemini writes a short plain-English explanation of your quality score results. |
| **AI Anomaly Detection** | Deterministic statistics (3-standard-deviations rule, `anomalyDetector.js`) flag outlier values; Gemini explains them in plain English on request. |
| **Natural Language Rule Builder** | Type a plain-English rule (e.g. "if age is below 18, mark as minor"), Gemini proposes JavaScript code, you review and approve it before it runs on your data (`rowRuleRunner.js`, sandboxed via `isolated-vm`). |

---

## Tech stack

- **Backend:** Node.js, Express, Socket.IO, Multer, MongoDB driver, isolated-vm
- **Frontend:** React, react-window, axios, socket.io-client
- **Database:** MongoDB (local or Atlas)
- **AI:** Google Gemini API (free tier — `gemini-1.5-flash`)

---

## Setup

### 1. Backend

```
cd backend
npm install
```

Create a `.env` file inside `backend/` with:

```
MONGO_URL=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
```

- Get a MongoDB connection string from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier) or run MongoDB locally.
- Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com) → "Get API Key".
- If `MONGO_URL` is missing or unreachable, the app still works — it just skips saving to the database and shows a warning instead of crashing.
- If `GEMINI_API_KEY` is missing, every AI feature will show an error when clicked, but the rest of the app is unaffected.

Start the server:

```
npm start
```

You should see:
```
StreamWeaver backend listening on http://localhost:5000
Connected to MongoDB
```

### 2. Frontend

```
cd frontend
npm install
npm start
```

Opens at `http://localhost:3000`.

### 3. Memory audit script (proves the streaming approach works)

```
cd backend
npm run memory-test
```

Generates a 2-million-row test CSV and streams it through while logging RAM usage every second — memory should stay flat instead of spiking.

---

## Folder structure

```
streamweaver/
├── backend/
│   ├── server.js              → Express + Socket.IO server, main processing pipeline, all routes
│   ├── db.js                  → MongoDB connection (processed_data + jobs collections)
│   ├── csvToJsonStream.js     → custom transform stream (csv -> json), no library used
│   ├── applyMappingStream.js  → applies column mapping (preset/custom transforms) to each row
│   ├── sandboxRunner.js       → runs per-column custom JS safely via isolated-vm
│   ├── rowRuleRunner.js       → runs AI-generated cross-column rules safely via isolated-vm
│   ├── columnStats.js         → live min/max/avg/stdDev tracking per column
│   ├── qualityScore.js        → deterministic data quality score calculation
│   ├── anomalyDetector.js     → statistical outlier detection (3-sigma rule)
│   ├── csvWriter.js           → writes row objects out as real CSV lines
│   ├── geminiClient.js        → wraps calls to Google Gemini API
│   ├── scripts/
│   │   └── memoryTest.js      → memory audit script
│   ├── uploads/                → temporary storage for uploaded files during processing
│   └── failed_exports/         → downloadable CSVs of failed rows per job
│
└── frontend/
    └── src/
        ├── App.js
        ├── App.css
        └── components/
            ├── UploadForm.js          → file picker + upload
            ├── DataGrid.js            → virtualized live preview grid
            ├── ColumnMapper.js        → column mapping UI + AI auto-mapping button
            ├── AiAutoMapping.js       → AI column mapping suggestions
            ├── DedupeSettings.js      → duplicate removal configuration
            ├── NlRuleBuilder.js       → natural language rule builder (AI-assisted)
            ├── ProgressBar.js         → live progress, results, wires in AI panels
            ├── LiveStats.js           → live per-column statistics display
            ├── DataQualityScore.js    → quality score circle + breakdown bars
            ├── AiQualitySummary.js    → AI-written plain-English quality summary
            ├── AiAnomalyPanel.js      → anomaly list + AI explanation
            ├── ErrorRows.js           → failed rows display + CSV download
            └── JobHistoryDashboard.js → past jobs table + resume/retry button
```

---

## How to test everything

1. **Upload:** pick a CSV, click "Upload & Process" → see stats + live preview grid.
2. **AI Auto Mapping:** click "✨ Suggest Mapping with AI" in the mapper → review suggestions → "Accept All".
3. **Column Mapping:** rename a destination field or change a transform dropdown → preview updates live. Try "custom" for a JS rule.
4. **Duplicate Removal:** enable it, pick a column (e.g. email).
5. **Natural Language Rule Builder:** type something like "if age is below 18, mark as minor" → Generate Rule → review the code → Approve.
6. **Process Full File:** click it → watch the live progress bar, rows/sec, live column statistics.
7. **Results:** check Data Quality Score, AI Quality Summary ("✨ Explain This With AI"), Anomaly Panel, and the failed rows list with its CSV download button.
8. **Job History Dashboard:** scroll to the bottom, confirm the run appears with correct stats. If a job ever gets stuck in "processing" status (e.g. after a server crash), click "▶ Resume" to continue it.
9. **Memory audit:** run `npm run memory-test` in the backend to confirm RAM stays flat on a 2-million-row file.

---

## Known limitations / things to be upfront about

- **Resume/Retry** depends on MongoDB being connected (checkpoints are stored there) and the original uploaded file still existing on disk. If either is missing, resume will show a clear error instead of failing silently.
- **AI features** require a valid `GEMINI_API_KEY`. If the key is missing or invalid, each AI button shows an error message rather than breaking the app.
- **Duplicate removal** uses a "keep first, drop the rest" strategy — "keep last" isn't supported since it would require buffering the whole file instead of streaming it.
- Anomaly detection needs a reasonably large sample size to work well — on very small files (a handful of rows), an extreme outlier can skew the average enough to hide itself statistically.