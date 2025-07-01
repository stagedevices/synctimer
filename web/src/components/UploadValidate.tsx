import {
  useState,
  useCallback,
  useEffect,
  useRef,
  lazy,
  Suspense,
  type CSSProperties,
} from "react";
import type { editor as MonacoEditorAPI } from "monaco-editor";
import type { OnMount, Monaco } from "@monaco-editor/react";
import { useDropzone } from "react-dropzone";
import { parseUpload } from "../lib/api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Card, Row, Col, Input, Switch, message, Alert, Spin, Button } from "antd";
import {
  SunOutlined,
  MoonOutlined,
  CopyOutlined,
  DownloadOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { saveAs } from "file-saver";
import { auth, db } from "../lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

// Lazy load the Monaco editor to keep the initial bundle small
const MonacoEditor = lazy(() => import("@monaco-editor/react"));

// Glassmorphic card style
const glassStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
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
    } catch (e: unknown) {
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filename, setFilename] = useState('out.yaml');
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editorRef = useRef<MonacoEditorAPI.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    setFilename(file.name.replace(/\.xml$/i, '.yaml'));
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setXmlText(text);
      editorRef.current?.setValue(text);
    };
    reader.readAsText(file);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "application/xml": [".xml"] } });

  // Auto- title
  useEffect(() => {
    const match = xmlText.match(/<work-title>([^<]+)<\/work-title>/i);
    if (match) setFilename(match[1] + '.yaml');
  }, [xmlText]);

  const handleValidate = useCallback(async () => {
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
      );      setYaml(result);
      const duration = ((performance.now() - start) / 1000).toFixed(2);
      message.success(`Parsed in ${duration}s`, 3);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Unknown error");
      message.error(msg || "Error during parsing", 3);
    } finally {
      setLoading(false);
    }
  }, [xmlText, filename]);

  const validateXmlSyntax = useCallback((value: string) => {
    if (!editorRef.current || !monacoRef.current) return;
    const monaco = monacoRef.current;
    const model = editorRef.current.getModel();
    if (!model) return;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(value, 'application/xml');
      const errNode = doc.querySelector('parsererror');
      if (errNode) {
        monaco.editor.setModelMarkers(model, 'owner', [
          {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
            message: errNode.textContent || 'Invalid XML',
            severity: monaco.MarkerSeverity.Error,
          },
        ]);
      } else {
        monaco.editor.setModelMarkers(model, 'owner', []);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      monaco.editor.setModelMarkers(model, 'owner', [
        {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
          message: msg,
          severity: monaco.MarkerSeverity.Error,
        },
      ]);
    }
  }, []);

  useEffect(() => {
    validateXmlSyntax(xmlText);
  }, [xmlText, validateXmlSyntax]);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.onDidBlurEditorWidget(() => {
      editor.getAction('editor.action.formatDocument')?.run();
      if (blurTimer.current) clearTimeout(blurTimer.current);
      blurTimer.current = window.setTimeout(() => handleValidate(), 500);
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleValidate();
    });
  }, [handleValidate]);

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

  const handleSendToFiles = async () => {
    if (!yaml) return;
    const uid = auth.currentUser?.uid;
    if (!uid) {
      message.error('No user signed in', 3);
      return;
    }
    try {
      await addDoc(collection(db, 'users', uid, 'files'), {
        title: filename,
        yaml,
        createdAt: serverTimestamp(),
        size: yaml.length,
        status: 'ready',
      });
      await addDoc(collection(db, 'users', uid, 'sent'), {
        title: filename,
        yaml,
        createdAt: serverTimestamp(),
        size: yaml.length,
        status: 'ready',
      });
      message.success('Saved to My Files', 3);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      message.error(msg || 'Failed to save', 3);
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

              <div
                {...getRootProps({ className: `drop-zone ${isDragActive ? 'active' : ''}` })}
                style={{ marginBottom: '1rem' }}
              >
                <input {...getInputProps()} />
                <InboxOutlined className="drop-zone-icon" />
                <p style={{ margin: 0 }}>
                  {isDragActive ? 'Release to upload' : 'Drag XML here or click'}
                </p>
              </div>

              <Suspense fallback={<Spin />}>
                <MonacoEditor
                  height="40vh"
                  language="xml"
                  value={xmlText}
                  onChange={(val: string | undefined) => {
                    const text = val ?? '';
                    setXmlText(text);
                    validateXmlSyntax(text);
                  }}
                  onMount={handleEditorMount}
                  theme={dark ? 'vs-dark' : 'light'}
                  options={{ minimap: { enabled: false }, automaticLayout: true }}
                />
              </Suspense>
            </Card>
          </Spin>
        </Col>

        <Col xs={24} lg={12}>
          <Spin spinning={loading} tip="Rendering results…" size="large">
            <Card style={glassStyle} styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column' } }}>
              {yaml ? (
                <>
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    <SyntaxHighlighter language="yaml" style={materialLight} customStyle={{ fontSize: '1.2rem' }}>
                      {yaml}
                    </SyntaxHighlighter>
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
