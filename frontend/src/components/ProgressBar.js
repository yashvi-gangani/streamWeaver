// this component starts the full file processing and shows live progress over a websocket
import React, { useState } from "react";
import { io } from "socket.io-client";
import ErrorRows from "./ErrorRows";
import DataQualityScore from "./DataQualityScore";
import LiveStats from "./LiveStats";

function ProgressBar({ fileId, mapping, dedupeEnabled, dedupeColumn, onProcessingComplete }) {
  const [percent, setPercent] = useState(0);
  const [rowsProcessed, setRowsProcessed] = useState(0);
  const [rowsPerSec, setRowsPerSec] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [columnStats, setColumnStats] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resultData, setResultData] = useState(null); // holds insertedCount, failedRowsSample, savedToDatabase

  // runs when the user clicks the process button
  function startProcessing() {
    setIsProcessing(true);
    setIsDone(false);
    setErrorMsg("");
    setPercent(0);
    setRowsProcessed(0);
    setRowsPerSec(0);
    setFailedCount(0);
    setDuplicateCount(0);
    setColumnStats(null);
    setResultData(null);

    const socket = io(process.env.REACT_APP_API_URL);

    socket.on("connect", () => {
      socket.emit("start-processing", {
        fileId,
        mapping,
        dedupeColumn: dedupeEnabled ? dedupeColumn : null,
      });
    });

    // backend sends this roughly once every second while the file streams through
    socket.on("progress", (data) => {
      setPercent(data.percent);
      setRowsProcessed(data.rowsProcessed);
      setRowsPerSec(data.rowsPerSec);
      setFailedCount(data.failedCount);
      setDuplicateCount(data.duplicateCount);
      setColumnStats(data.columnStats);
    });

    socket.on("processing-complete", (data) => {
      setIsProcessing(false);
      setIsDone(true);
      setResultData(data);
      socket.disconnect();
      if (onProcessingComplete) onProcessingComplete(); // tells App.js to refresh the job dashboard
    });

    socket.on("processing-error", (data) => {
      setErrorMsg(data.message);
      setIsProcessing(false);
      socket.disconnect();
    });
  }

  return (
    <div className="card progress-card">
      <h2>⚡ Full File Processing</h2>
      <p className="hint-text">
        This actually runs your mapping rules (including custom code) on every row of the file, safely
        in a sandbox, buffers good rows and saves them to MongoDB every 5000 records.
      </p>

      <button className="primary-btn" onClick={startProcessing} disabled={isProcessing}>
        {isProcessing ? "Processing..." : "Process Full File"}
      </button>

      {(isProcessing || isDone) && (
        <div className="progress-wrapper">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${percent}%` }}></div>
          </div>

          <div className="progress-stats">
            <span>{percent}% complete</span>
            <span>{rowsProcessed} rows processed</span>
            <span>{rowsPerSec} rows/sec</span>
            <span>{failedCount} failed</span>
            {dedupeEnabled && <span>{duplicateCount} duplicates removed</span>}
          </div>
        </div>
      )}

      {isProcessing && <LiveStats columnStats={columnStats} />}

      {isDone && resultData && (
        <div className="result-section">
          <p className="success-text">✅ Done! Your file was fully processed.</p>

          <div className="result-stats">
            <div className="result-stat">
              <strong>{resultData.insertedCount}</strong>
              <span>Rows saved to DB</span>
            </div>
            <div className="result-stat">
              <strong>{resultData.timeTakenSeconds}s</strong>
              <span>Time taken</span>
            </div>
            {resultData.dedupeEnabled && (
              <div className="result-stat">
                <strong>{resultData.duplicateCount}</strong>
                <span>Duplicates removed</span>
              </div>
            )}
          </div>

          {!resultData.savedToDatabase && (
            <p className="warning-text">
              ⚠️ MongoDB is not connected, so rows were processed but not saved. Start MongoDB and try
              again to actually store the data.
            </p>
          )}

          <ErrorRows
            failedCount={resultData.failedCount}
            failedRowsSample={resultData.failedRowsSample}
            failedFileAvailable={resultData.failedFileAvailable}
            jobId={resultData.jobId}
          />

          <DataQualityScore qualityScore={resultData.qualityScore} duplicateCount={resultData.duplicateCount} />

          <LiveStats columnStats={resultData.columnStats} />
        </div>
      )}

      {errorMsg && <p className="error-text">{errorMsg}</p>}
    </div>
  );
}

export default ProgressBar;