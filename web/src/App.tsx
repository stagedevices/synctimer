// web/src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { ParseWizard } from "./components/ParseWizard";

export function App() {
  return (
    <BrowserRouter>
      <nav className="p-4 space-x-4">
        <Link to="/">Home</Link>
        <Link to="/parse">Upload & Validate</Link>
      </nav>
      <Routes>
        <Route path="/" element={<div>Welcome to SyncTimer</div>} />
        <Route path="/parse" element={<ParseWizard />} />
      </Routes>
    </BrowserRouter>
  );
}

