// this component gets an ai written plain-english explanation of the quality score
// only calls gemini when the user clicks the button, to keep api usage low
import React, { useState } from "react";
import axios from "axios";

function AiQualitySummary({ totalRows, failedCount, duplicateCount, qualityScore, columnStats }) {
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function generateSummary() {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/ai/quality-summary`, {
        totalRows,
        failedCount,
        duplicateCount,
        qualityScore,
        columnStats,
      });
      setSummary(response.data.summary);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Could not generate AI summary");
    }

    setIsLoading(false);
  }

  return (
    <div className="ai-summary-box">
      {!summary && (
        <button className="ai-btn" onClick={generateSummary} disabled={isLoading}>
          {isLoading ? "Writing summary..." : "✨ Explain This With AI"}
        </button>
      )}

      {errorMsg && <p className="error-text">{errorMsg}</p>}

      {summary && (
        <div className="ai-summary-text">
          <p className="ai-summary-label">✨ AI Summary</p>
          <p>{summary}</p>
        </div>
      )}
    </div>
  );
}

export default AiQualitySummary;