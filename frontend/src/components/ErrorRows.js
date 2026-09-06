// this component shows the rows that failed validation during processing
// week 4 error handling ui layer
import React from "react";

function ErrorRows({ failedCount, failedRowsSample, failedFileAvailable, jobId }) {
  if (failedCount === 0) {
    return <p className="success-text">✅ No bad rows found, every row passed validation.</p>;
  }

  return (
    <div className="error-rows-box">
      <div className="error-rows-header">
        <p className="error-heading">
          ⚠️ {failedCount} row{failedCount > 1 ? "s" : ""} failed validation
          {failedRowsSample.length < failedCount && ` (showing first ${failedRowsSample.length})`}
        </p>

        {failedFileAvailable && (
          <a
            className="download-btn"
            href={`${process.env.REACT_APP_API_URL}/download-failed/${jobId}`}
            download
          >
            ⬇️ Download All Failed Rows (CSV)
          </a>
        )}
      </div>

      <div className="error-rows-list">
        {failedRowsSample.map((item) => (
          <div className="error-row-item" key={item.rowNumber}>
            <span className="error-row-number">Row {item.rowNumber}</span>
            <span className="error-row-data">{JSON.stringify(item.data)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ErrorRows;