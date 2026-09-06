// this component lets the user turn on duplicate removal, keyed by one chosen column
import React from "react";

function DedupeSettings({ columns, mapping, dedupeEnabled, dedupeColumn, onToggle, onColumnChange }) {
  // we dedupe using the destination field names, since thats what the backend actually compares
  const destinationOptions = columns.map((col) => mapping[col]?.destination || col);

  return (
    <div className="card dedupe-card">
      <h2>🧹 Remove Duplicates</h2>
      <p className="hint-text">
        Turn this on to automatically drop rows with a repeated value in the column you pick (keeps the
        first one seen, removes the rest).
      </p>

      <label className="dedupe-toggle-row">
        <input type="checkbox" checked={dedupeEnabled} onChange={(e) => onToggle(e.target.checked)} />
        <span>Enable duplicate removal</span>
      </label>

      {dedupeEnabled && (
        <select
          className="dedupe-select"
          value={dedupeColumn}
          onChange={(e) => onColumnChange(e.target.value)}
        >
          <option value="">Choose a column...</option>
          {destinationOptions.map((col) => (
            <option value={col} key={col}>
              {col}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export default DedupeSettings;