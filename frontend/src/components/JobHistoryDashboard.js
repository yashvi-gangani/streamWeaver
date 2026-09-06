// this component shows a table of past processing jobs, like a mini dashboard
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

function JobHistoryDashboard({ refreshTrigger }) {
  const [jobs, setJobs] = useState([]);
  const [databaseConnected, setDatabaseConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/jobs");
      setJobs(response.data.jobs);
      setDatabaseConnected(response.data.databaseConnected);
    } catch (err) {
      console.log("Could not load job history:", err);
    }
    setIsLoading(false);
  }, []);

  // reload the list whenever refreshTrigger changes (parent bumps this after a job finishes)
  useEffect(() => {
    loadJobs();
  }, [refreshTrigger, loadJobs]);

  function getStatusClass(status) {
    if (status === "completed") return "status-badge status-completed";
    if (status === "processing") return "status-badge status-processing";
    return "status-badge status-failed";
  }

  return (
    <div className="card job-dashboard-card">
      <div className="job-dashboard-header">
        <h2>📊 Job History Dashboard</h2>
        <button className="refresh-btn" onClick={loadJobs}>
          🔄 Refresh
        </button>
      </div>

      {!databaseConnected && (
        <p className="warning-text">
          ⚠️ MongoDB is not connected, job history cannot be saved or shown right now.
        </p>
      )}

      {databaseConnected && isLoading && <p className="hint-text">Loading job history...</p>}

      {databaseConnected && !isLoading && jobs.length === 0 && (
        <p className="hint-text">No jobs processed yet, upload a file and click "Process Full File".</p>
      )}

      {databaseConnected && jobs.length > 0 && (
        <div className="job-table">
          <div className="job-table-row job-table-head">
            <div>File Name</div>
            <div>Rows</div>
            <div>Saved</div>
            <div>Failed</div>
            <div>Quality</div>
            <div>Status</div>
          </div>

          {jobs.map((job) => (
            <div className="job-table-row" key={job.jobId}>
              <div className="job-file-name">{job.fileName || "unknown file"}</div>
              <div>{job.totalRows ?? "-"}</div>
              <div>{job.insertedCount ?? "-"}</div>
              <div>{job.failedCount ?? "-"}</div>
              <div>{job.qualityScore != null ? `${job.qualityScore}/100` : "-"}</div>
              <div>
                <span className={getStatusClass(job.status)}>{job.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default JobHistoryDashboard;