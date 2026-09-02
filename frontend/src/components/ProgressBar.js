// this component starts the full file processing and shows live progress over a websocket
import React, { useState } from "react";
import { io } from "socket.io-client";

function ProgressBar({ fileId, mapping }) {
  const [percent, setPercent] = useState(0);
  const [rowsProcessed, setRowsProcessed] = useState(0);
  const [rowsPerSec, setRowsPerSec] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // runs when the user clicks the process button
  function startProcessing() {
    setIsProcessing(true);
    setIsDone(false);
    setErrorMsg("");
    setPercent(0);
    setRowsProcessed(0);
    setRowsPerSec(0);

    const socket = io("http://localhost:5000");

    socket.on("connect", () => {
      socket.emit("start-processing", { fileId, mapping });
    });

    // backend sends this roughly once every second while the file streams through
    socket.on("progress", (data) => {
      setPercent(data.percent);
      setRowsProcessed(data.rowsProcessed);
      setRowsPerSec(data.rowsPerSec);
    });

    socket.on("processing-complete", (data) => {
      setIsProcessing(false);
      setIsDone(true);
      socket.disconnect();
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
        in a sandbox, while streaming live progress here.
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
          </div>
        </div>
      )}

      {isDone && <p className="success-text">✅ Done! Your file was fully processed.</p>}
      {errorMsg && <p className="error-text">{errorMsg}</p>}
    </div>
  );
}

export default ProgressBar;
