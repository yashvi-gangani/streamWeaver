// this component lets the user map each csv column to a destination field name
// and pick a small transformation, this is the no-code mapping ui part
import React from "react";

const TRANSFORM_OPTIONS = ["none", "uppercase", "lowercase", "capitalize"];

function ColumnMapper({ columns, mapping, onMappingChange }) {
  // this function updates just the destination name for one column
  function handleDestinationChange(col, value) {
    onMappingChange({ ...mapping, [col]: { ...mapping[col], destination: value } });
  }

  // this function updates just the transform type for one column
  function handleTransformChange(col, value) {
    onMappingChange({ ...mapping, [col]: { ...mapping[col], transform: value } });
  }

  return (
    <div className="card mapper-card">
      <h2>🗺️ Map Your Columns</h2>
      <p className="hint-text">Match each source column to a destination field, no coding needed</p>

      <div className="mapper-table">
        <div className="mapper-row mapper-head">
          <div>Source Column</div>
          <div>Destination Field</div>
          <div>Transformation</div>
        </div>

        {columns.map((col) => (
          <div className="mapper-row" key={col}>
            <div className="source-col">{col}</div>
            <input
              className="dest-input"
              type="text"
              value={mapping[col].destination}
              onChange={(e) => handleDestinationChange(col, e.target.value)}
            />
            <select
              className="transform-select"
              value={mapping[col].transform}
              onChange={(e) => handleTransformChange(col, e.target.value)}
            >
              {TRANSFORM_OPTIONS.map((opt) => (
                <option value={opt} key={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ColumnMapper;
