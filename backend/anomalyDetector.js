// this file flags values that are way outside the normal range for their column
// pure statistics, the "3 standard deviations" rule is a common simple outlier check
// ai is only used afterwards to explain these in plain english, not to detect them

function detectAnomalies(columnStats) {
  const anomalies = [];

  for (const col in columnStats) {
    const stat = columnStats[col];
    if (!stat.isNumeric || stat.stdDev === null || stat.stdDev === 0) continue;

    const lowerBound = stat.avg - 3 * stat.stdDev;
    const upperBound = stat.avg + 3 * stat.stdDev;

    if (stat.max > upperBound) {
      anomalies.push({
        column: col,
        value: stat.max,
        type: "unusually high",
        expectedRange: `${Math.round(lowerBound)} to ${Math.round(upperBound)}`,
      });
    }

    if (stat.min < lowerBound) {
      anomalies.push({
        column: col,
        value: stat.min,
        type: "unusually low",
        expectedRange: `${Math.round(lowerBound)} to ${Math.round(upperBound)}`,
      });
    }
  }

  return anomalies;
}

module.exports = { detectAnomalies };