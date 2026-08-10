# StreamWeaver Team Division

## Member 1 — File Upload & Node.js Streaming

### Main responsibility
Build the large-file upload layer.

### Tasks
- Multipart upload handling
- Node.js readable streams
- Chunk-based file processing
- CSV/JSON input handling
- Avoid loading the full file into RAM
- Connect upload stage to ETL pipeline

### Main files
- backend/src/services/upload/
- backend/src/routes/upload.routes.js

### Deliverable
A large CSV can enter the backend as a stream and be passed to the processing pipeline.

---

## Member 2 — ETL Transformation & MongoDB

### Main responsibility
Build the transformation and database pipeline.

### Tasks
- stream.Transform
- CSV chunk parsing
- Source -> destination mapping
- Transformation rules
- MongoDB bulkWrite/insertMany
- Batch buffering

### Main files
- backend/src/services/etl/
- backend/src/services/database/
- backend/src/routes/etl.routes.js
- backend/src/routes/dataset.routes.js

### Deliverable
Incoming records are transformed and inserted into MongoDB in batches.

---

## Member 3 — Frontend Upload, Preview & Mapping

### Main responsibility
Build the main user interface.

### Tasks
- File selection/upload UI
- Dataset preview
- Virtualized large-data table
- Source/destination column mapping
- ETL configuration UI
- API integration

### Main files
- frontend/src/components/
- frontend/src/pages/
- frontend/src/services/api.js

### Deliverable
User can select a dataset, preview it, configure mapping and start processing.

---

## Member 4 — Progress, Validation, Integration & Testing

### Main responsibility
Connect the full pipeline and make it reliable.

### Tasks
- Socket.IO progress updates
- Processing status UI
- Row validation
- Error reporting
- Final processing summary
- Integration testing
- Performance testing
- Memory profiling
- Final polish

### Main files
- backend/src/utils/progressEmitter.js
- backend/src/services/etl/validator.js
- frontend/src/hooks/useProcessingProgress.js
- frontend/src/components/ProgressBar/

### Deliverable
User sees live progress, errors and final results while the complete pipeline works end-to-end.
