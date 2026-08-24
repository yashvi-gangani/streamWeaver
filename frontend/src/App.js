// main app component for StreamWeaver
import React, { useState } from "react";
import UploadForm from "./components/UploadForm";
import DataGrid from "./components/DataGrid";
import ColumnMapper from "./components/ColumnMapper";
import "./App.css";

function App() {
  const [uploadData, setUploadData] = useState(null); // holds columns, previewRows, totalRows etc
  const [mapping, setMapping] = useState({}); // holds destination name + transform for every column

  // called from UploadForm after backend finishes processing the file
  function handleUploadSuccess(data) {
    setUploadData(data);

    // build a fresh default mapping, one entry per column, no transform applied yet
    const defaultMapping = data.columns.reduce((acc, col) => {
      acc[col] = { destination: col, transform: "none" };
      return acc;
    }, {});
    setMapping(defaultMapping);
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🌊 StreamWeaver</h1>
        <p>High-Throughput No-Code ETL Pipeline</p>
      </header>

      <UploadForm onUploadSuccess={handleUploadSuccess} />

      {uploadData && (
        <div className="stats-bar">
          <div className="stat-box stat-blue">
            <h3>{uploadData.totalRows}</h3>
            <p>Total Rows</p>
          </div>
          <div className="stat-box stat-green">
            <h3>{uploadData.columns.length}</h3>
            <p>Columns Found</p>
          </div>
          <div className="stat-box stat-orange">
            <h3>{uploadData.memoryUsedMB} MB</h3>
            <p>Memory Used</p>
          </div>
        </div>
      )}

      {uploadData && (
        <ColumnMapper columns={uploadData.columns} mapping={mapping} onMappingChange={setMapping} />
      )}

      {uploadData && (
        <DataGrid columns={uploadData.columns} rows={uploadData.previewRows} mapping={mapping} />
      )}

      <footer className="app-footer">Made for Infotact Solutions - Advanced MERN Stack Project</footer>
    </div>
  );
}

export default App;
