// this component turns a plain english instruction into a small javascript rule using gemini
// IMPORTANT: the ai only proposes the rule, it never runs automatically
// the user has to review the generated code and approve it before it gets added
import React, { useState } from "react";
import axios from "axios";

function NlRuleBuilder({ columns, rowRules, onRowRulesChange }) {
  const [instruction, setInstruction] = useState("");
  const [proposedRule, setProposedRule] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function generateRule() {
    if (!instruction.trim()) return;

    setIsLoading(true);
    setErrorMsg("");
    setProposedRule(null);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/ai/generate-rule`,
        {
          instruction: instruction,
          columns: columns,
        },
      );
      setProposedRule(response.data.rule);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          "Could not generate a rule from that instruction",
      );
    }

    setIsLoading(false);
  }

  function approveRule() {
    onRowRulesChange([...rowRules, proposedRule]);
    setProposedRule(null);
    setInstruction("");
  }

  function removeRule(index) {
    const updated = rowRules.filter((_, i) => i !== index);
    onRowRulesChange(updated);
  }

  return (
    <div className="card nl-rule-card">
      <h2>🧠 Natural Language Rule Builder</h2>
      <p className="hint-text">
        Describe a rule in plain English, AI proposes the code, you review and
        approve it before it actually runs on your data.
      </p>

      <textarea
        className="nl-instruction-box"
        rows={2}
        placeholder="e.g. If age is below 18, mark the customer as minor"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
      />

      <button
        className="ai-btn"
        onClick={generateRule}
        disabled={isLoading || !instruction.trim()}
      >
        {isLoading ? "Generating..." : "✨ Generate Rule"}
      </button>

      {errorMsg && <p className="error-text">{errorMsg}</p>}

      {proposedRule && (
        <div className="proposed-rule-box">
          <p className="hint-text" style={{ margin: "0 0 6px 0" }}>
            AI proposes adding a new field{" "}
            <strong>{proposedRule.targetField}</strong> with this code:
          </p>
          <pre className="proposed-rule-code">{proposedRule.code}</pre>
          <button className="ai-accept-btn" onClick={approveRule}>
            ✅ Approve & Add Rule
          </button>
        </div>
      )}

      {rowRules.length > 0 && (
        <div className="approved-rules-list">
          <p className="hint-text" style={{ margin: "12px 0 6px 0" }}>
            Approved rules:
          </p>
          {rowRules.map((rule, index) => (
            <div className="approved-rule-item" key={index}>
              <span>
                <strong>{rule.targetField}</strong>: <code>{rule.code}</code>
              </span>
              <button
                className="remove-rule-btn"
                onClick={() => removeRule(index)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NlRuleBuilder;
