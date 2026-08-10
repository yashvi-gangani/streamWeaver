function ColumnMapper({ columns = [] }) {
  return (
    <section>
      <h2>Column Mapping</h2>
      {/* TODO: Member 3 builds source -> destination mapping UI. */}
      {columns.map((column) => (
        <div key={column}>{column}</div>
      ))}
    </section>
  );
}

export default ColumnMapper;
