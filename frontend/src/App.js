import React, { useState } from "react";
import axios from "axios";
import "./App.css";

const API_BASE_URL = "http://localhost:5000/api";

function App() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  // Handle file upload
  const handleFileUpload = async (selectedFile) => {
    if (!selectedFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("pdf", selectedFile);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setUploadStatus(`✅ ${response.data.message}`);
      setFile(selectedFile);
    } catch (error) {
      setUploadStatus(
        `❌ Error: ${error.response?.data?.error || "Upload failed"}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle text matching
  const handleTextMatch = async () => {
    if (!text.trim()) {
      alert("Please enter some text to match!");
      return;
    }

    if (!file) {
      alert("Please upload a PDF file first!");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/match`, {
        text: text.trim(),
      });

      setResult(response.data);
    } catch (error) {
      alert(`Error: ${error.response?.data?.error || "Matching failed"}`);
    } finally {
      setLoading(false);
    }
  };

  // Reset everything
  const handleReset = () => {
    setFile(null);
    setText("");
    setResult(null);
    setUploadStatus("");
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>PDF Text Matcher</h1>
        </header>

        <div className="main-content">
          {/* File Upload Section */}
          <div className="section">
            <h2>Upload PDF Document</h2>
            <div className="upload-area">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileUpload(e.target.files[0])}
                disabled={loading}
                className="file-input"
              />
              {uploadStatus && (
                <div
                  className={`status ${
                    uploadStatus.includes("✅") ? "success" : "error"
                  }`}
                >
                  {uploadStatus}
                </div>
              )}
              {file && (
                <div className="file-info">
                  📁 Selected: <strong>{file.name}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Text Input Section */}
          <div className="section">
            <h2>Enter Text to Match</h2>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter any text to match against the PDF content..."
              disabled={loading}
              className="text-input"
              rows="4"
            />
          </div>

          {/* Action Buttons */}
          <div className="section">
            <div className="button-group">
              <button
                onClick={handleTextMatch}
                disabled={loading || !file || !text.trim()}
                className="btn btn-primary"
              >
                {loading ? "Analyzing..." : "Find Match"}
              </button>
              <button
                onClick={handleReset}
                disabled={loading}
                className="btn btn-secondary"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Results Section */}
          {result && (
            <div className="section result-section">
              <h2>Match Results</h2>
              <div className="result-card">
                <div className="confidence-score">
                  <span className="label">Confidence Score:</span>
                  <span className="score">{result.confidence}%</span>
                </div>
                <div className="quality-badge">{result.quality}</div>
                <div className="result-details">
                  <div className="detail">
                    <strong>Input Text:</strong> "{result.inputText}"
                  </div>
                  <div className="detail">
                    <strong>Processing Time:</strong> {result.processingTime}ms
                  </div>
                  <div className="detail">
                    <strong>Analysis Mode:</strong> {result.mode}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="footer"></footer>
      </div>
    </div>
  );
}

export default App;
