// this component lets the user map each csv column to a destination field name
// and pick a small transformation, this is the no-code mapping ui part
import React from "react";

const TRANSFORM_OPTIONS = ["none", "uppercase", "lowercase", "capitalize", "custom"];

function ColumnMapper({ columns, mapping, onMappingChange }) {
  // this function updates just the destination name for one column
  function handleDestinationChange(col, value) {
    onMappingChange({ ...mapping, [col]: { ...mapping[col], destination: value } });
  }

  // this function updates just the transform type for one column
  function handleTransformChange(col, value) {
    onMappingChange({ ...mapping, [col]: { ...mapping[col], transform: value } });
  }

  // this function updates the custom js code written for one column
  function handleCustomCodeChange(col, value) {
    onMappingChange({ ...mapping, [col]: { ...mapping[col], customCode: value } });
  }

  return (
    <div className="card mapper-card">
      <h2>🗺️ Map Your Columns</h2>
      <p className="hint-text">
        Match each source column to a destination field. Pick "custom" to write your own tiny JS rule,
        it runs safely in a sandbox on the server.
      </p>

      <div className="mapper-table">
        <div className="mapper-row mapper-head">
          <div>Source Column</div>
          <div>Destination Field</div>
          <div>Transformation</div>
        </div>

        {columns.map((col) => (
          <React.Fragment key={col}>
            <div className="mapper-row">
              <div className="source-col">{col}</div>
              <input
                className="dest-input"
                type="text"
                value={mapping[col]?.destination || ""}
                onChange={(e) => handleDestinationChange(col, e.target.value)}
              />
              <select
                className="transform-select"
                value={mapping[col]?.transform || "none"}
                onChange={(e) => handleTransformChange(col, e.target.value)}
              >
                {TRANSFORM_OPTIONS.map((opt) => (
                  <option value={opt} key={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {mapping[col]?.transform === "custom" && (
              <div className="custom-code-row">
                <p className="hint-text">
                  Write JS using <code>value</code> as the input, must end with a return statement.
                  Example: <code>return value.toUpperCase();</code>
                </p>
                <textarea
                  className="custom-code-box"
                  rows={2}
                  placeholder="return value.toUpperCase();"
                  value={mapping[col]?.customCode || ""}
                  onChange={(e) => handleCustomCodeChange(col, e.target.value)}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default ColumnMapper;
