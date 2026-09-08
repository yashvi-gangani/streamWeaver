// this shows anomalies found by plain statistics (3 standard deviations rule)
// and lets the user get an ai written explanation of them in plain english
import React, { useState } from "react";
import axios from "axios";

function AiAnomalyPanel({ anomalies }) {
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function explainWithAi() {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/ai/anomaly-summary`, { anomalies });
      setSummary(response.data.summary);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Could not generate AI explanation");
    }

    setIsLoading(false);
  }

  if (!anomalies || anomalies.length === 0) {
    return (
      <div className="anomaly-box">
        <p className="success-text">✅ No statistical anomalies detected in your numeric columns.</p>
      </div>
    );
  }

  return (
    <div className="anomaly-box">
      <p className="anomaly-heading">
        ⚠️ {anomalies.length} anomal{anomalies.length > 1 ? "ies" : "y"} detected
      </p>

      <div className="anomaly-list">
        {anomalies.map((item, index) => (
          <div className="anomaly-item" key={index}>
            <strong>{item.column}</strong>: value {item.value} is {item.type} (expected range{" "}
            {item.expectedRange})
          </div>
        ))}
      </div>

      {!summary && (
        <button className="ai-btn" onClick={explainWithAi} disabled={isLoading}>
          {isLoading ? "Thinking..." : "✨ Explain With AI"}
        </button>
      )}

      {errorMsg && <p className="error-text">{errorMsg}</p>}

      {summary && (
        <div className="ai-summary-text">
          <p className="ai-summary-label">✨ AI Explanation</p>
          <p>{summary}</p>
        </div>
      )}
    </div>
  );
}

export default AiAnomalyPanel;