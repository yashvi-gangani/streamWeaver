# StreamWeaver

High-Throughput No-Code ETL Pipeline - Mid Project Review Build (Week 1 + Week 2)

## What this covers so far

- **Week 1 Backend:** Multer streams the uploaded csv straight to disk, the file is never held fully in memory.
- **Week 1 Frontend:** react-window virtual list shows a preview of the csv rows, only visible rows are actually rendered in the dom.
- **Week 2 Backend:** A custom `stream.Transform` class (`csvToJsonStream.js`) reads the file in chunks and converts each line into a JSON object on the fly, no csv library used.
- **Week 2 Frontend:** Column Mapper UI lets you map each source column to a destination field name and pick a simple transform (uppercase, lowercase, capitalize).
- **Mid Project Review:** `backend/scripts/memoryTest.js` generates a 2 million row csv and streams it while logging RAM usage every second, to prove memory stays low.

## How to run

### Backend
```
cd backend
npm install
npm start
```
Server runs on http://localhost:5000

### Memory audit script (mid review proof)
```
cd backend
npm run memory-test
```

### Frontend
```
cd frontend
npm install
npm start
```
App runs on http://localhost:3000

## Folder structure

```
streamweaver/
  backend/
    server.js            -> express server + upload route
    csvToJsonStream.js    -> custom transform stream (csv -> json)
    scripts/memoryTest.js -> memory audit script
  frontend/
    src/
      App.js
      components/
        UploadForm.js
        DataGrid.js
        ColumnMapper.js
```

## Still pending (Week 3 & Week 4, not done yet)

- Sandboxed execution of custom js rules (isolated-vm)
- Live progress bar over websocket
- MongoDB bulkWrite insertion
- Error handling ui for failed rows
