# Initial API Plan

These are planning contracts. The team can adjust them during implementation, but communicate before changing shared response shapes.

## Health
GET /api/health

## Upload
POST /api/upload

Purpose: start a large-file upload/streaming job.

## ETL
POST /api/etl/start

Purpose: start processing a previously uploaded/streamed dataset.

## Dataset
GET /api/dataset/:jobId/preview

Purpose: retrieve preview rows.

GET /api/dataset/:jobId/status

Purpose: retrieve processing status.

## Socket events

Client -> server:
- join-processing-job

Server -> client:
- processing-progress

Suggested progress payload:

```json
{
  "jobId": "example-job-id",
  "percent": 42,
  "rowsProcessed": 210000,
  "rowsPerSecond": 5000,
  "status": "processing"
}
```
