// this component shows a preview of csv rows using a virtual list
// virtual list means only the rows visible on screen actually get rendered in the dom
import React from "react";
import { FixedSizeList } from "react-window";

function DataGrid({ columns, rows, mapping }) {
  const rowHeight = 36;
  const gridHeight = 400;

  // this applies the chosen transform to a single cell value
  function applyTransform(value, transformType) {
    if (!value) return value;
    if (transformType === "uppercase") return value.toUpperCase();
    if (transformType === "lowercase") return value.toLowerCase();
    if (transformType === "capitalize") {
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }
    return value; // transformType is "none"
  }

  // this renders one single row, react-window calls this for every visible row
  function Row({ index, style }) {
    const rowData = rows[index];
    const bgColor = index % 2 === 0 ? "#ffffff" : "#f1f8ff"; // stripe effect, light colors only

    return (
      <div className="grid-row" style={{ ...style, backgroundColor: bgColor }}>
        {columns.map((col) => {
          const rule = mapping[col] || { transform: "none" };
          const displayValue = applyTransform(rowData[col], rule.transform);
          return (
            <div className="grid-cell" key={col}>
              {displayValue}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="card grid-card">
      <h2>📊 Data Preview</h2>
      <p className="hint-text">Showing first {rows.length} rows, scroll smoothly even on big files</p>

      <div className="grid-header">
        {columns.map((col) => {
          const rule = mapping[col] || { destination: col };
          return (
            <div className="grid-cell header-cell" key={col}>
              {rule.destination}
            </div>
          );
        })}
      </div>

      <FixedSizeList height={gridHeight} itemCount={rows.length} itemSize={rowHeight} width="100%">
        {Row}
      </FixedSizeList>
    </div>
  );
}

export default DataGrid;
