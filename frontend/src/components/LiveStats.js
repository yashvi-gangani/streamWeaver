// this component shows live statistics per column while the file is being processed
// updates every second as new progress events come in from the backend
import React from "react";

function LiveStats({ columnStats }) {
  if (!columnStats || Object.keys(columnStats).length === 0) return null;

  return (
    <div className="live-stats-box">
      <p className="live-stats-title">📈 Live Column Statistics</p>

      <div className="live-stats-grid">
        {Object.keys(columnStats).map((colName) => {
          const stat = columnStats[colName];
          return (
            <div className="live-stat-card" key={colName}>
              <p className="live-stat-col-name">{colName}</p>

              {stat.isNumeric ? (
                <div className="live-stat-values">
                  <span>Min: {stat.min}</span>
                  <span>Max: {stat.max}</span>
                  <span>Avg: {stat.avg}</span>
                </div>
              ) : (
                <p className="hint-text" style={{ margin: 0 }}>Non-numeric column</p>
              )}

              <p className="live-stat-missing">
                {stat.missingPercent}% missing
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LiveStats;