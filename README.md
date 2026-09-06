# StreamWeaver

**High-Throughput No-Code ETL Pipeline**

StreamWeaver is a high-throughput, no-code ETL (Extract, Transform, Load) pipeline designed to process large CSV files efficiently without loading the entire dataset into memory.

The project uses Node.js streams, React virtualization, MongoDB, Socket.IO, and sandboxed JavaScript transformations to provide a scalable and interactive data processing workflow.

---

## 🚀 Key Features

### 📤 Large File Upload & Streaming

* Upload CSV files through the web interface.
* Files are streamed directly to disk instead of being completely loaded into RAM.
* Supports processing of large datasets with low memory consumption.
* File type and size validation is performed before processing.
* Each upload is assigned a unique processing job.

### 🔄 Streaming ETL Processing

The complete pipeline processes records incrementally:

**Upload → Parse → Transform → Validate → Analyze → Store/Export → Report**

* Uses Node.js `stream.Transform` for memory-efficient processing.
* CSV records are converted to JSON objects while streaming.
* Records are processed incrementally instead of loading the complete file.
* Supports high-volume data processing.

### 🗺️ No-Code Column Mapping

The Column Mapper allows users to configure transformations without modifying backend code.

Supported transformations include:

* Uppercase
* Lowercase
* Capitalize
* Custom JavaScript transformations

Example custom rule:

```javascript
return value.toUpperCase();
```

Mappings are applied to each record during streaming processing.

### 🔐 Sandboxed Custom Transformations

Custom JavaScript rules are executed using `isolated-vm`.

* User code runs inside an isolated environment.
* Execution is memory-limited.
* Execution has a timeout.
* Custom transformations cannot directly access the main Node.js process.
* Helps prevent unsafe user-defined code from affecting the application.

### 📊 Live Processing Progress

StreamWeaver provides real-time processing updates using Socket.IO.

The frontend displays:

* Rows processed
* Processing percentage
* Rows per second
* Current processing status
* Processing errors
* Completion status

The progress information is updated while the backend is processing the file.

### 📈 Live Processing Statistics

The application provides live statistics during processing, helping users understand how the dataset is being processed in real time.

Statistics include information such as:

* Processed rows
* Processing rate
* Progress percentage
* Dataset statistics
* Processing status

### 🧪 Data Validation & Failed Rows

Records can be validated during the ETL pipeline.

Invalid or failed records can be tracked separately so that users can identify data-quality problems instead of silently losing problematic rows.

The frontend includes an **Error Rows** interface for reviewing failed records.

### 📋 Data Quality Analysis

StreamWeaver includes data-quality analysis features to help users understand the quality of their dataset.

The system can provide information such as:

* Valid vs invalid records
* Missing values
* Column-level statistics
* Data-quality score
* Processing results

### 📊 Column Statistics

Column-level statistics help users understand their uploaded dataset before or during processing.

This provides additional visibility into the structure and quality of the incoming data.

### ♻️ Deduplication Controls

The application includes deduplication settings to help manage duplicate records during the ETL workflow.

Users can configure how duplicate records should be handled instead of relying on a fixed processing rule.

### 🗂️ Job History

StreamWeaver maintains processing job information so users can review previous ETL operations.

The Job History Dashboard provides visibility into:

* Previous jobs
* Job status
* Processing results
* Row counts
* Processing information

### 💾 MongoDB Integration

Processed data can be integrated with MongoDB using efficient database operations.

The backend includes MongoDB connectivity and database utilities designed for handling processed ETL records efficiently.

### 📄 CSV Output

The pipeline also supports generating CSV output from processed records, making it possible to export transformed data for further use.

---

## 🧠 Memory-Efficient Architecture

One of the main goals of StreamWeaver is to process large datasets without keeping the entire file in memory.

Instead of:

```text
Large CSV
   ↓
Load entire file into RAM
   ↓
Process everything
```

StreamWeaver uses:

```text
Large CSV
   ↓
File Stream
   ↓
CSV Parser
   ↓
Transform Stream
   ↓
Validation
   ↓
Data Analysis
   ↓
Database / CSV Output
```

Only a small portion of the dataset is processed at a time.

---

## 🖥️ Frontend

The frontend is built using React.

Important frontend features include:

* CSV upload interface
* Virtualized data preview
* Column mapping
* Transformation selection
* Custom transformation editor
* Live progress bar
* Live processing statistics
* Error/failed-row viewer
* Data quality score
* Deduplication settings
* Job history dashboard

### Virtualized Preview

`react-window` is used for large datasets so that only the rows currently visible to the user need to be rendered in the DOM.

This keeps the preview responsive even when the dataset contains a large number of records.

---

## ⚙️ Backend

The backend is built using Node.js and Express.

Important backend functionality includes:

* File upload and validation
* Native Node.js streams
* CSV parsing
* Streaming transformations
* Sandboxed JavaScript execution
* Data validation
* Job management
* MongoDB integration
* CSV generation
* Data-quality analysis
* Column statistics
* Socket.IO progress updates

---

## 🔌 Real-Time Communication

Socket.IO is used to communicate processing progress from the backend to the frontend.

Example progress information:

```text
Rows Processed: 1,250,000
Rows/sec:       18,500
Progress:       62%
Status:         Processing
```

This allows users to monitor long-running ETL jobs without refreshing the page.

---

## 🧪 Memory Testing

StreamWeaver includes a memory testing script designed to demonstrate the application's streaming architecture.

The memory test can generate and process a large CSV dataset while monitoring memory consumption.

Run:

```bash
cd backend
npm run memory-test
```

This helps verify that processing remains memory-efficient even when working with millions of rows.

---

## 🛠️ Technology Stack

### Frontend

* React
* React Window
* CSS
* Socket.IO Client

### Backend

* Node.js
* Express
* Busboy / streaming upload
* Native Node.js Streams
* Socket.IO
* `isolated-vm`

### Database

* MongoDB
* Mongoose

### Development Tools

* Git
* GitHub
* npm
* Vite / Create React App tooling

---

## 📁 Project Structure

```text
StreamWeaver/
│
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   │
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── parsers/
│   │   ├── utils/
│   │   └── ...
│   │
│   ├── columnStats.js
│   ├── csvWriter.js
│   ├── qualityScore.js
│   ├── sandboxRunner.js
│   ├── applyMappingStream.js
│   └── scripts/
│       └── memoryTest.js
│
├── frontend/
│   └── src/
│       ├── App.js
│       ├── App.css
│       ├── socket.js
│       │
│       └── components/
│           ├── UploadForm.js
│           ├── DataGrid.js
│           ├── ColumnMapper.js
│           ├── ProgressBar.js
│           ├── ErrorRows.js
│           ├── DataQualityScore.js
│           ├── DedupeSettings.js
│           ├── JobHistoryDashboard.js
│           └── LiveStats.js
│
└── README.md
```

---

## ▶️ How to Run

### 1. Clone the repository

```bash
git clone https://github.com/yashvi-gangani/streamWeaver.git
cd StreamWeaver
```

### 2. Start the Backend

```bash
cd backend
npm install
npm start
```

Backend runs on:

```text
http://localhost:5000
```

### 3. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm start
```

Frontend runs on:

```text
http://localhost:3000
```

---

## 🧪 Basic Workflow

1. Start the backend.
2. Start the frontend.
3. Upload a CSV file.
4. Preview the uploaded records.
5. Configure column mappings.
6. Select built-in transformations or write a custom JavaScript transformation.
7. Configure deduplication options if required.
8. Start full-file processing.
9. Monitor live progress and processing statistics.
10. Review data-quality information and failed rows.
11. Store or export the processed dataset.
12. Review the completed job in Job History.

---

## 📌 Project Progress

### Week 1 — Upload & Preview ✅

* Large-file upload
* Streaming upload to disk
* File validation
* Virtualized CSV preview
* Job management foundation

### Week 2 — Streaming Transformation ✅

* Custom CSV streaming parser
* JSON record conversion
* Column mapping
* Built-in transformations
* Streaming transformation pipeline

### Week 3 — Custom Processing & Live Progress ✅

* Sandboxed JavaScript transformations
* `isolated-vm`
* Custom transformation UI
* Socket.IO integration
* Live processing progress
* Rows/sec monitoring
* Full-file streaming processing

### Week 4 — Data Processing & Analytics ✅

* MongoDB integration
* Processed data handling
* Failed-row/error handling
* Data-quality scoring
* Column statistics
* Deduplication controls
* Job history dashboard
* Live processing statistics
* CSV output generation
* End-to-end ETL workflow

---

## 🎯 Project Goal

The goal of StreamWeaver is to demonstrate how a no-code ETL system can process large datasets efficiently while providing:

* Low memory usage
* Streaming-based processing
* Flexible transformations
* Safe custom user logic
* Real-time progress monitoring
* Data-quality visibility
* Error tracking
* Database integration
* A user-friendly no-code interface

StreamWeaver combines **stream processing, data transformation, validation, analytics, database operations, and real-time monitoring** into a single ETL workflow.
