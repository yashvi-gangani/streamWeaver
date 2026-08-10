function DataPreview({ rows = [] }) {
  return (
    <section>
      <h2>Data Preview</h2>
      {/* TODO: Member 3 implements react-window/react-virtualized preview. */}
      <pre>{JSON.stringify(rows.slice(0, 5), null, 2)}</pre>
    </section>
  );
}

export default DataPreview;
