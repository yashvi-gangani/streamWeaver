// main app component for StreamWeaver
import React, { useState } from "react";
import UploadForm from "./components/UploadForm";
import DataGrid from "./components/DataGrid";
import ColumnMapper from "./components/ColumnMapper";
import DedupeSettings from "./components/DedupeSettings";
import NlRuleBuilder from "./components/NlRuleBuilder";
import ProgressBar from "./components/ProgressBar";
import JobHistoryDashboard from "./components/JobHistoryDashboard";
import "./App.css";

function App() {
  const [uploadData, setUploadData] = useState(null); // holds columns, previewRows, totalRows etc
  const [mapping, setMapping] = useState({}); // holds destination name + transform for every column
  const [jobRefreshCount, setJobRefreshCount] = useState(0); // bumping this makes the dashboard reload
  const [dedupeEnabled, setDedupeEnabled] = useState(false);
  const [dedupeColumn, setDedupeColumn] = useState("");
  const [rowRules, setRowRules] = useState([]); // ai-approved cross-column rules

  // called from UploadForm after backend finishes processing the file
  function handleUploadSuccess(data) {
    setUploadData(data);

    // build a fresh default mapping, one entry per column, no transform applied yet
    const defaultMapping = data.columns.reduce((acc, col) => {
      acc[col] = { destination: col, transform: "none" };
      return acc;
    }, {});
    setMapping(defaultMapping);
    setDedupeEnabled(false);
    setDedupeColumn("");
    setRowRules([]);
  }

  // the destination field names currently in the mapping, used by the nl rule builder
  const destinationFieldNames = Object.values(mapping).map((rule) => rule.destination);

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
        <ColumnMapper
          columns={uploadData.columns}
          mapping={mapping}
          onMappingChange={setMapping}
          previewRows={uploadData.previewRows}
        />
      )}

      {uploadData && (
        <DataGrid columns={uploadData.columns} rows={uploadData.previewRows} mapping={mapping} />
      )}

      {uploadData && (
        <DedupeSettings
          columns={uploadData.columns}
          mapping={mapping}
          dedupeEnabled={dedupeEnabled}
          dedupeColumn={dedupeColumn}
          onToggle={setDedupeEnabled}
          onColumnChange={setDedupeColumn}
        />
      )}

      {uploadData && (
        <NlRuleBuilder columns={destinationFieldNames} rowRules={rowRules} onRowRulesChange={setRowRules} />
      )}

      {uploadData && (
        <ProgressBar
          fileId={uploadData.fileId}
          mapping={mapping}
          dedupeEnabled={dedupeEnabled}
          dedupeColumn={dedupeColumn}
          rowRules={rowRules}
          onProcessingComplete={() => setJobRefreshCount((count) => count + 1)}
        />
      )}

      <JobHistoryDashboard refreshTrigger={jobRefreshCount} />

      <footer className="app-footer">Made for Infotact Solutions - Advanced MERN Stack Project</footer>
    </div>
  );
}

export default App;