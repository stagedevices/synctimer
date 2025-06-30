// web/src/App.tsx
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Home } from './components/Home';
import { UploadValidate } from './components/UploadValidate';
import { MyFiles } from './components/MyFiles';
import SharedFiles from './components/SharedFiles';
import { SentFiles } from './components/SentFiles';
import { Contacts } from './components/Contacts';
import { Devices } from './components/Devices';
import { Settings } from './components/Settings';


export function App() {
  return (
    <BrowserRouter>
      <nav className="p-4 space-x-4 glass-nav">
        <Link to="/">Home</Link>
        <Link to="/parse">Validate XML</Link>
        <Link to="/files">My Files</Link>
        <Link to="/shared">Shared with Me</Link>
        <Link to="/sent">Sent Files</Link>
        <Link to="/contacts">Contacts</Link>
        <Link to="/devices">Link Phone</Link>
        <Link to="/settings">Account</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/parse" element={<UploadValidate />} />
        <Route path="/files" element={<MyFiles />} />
        <Route path="/shared" element={<SharedFiles />} />
        <Route path="/sent" element={<SentFiles />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/devices" element={<Devices />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}

