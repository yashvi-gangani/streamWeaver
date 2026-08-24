// this component handles picking a csv file and sending it to backend
import React, { useState } from "react";
import axios from "axios";

function UploadForm({ onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // runs when user picks a file
  function handleFileChange(e) {
    setSelectedFile(e.target.files[0]);
    setErrorMsg("");
  }

  // runs when user clicks upload button
  async function handleUpload() {
    if (!selectedFile) {
      setErrorMsg("Please choose a csv file first");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsLoading(true);
    setErrorMsg("");

    try {
      const response = await axios.post("http://localhost:5000/upload", formData);
      onUploadSuccess(response.data);
    } catch (err) {
      console.log(err);
      setErrorMsg("Something went wrong while uploading, check backend server");
    }

    setIsLoading(false);
  }

  return (
    <div className="card upload-card">
      <h2>📤 Upload your CSV file</h2>
      <p className="hint-text">Even huge files are okay, we stream it in chunks so it never crashes</p>

      <input type="file" accept=".csv" onChange={handleFileChange} className="file-input" />

      <button className="primary-btn" onClick={handleUpload} disabled={isLoading}>
        {isLoading ? "Processing..." : "Upload & Process"}
      </button>

      {errorMsg && <p className="error-text">{errorMsg}</p>}
    </div>
  );
}

export default UploadForm;
