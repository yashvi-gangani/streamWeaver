// this file keeps a running tally of stats per column while the file streams through
// deterministic, plain math, updated one row at a time so it stays memory-light

// call this once before processing starts, give it the list of destination column names
function createStatsTracker(columnNames) {
  const stats = {};
  columnNames.forEach((col) => {
    stats[col] = { numericCount: 0, sum: 0, min: null, max: null, missingCount: 0 };
  });
  return stats;
}

// call this for every row as it streams through
function updateStats(stats, row) {
  for (const col in stats) {
    const value = row[col];
    const colStat = stats[col];

    if (value === "" || value === undefined || value === null) {
      colStat.missingCount++;
      continue;
    }

    const numericValue = Number(value);
    if (!Number.isNaN(numericValue)) {
      colStat.numericCount++;
      colStat.sum += numericValue;
      colStat.min = colStat.min === null ? numericValue : Math.min(colStat.min, numericValue);
      colStat.max = colStat.max === null ? numericValue : Math.max(colStat.max, numericValue);
    }
  }
}

// call this whenever you want a snapshot to send to the frontend
function getStatsSnapshot(stats, rowsProcessedSoFar) {
  const snapshot = {};
  for (const col in stats) {
    const colStat = stats[col];
    const isNumeric = colStat.numericCount > 0;

    snapshot[col] = {
      isNumeric: isNumeric,
      min: isNumeric ? colStat.min : null,
      max: isNumeric ? colStat.max : null,
      avg: isNumeric ? Math.round((colStat.sum / colStat.numericCount) * 100) / 100 : null,
      missingPercent:
        rowsProcessedSoFar === 0 ? 0 : Math.round((colStat.missingCount / rowsProcessedSoFar) * 100),
    };
  }
  return snapshot;
}

module.exports = { createStatsTracker, updateStats, getStatsSnapshot };