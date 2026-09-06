// this component shows the data quality score after processing finishes
// no ai here, just a plain formula based on completeness, validity and uniqueness
import React from "react";

function getScoreColor(score) {
  if (score >= 90) return "#43a047"; // green
  if (score >= 70) return "#fb8c00"; // orange
  return "#e53935"; // red
}

function DataQualityScore({ qualityScore, duplicateCount }) {
  if (!qualityScore) return null;

  const color = getScoreColor(qualityScore.score);

  return (
    <div className="quality-score-box">
      <div className="quality-score-header">
        <div className="quality-score-circle" style={{ borderColor: color, color: color }}>
          {qualityScore.score}
        </div>
        <div>
          <h3 style={{ margin: 0, color: color }}>Data Quality Score</h3>
          <p className="hint-text" style={{ margin: 0 }}>out of 100, based on your processed data</p>
        </div>
      </div>

      <div className="quality-breakdown">
        <div className="quality-bar-row">
          <span>Completeness</span>
          <div className="quality-bar-track">
            <div className="quality-bar-fill" style={{ width: `${qualityScore.completeness}%`, background: "#42a5f5" }}></div>
          </div>
          <span>{qualityScore.completeness}%</span>
        </div>

        <div className="quality-bar-row">
          <span>Validity</span>
          <div className="quality-bar-track">
            <div className="quality-bar-fill" style={{ width: `${qualityScore.validity}%`, background: "#66bb6a" }}></div>
          </div>
          <span>{qualityScore.validity}%</span>
        </div>

        <div className="quality-bar-row">
          <span>Uniqueness</span>
          <div className="quality-bar-track">
            <div className="quality-bar-fill" style={{ width: `${qualityScore.uniqueness}%`, background: "#ab47bc" }}></div>
          </div>
          <span>{qualityScore.uniqueness}%</span>
        </div>
      </div>

      {duplicateCount > 0 && (
        <p className="hint-text" style={{ marginTop: "8px" }}>
          🔁 Found {duplicateCount} duplicate row{duplicateCount > 1 ? "s" : ""} (exact matches)
        </p>
      )}
    </div>
  );
}

export default DataQualityScore;