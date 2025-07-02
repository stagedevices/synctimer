import { useState, useCallback, useEffect, type CSSProperties } from "react";
import { useDropzone } from "react-dropzone";
import { parseUpload } from "../lib/api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Card, Button, Row, Col, Input, Switch, message, Alert, Spin, Tabs } from "antd";
import { SunOutlined, MoonOutlined, CopyOutlined, DownloadOutlined } from "@ant-design/icons";
import { saveAs } from "file-saver";
import { auth } from "../lib/firebase";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";


// Glassmorphic card style using global token
const glassStyle: CSSProperties = {
  background: 'var(--glass-bg)',
  backdropFilter: 'blur(8px)',
  borderRadius: '1.5rem',
  boxShadow: '0 8px 32px rgba(0,0,0,0.125)',
  height: '100%',
};

// Exponential backoff retry helper
async function retry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 500): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      await new Promise(res => setTimeout(res, delayMs * 2 ** i));
    }
  }
  throw lastErr;
}

export function UploadValidate() {
  // Theme toggle
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    return stored === 'dark';
  });
  useEffect(() => {
    document.body.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const [xmlText, setXmlText] = useState("");
  const [yaml, setYaml] = useState<string | null>(null);
  const [parts, setParts] = useState<{ name: string; yaml: string }[]>([]);
  const [activeTab, setActiveTab] = useState('full');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filename, setFilename] = useState('out.yaml');

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    setFilename(file.name.replace(/\.xml$/i, '.yaml'));
    const reader = new FileReader();
    reader.onload = () => setXmlText(reader.result as string);
    reader.readAsText(file);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "application/xml": [".xml"] } });

  // Auto- title
  useEffect(() => {
    const match = xmlText.match(/<work-title>([^<]+)<\/work-title>/i);
    if (match) setFilename(match[1] + '.yaml');
  }, [xmlText]);

  const handleValidate = async () => {
    // TEMPORARILY allow anonymous parsing until we wire up real auth:
    const user = auth.currentUser;
    const uid = user?.uid ?? "anonymous";
    // Large file warning
    if (xmlText.length > 1_000_000) {
      message.warning("Large file detected—this may take a while", 5);
    }
    setLoading(true);
    setError(null);
    setYaml(null);
    try {
      const start = performance.now();
      const blob = new Blob([xmlText], { type: "application/xml" });
      // Exponential backoff on transient errors
      const result = await retry(
        () => parseUpload(blob, filename, uid),
        3,
        500
      );
      setYaml(result);
      // Split YAML into individual parts if applicable
      try {
        const events = parseYaml(result) as Array<any>;

        const instruments = Array.from(
          new Set(
            events
              .map((e: any) => (e.instruments ? e.instruments[0] : null))
              .filter(Boolean)
          )
        ) as string[];
        const partArr = instruments.map((inst) => ({
          name: inst,
          yaml: stringifyYaml(

            events.filter((e: any) => (e.instruments || []).includes(inst))
          ),
        }));
        setParts(partArr);
      } catch (e) {
        console.warn("Part split failed", e);
        setParts([]);
      }
      setActiveTab('full');
      const duration = ((performance.now() - start) / 1000).toFixed(2);
      message.success(`Parsed in ${duration}s`, 3);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Unknown error");
      message.error(msg || "Error during parsing", 3);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (yaml) {
      navigator.clipboard.writeText(yaml);
      message.success('Copied to clipboard', 3);
    }
  };

  const handleDownload = () => {
    if (yaml) {
      const blob = new Blob([yaml], { type: 'text/yaml;charset=utf-8' });
      saveAs(blob, filename);
      message.success('Download started', 3);
    }
  };

  const PARSE_URL = `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/parseUpload`;

  const handleSendToFiles = async () => {
    if (!yaml) return;
    const uid = auth.currentUser?.uid;
    if (!uid) {
      message.error('No user signed in', 3);
      return;
    }
    const selectedYaml = activeTab === 'full'
      ? yaml
      : parts.find(p => p.name === activeTab)?.yaml;
    if (!selectedYaml) return;
    const sendName = activeTab === 'full' ? filename : `${activeTab}.yaml`;
    try {
      const resp = await fetch(PARSE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/yaml',
          Authorization: `Bearer ${uid}`,
          'X-File-Name': sendName,
        },
        body: selectedYaml,
      });
      const text = await resp.text();
      if (!resp.ok) throw new Error(text);
      message.success(`Sent '${sendName}' to My Files`, 3);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      message.error(msg || 'Failed to send', 3);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header with theme toggle */}
      <Row justify="space-between" align="middle" style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '4.6rem', margin: 0, fontFamily: 'system-ui' }}>SyncTimer</h1>
        <Switch
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
          checked={dark}
          onChange={setDark}
        />
      </Row>

      {/* Main content */}
      <Row gutter={[16, 16]}>  
        <Col xs={24} lg={12}>
          <Spin spinning={loading} tip="Parsing, please wait…" size="large">
            <Card style={glassStyle} styles={{ body: { height: '100%' } }}>
              {/* Inline error alert with retry */}
              {error && (
                <Alert
                  type="error"
                  showIcon
                  message="Validation failed"
                  description={error}
                  action={<Button size="small" onClick={handleValidate}>Retry</Button>}
                  closable
                  onClose={() => setError(null)}
                  style={{ marginBottom: '1rem' }}
                />
              )}

              <div {...getRootProps()} style={{
                border: '2px dashed #ccc',
                padding: '1rem',
                borderRadius: '1rem',
                textAlign: 'center',
                background: isDragActive ? '#e6f7ff' : 'transparent'
              }}>
                <input {...getInputProps()} />
                {isDragActive ? <p>Drop XML here…</p> : <p>Drag & drop an XML file or click to select</p>}
              </div>

              <Input.TextArea
                value={xmlText}
                onChange={e => setXmlText(e.target.value)}
                rows={10}
                style={{ marginTop: '1rem', fontFamily: 'monospace', fontSize: '1.5rem' }}
                placeholder="Or paste/edit XML here"
              />

              <Button
                type="primary"
                size="large"
                htmlType="button"
                style={{
                  backgroundColor: '#70C73C',
                  borderRadius: '1rem',
                  fontSize: '1.5rem',
                  marginTop: '1rem',
                  transition: 'transform 0.25s'
                }}
                loading={loading}
                onClick={handleValidate}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                disabled={!xmlText.trim()}
              >
                Validate XML
              </Button>
            </Card>
          </Spin>
        </Col>

        <Col xs={24} lg={12}>
          <Spin spinning={loading} tip="Rendering results…" size="large">
            <Card style={glassStyle} styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column' } }}>
              {yaml ? (
                <>
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    <Tabs
                      destroyInactiveTabPane={false}
                      activeKey={activeTab}
                      onChange={setActiveTab}
                      items={[
                        {
                          key: 'full',
                          label: 'Full Score',
                          children: (
                            <SyntaxHighlighter
                              language="yaml"
                              style={materialLight}
                              customStyle={{ fontSize: '1.2rem' }}
                            >
                              {yaml}
                            </SyntaxHighlighter>
                          ),
                        },
                        ...parts.map(p => ({
                          key: p.name,
                          label: p.name,
                          children: (
                            <SyntaxHighlighter
                              language="yaml"
                              style={materialLight}
                              customStyle={{ fontSize: '1.2rem' }}
                            >
                              {p.yaml}
                            </SyntaxHighlighter>
                          ),
                        })),
                      ]}
                    />
                  </div>
                  <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                    <Input
                      value={filename}
                      onChange={e => setFilename(e.target.value)}
                      style={{ width: '60%', marginRight: '1rem', fontSize: '1.2rem' }}
                    />
                    <Button icon={<CopyOutlined />} onClick={handleCopy} style={{ marginRight: '0.5rem' }} />
                    <Button icon={<DownloadOutlined />} onClick={handleDownload} />
                  </div>
                  <Button
                    type="primary"
                    size="large"
                    style={{
                      backgroundColor: '#70C73C',
                      borderRadius: '1rem',
                      marginTop: '1rem',
                    }}
                    onClick={handleSendToFiles}
                  >
                    Send to My Files
                  </Button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: '#888', padding: '2rem', fontSize: '1.2rem' }}>
                    Validation results will appear here
                  </div>
              )}
            </Card>
          </Spin>
        </Col>
      </Row>
    </div>
  );
}
