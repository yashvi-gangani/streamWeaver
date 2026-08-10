function FileUploader() {
  const handleChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("Selected file:", file.name);
    // TODO: Member 1/3 connects this to streaming upload API.
  };

  return (
    <section>
      <h2>Upload Dataset</h2>
      <input type="file" accept=".csv,.json" onChange={handleChange} />
    </section>
  );
}

export default FileUploader;
