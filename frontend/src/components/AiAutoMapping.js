// this component calls gemini to suggest a clean destination name for every column
// the user reviews the suggestions and can accept them all with one click
import React, { useState } from "react";
import axios from "axios";

function AiAutoMapping({ columns, previewRows, onAcceptSuggestions }) {
  const [suggestions, setSuggestions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function getSuggestions() {
    setIsLoading(true);
    setErrorMsg("");
    setSuggestions(null);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/ai/suggest-mapping`, {
        columns: columns,
        sampleRows: previewRows.slice(0, 5),
      });
      setSuggestions(response.data.suggestions);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Could not get AI suggestions, check your Gemini API key");
    }

    setIsLoading(false);
  }

  function acceptAll() {
    onAcceptSuggestions(suggestions);
    setSuggestions(null);
  }

  return (
    <div className="ai-mapping-box">
      <button className="ai-btn" onClick={getSuggestions} disabled={isLoading}>
        {isLoading ? "Thinking..." : "✨ Suggest Mapping with AI"}
      </button>

      {errorMsg && <p className="error-text">{errorMsg}</p>}

      {suggestions && (
        <div className="ai-suggestions-list">
          {suggestions.map((item) => (
            <div className="ai-suggestion-row" key={item.column}>
              <span className="ai-suggestion-col">{item.column}</span>
              <span className="ai-suggestion-arrow">→</span>
              <span className="ai-suggestion-field">{item.suggestedField}</span>
              <span className="ai-suggestion-confidence">{item.confidence}%</span>
            </div>
          ))}
          <button className="ai-accept-btn" onClick={acceptAll}>
            Accept All Suggestions
          </button>
        </div>
      )}
    </div>
  );
}

export default AiAutoMapping;