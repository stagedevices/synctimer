import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { parseUpload } from "../lib/api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialLight } from "react-syntax-highlighter/dist/esm/styles/prism";

export function ParseWizard() {
  const [xmlText, setXmlText] = useState("");
  const [yaml, setYaml]     = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => setXmlText(reader.result as string);
    reader.readAsText(file);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/xml": [".xml"] },
  });

  const handleValidate = async () => {
    setLoading(true);
    setError(null);
    setYaml(null);
    try {
      const blob = new Blob([xmlText], { type: "application/xml" });
      const result = await parseUpload(blob);
      setYaml(result);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div
        {...getRootProps()}
        className={`p-8 border-2 border-dashed ${
          isDragActive ? "border-blue-500" : "border-gray-300"
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the XML file here...</p>
        ) : (
          <p>Drag & drop an XML file here, or click to select</p>
        )}
      </div>

      <textarea
        className="w-full h-48 border rounded p-2 font-mono"
        value={xmlText}
        onChange={(e) => setXmlText(e.target.value)}
        placeholder="Or paste / edit XML here"
      />

      <button
        onClick={handleValidate}
        disabled={loading || !xmlText.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? "Validating…" : "Validate XML"}
      </button>

      {error && <div className="text-red-600">Error: {error}</div>}

      {yaml && (
        <SyntaxHighlighter language="yaml" style={materialLight}>
          {yaml}
        </SyntaxHighlighter>
      )}
    </div>
  );
}
