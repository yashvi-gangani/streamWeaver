# StreamWeaver Infotact Project

High-Throughput No-Code ETL Pipeline built with MERN.

## Project goal
Stream large CSV/JSON files without loading the complete file into RAM, transform/map the data, and bulk-insert processed records into MongoDB while showing live progress.

## Team structure

- Member 1 — Backend Streaming & Upload (yashvi)
- Member 2 — ETL Transformation & MongoDB
- Member 3 — Frontend Upload, Mapping & Preview
- Member 4 — Progress, Validation, Integration & Testing

## Folder ownership

```text
backend/
  src/
    config/
    controllers/
    middleware/
    routes/
    services/
      upload/
      etl/
      database/
    utils/

frontend/
  src/
    components/
    pages/
    services/
    hooks/
    utils/
    styles/

docs/
```

## Getting started

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Create `backend/.env` from `.env.example`.

## Important team rule

Do not directly edit another member's module unless discussed first. Pull the latest `main` before starting work and use a separate feature branch.

## Planned pipeline

Upload file
-> streaming/chunk handling
-> CSV parsing/transformation
-> column mapping
-> validation
-> MongoDB bulk insert
-> WebSocket progress
-> final report

## Source requirements

The project specification calls for Node.js native streams, MongoDB bulk operations, React virtualization, sandboxed JavaScript transformations, and live processing progress.
