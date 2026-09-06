// this file works out a simple data quality score after processing finishes
// no ai here, just plain math based on stuff we already counted during streaming

function calculateQualityScore(stats) {
  const { totalRows, failedCount, duplicateCount, emptyCellCount, totalCells } = stats;

  if (totalRows === 0) {
    return { score: 0, completeness: 0, validity: 0, uniqueness: 0 };
  }

  // completeness = how many cells actually have a value in them
  const completeness = totalCells === 0 ? 100 : 100 - (emptyCellCount / totalCells) * 100;

  // validity = how many rows passed our validation rules (no empty fields, no code errors)
  const validity = 100 - (failedCount / totalRows) * 100;

  // uniqueness = how many rows are not exact duplicates of another row
  const uniqueness = 100 - (duplicateCount / totalRows) * 100;

  // weighted average, completeness and validity matter a bit more than uniqueness
  const score = completeness * 0.4 + validity * 0.4 + uniqueness * 0.2;

  return {
    score: Math.round(score),
    completeness: Math.round(completeness),
    validity: Math.round(validity),
    uniqueness: Math.round(uniqueness),
  };
}

module.exports = { calculateQualityScore };