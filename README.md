# StreamWeaver

High-Throughput No-Code ETL Pipeline - Mid Project Review Build (Week 1 + Week 2)

## What this covers so far

- **Week 1 Backend:** Multer streams the uploaded csv straight to disk, the file is never held fully in memory.
- **Week 1 Frontend:** react-window virtual list shows a preview of the csv rows, only visible rows are actually rendered in the dom.
- **Week 2 Backend:** A custom `stream.Transform` class (`csvToJsonStream.js`) reads the file in chunks and converts each line into a JSON object on the fly, no csv library used.
- **Week 2 Frontend:** Column Mapper UI lets you map each source column to a destination field name and pick a simple transform (uppercase, lowercase, capitalize). Mapping now lives in App.js and updates the preview grid live.
- **Week 3 Backend:** `sandboxRunner.js` uses `isolated-vm` to run the user's own custom JS rule (e.g. `return value.toUpperCase()`) in a totally separate, memory-limited sandbox, safely, with a timeout. `applyMappingStream.js` is a transform stream that applies the mapping (preset or custom) to every row. Socket.io streams live progress (`rowsProcessed`, `rowsPerSec`, `percent`) back to the client while the full file is processed.
- **Week 3 Frontend:** ColumnMapper now has a "custom" option with a textarea for writing your own JS rule. A new `ProgressBar` component connects over websocket, has a "Process Full File" button, and shows a live progress bar + rows/sec while the backend streams through the whole file.
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
    server.js              -> express server, upload route, socket.io processing
    csvToJsonStream.js      -> custom transform stream (csv -> json)
    applyMappingStream.js   -> applies mapping rules (preset/custom) to each row
    sandboxRunner.js        -> runs user's custom JS safely using isolated-vm
    scripts/memoryTest.js   -> memory audit script
  frontend/
    src/
      App.js
      components/
        UploadForm.js
        DataGrid.js
        ColumnMapper.js
        ProgressBar.js
```

## How to test Week 3

1. Start backend and frontend as usual.
2. Upload a CSV.
3. In Column Mapper, set a column's transform to "custom" and write something like `return value.toUpperCase();`
4. Scroll down to "Full File Processing" and click "Process Full File".
5. Watch the progress bar, rows processed count, and rows/sec update live while the backend streams through the whole file and runs your custom code in the sandbox.

## Still pending (Week 4, not done yet)

- MongoDB bulkWrite insertion of the final processed data
- Error handling ui for failed/invalid rows
