// web/src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { UploadValidate } from "./components/UploadValidate";

export function App() {
  return (
    <BrowserRouter>
      <nav className="p-4 space-x-4 glass-nav">
        <Link to="/">Home</Link>
        <Link to="/parse">Validate XML</Link>
        <Link to="/files">My Files</Link>
        <Link to="/shared">Shared with Me</Link>
        <Link to="/sent">Sent Files</Link>
        <Link to="/peers">Contacts</Link>
        <Link to="/devices">Link Phone</Link>
        <Link to="/settings">Account</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/parse" element={<UploadValidate />} />
        <Route path="/files" element={<MyFiles />} />
        <Route path="/shared" element={<SharedFiles />} />
        <Route path="/sent" element={<SentFiles />} />
        <Route path="/peers" element={<Contacts />} />
        <Route path="/devices" element={<LinkPhone />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}

