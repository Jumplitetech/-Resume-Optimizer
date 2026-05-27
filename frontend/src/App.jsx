import { useState, useRef } from "react";

const API = "http://localhost:8000";

function ScoreCard({ label, data, color }) {
  if (!data) return null;
  const scoreColor = data.score >= 85 ? "#16a34a" : data.score >= 70 ? "#d97706" : "#dc2626";
  return (
    <div style={{
      background: "var(--bg2, #f9fafb)",
      border: "1px solid var(--border, #e5e7eb)",
      borderRadius: 12,
      padding: "1.25rem",
      flex: 1,
      minWidth: 220
    }}>
      <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 8px", fontWeight: 500 }}>{label}</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 42, fontWeight: 600, color: scoreColor }}>{data.score}</span>
        <span style={{ fontSize: 16, color: "#9ca3af" }}>/100</span>
        <span style={{
          fontSize: 11, fontWeight: 500,
          padding: "2px 8px", borderRadius: 20,
          background: data.score >= 85 ? "#dcfce7" : data.score >= 70 ? "#fef3c7" : "#fee2e2",
          color: data.score >= 85 ? "#166534" : data.score >= 70 ? "#92400e" : "#991b1b"
        }}>{data.review_tier}</span>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Keyword match</span>
          <span style={{ fontSize: 12, fontWeight: 500 }}>{data.keyword_match}%</span>
        </div>
        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${data.keyword_match}%`, background: scoreColor, borderRadius: 4 }} />
        </div>
      </div>
      {data.strengths?.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#16a34a", margin: "0 0 4px" }}>STRENGTHS</p>
          {data.strengths.map((s, i) => (
            <p key={i} style={{ fontSize: 11, color: "#374151", margin: "0 0 2px" }}>✓ {s}</p>
          ))}
        </div>
      )}
      {data.gaps?.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#dc2626", margin: "0 0 4px" }}>GAPS</p>
          {data.gaps.map((g, i) => (
            <p key={i} style={{ fontSize: 11, color: "#374151", margin: "0 0 2px" }}>✗ {g}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function KeywordBadges({ keywords, found }) {
  if (!keywords?.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {keywords.map((kw, i) => (
        <span key={i} style={{
          fontSize: 11, padding: "3px 10px", borderRadius: 20,
          background: found ? "#dcfce7" : "#fee2e2",
          color: found ? "#166534" : "#991b1b",
          fontWeight: 500
        }}>{kw}</span>
      ))}
    </div>
  );
}

export default function App() {
  const [apiKey, setApiKey] = useState("");
  const [apiKeySet, setApiKeySet] = useState(false);
  const [file, setFile] = useState(null);
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("optimize");
  const fileRef = useRef();

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f && (f.name.endsWith(".pdf") || f.name.endsWith(".docx"))) {
      setFile(f);
      setError("");
    } else {
      setError("Please upload a PDF or DOCX file.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".pdf") || f.name.endsWith(".docx"))) {
      setFile(f);
      setError("");
    }
  };

  const runScoreOnly = async () => {
    if (!file || !jd.trim() || !apiKey.trim()) {
      setError("Please provide your resume, job description, and API key.");
      return;
    }
    setLoading(true);
    setError("");
    setResults(null);
    setLoadingMsg("Reading your resume...");

    try {
      const form = new FormData();
      form.append("resume", file);
      form.append("job_description", jd);
      form.append("api_key", apiKey);

      setLoadingMsg("AI is scoring your resume...");
      const res = await fetch(`${API}/api/score`, { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Something went wrong");
      setResults({ mode: "score", ...data });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const runOptimize = async () => {
    if (!file || !jd.trim() || !apiKey.trim()) {
      setError("Please provide your resume, job description, and API key.");
      return;
    }
    setLoading(true);
    setError("");
    setResults(null);

    const msgs = [
      "Reading your resume...",
      "Scoring original resume against JD...",
      "AI is rewriting and optimizing...",
      "Scoring optimized version...",
      "Generating metadata and building PDF...",
    ];
    let i = 0;
    setLoadingMsg(msgs[i]);
    const interval = setInterval(() => {
      i = Math.min(i + 1, msgs.length - 1);
      setLoadingMsg(msgs[i]);
    }, 4000);

    try {
      const form = new FormData();
      form.append("resume", file);
      form.append("job_description", jd);
      form.append("api_key", apiKey);

      const res = await fetch(`${API}/api/optimize`, { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Something went wrong");
      setResults({ mode: "optimize", ...data });
    } catch (e) {
      setError(e.message);
    } finally {
      clearInterval(interval);
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const downloadPDF = () => {
    if (!results?.download_path) return;
    const filename = results.download_path.split("/").pop();
    window.open(`${API}/api/download/${filename}`, "_blank");
  };

  const improvement = results?.mode === "optimize" && results.new_score && results.original_score
    ? results.new_score.score - results.original_score.score
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 2rem" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "#1B3A6B", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 16 }}>⚡</span>
            </div>
            <div>
              <span style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>JumpLite Resume Optimizer</span>
              <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>by JumpLite Tech</span>
            </div>
          </div>
          <span style={{ fontSize: 11, background: "#dcfce7", color: "#166534", padding: "3px 10px", borderRadius: 20, fontWeight: 500 }}>
            Free & Open Source
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>

        {/* API Key Setup */}
        {!apiKeySet ? (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "2rem", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>Set your Anthropic API Key</h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 1rem" }}>
              Your key stays on your device — it's never stored or sent anywhere except directly to Anthropic.
              Get a free key at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: "#1B3A6B" }}>console.anthropic.com</a> — new accounts get $5 free credits (~100 optimizations).
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="password"
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                onKeyDown={e => e.key === "Enter" && apiKey.trim() && setApiKeySet(true)}
                style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, outline: "none" }}
              />
              <button
                onClick={() => apiKey.trim() && setApiKeySet(true)}
                disabled={!apiKey.trim()}
                style={{
                  padding: "10px 20px", background: "#1B3A6B", color: "#fff",
                  border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500,
                  cursor: apiKey.trim() ? "pointer" : "not-allowed", opacity: apiKey.trim() ? 1 : 0.5
                }}
              >Set Key</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 16px", marginBottom: "1.5rem" }}>
            <span style={{ fontSize: 13, color: "#166534" }}>✓ API key set — you're ready to optimize</span>
            <button onClick={() => { setApiKeySet(false); setApiKey(""); setResults(null); }}
              style={{ fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>
              Change key
            </button>
          </div>
        )}

        {/* Mode tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
          {["optimize", "score"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "8px 18px", borderRadius: 8, border: "1px solid",
              borderColor: tab === t ? "#1B3A6B" : "#e5e7eb",
              background: tab === t ? "#1B3A6B" : "#fff",
              color: tab === t ? "#fff" : "#374151",
              fontSize: 13, fontWeight: 500, cursor: "pointer"
            }}>
              {t === "optimize" ? "⚡ Optimize + Download PDF" : "📊 Score Only"}
            </button>
          ))}
        </div>

        {/* Upload + JD */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          
          {/* Resume upload */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>Resume (PDF or DOCX)</label>
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current.click()}
              style={{
                border: `2px dashed ${file ? "#16a34a" : "#d1d5db"}`,
                borderRadius: 12, padding: "2rem 1rem", textAlign: "center",
                cursor: "pointer", background: file ? "#f0fdf4" : "#fafafa",
                transition: "all 0.2s"
              }}
            >
              <input ref={fileRef} type="file" accept=".pdf,.docx" onChange={handleFileChange} style={{ display: "none" }} />
              <div style={{ fontSize: 28, marginBottom: 8 }}>{file ? "✅" : "📄"}</div>
              {file ? (
                <>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#166534", margin: "0 0 4px" }}>{file.name}</p>
                  <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>Click to change</p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#374151", margin: "0 0 4px" }}>Drop your resume here</p>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>PDF or DOCX • Click to browse</p>
                </>
              )}
            </div>
          </div>

          {/* JD */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>Job Description</label>
            <textarea
              placeholder="Paste the full job description here..."
              value={jd}
              onChange={e => setJd(e.target.value)}
              style={{
                width: "100%", height: 160, padding: "12px", borderRadius: 12,
                border: "1px solid #d1d5db", fontSize: 12, resize: "vertical",
                outline: "none", boxSizing: "border-box", fontFamily: "inherit",
                lineHeight: 1.5
              }}
            />
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>
              {jd.length > 0 ? `${jd.length} characters` : "Paste the complete JD for best results"}
            </p>
          </div>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: "1rem" }}>
            <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>⚠ {error}</p>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={tab === "optimize" ? runOptimize : runScoreOnly}
          disabled={loading || !file || !jd.trim() || !apiKeySet}
          style={{
            width: "100%", padding: "14px", background: "#1B3A6B", color: "#fff",
            border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600,
            cursor: (loading || !file || !jd.trim() || !apiKeySet) ? "not-allowed" : "pointer",
            opacity: (loading || !file || !jd.trim() || !apiKeySet) ? 0.6 : 1,
            marginBottom: "2rem"
          }}
        >
          {loading ? `${loadingMsg}` : tab === "optimize" ? "⚡ Optimize My Resume" : "📊 Score My Resume"}
        </button>

        {/* Loading bar */}
        {loading && (
          <div style={{ marginTop: -24, marginBottom: "1.5rem" }}>
            <div style={{ height: 3, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: "60%", background: "#1B3A6B", borderRadius: 4,
                animation: "pulse 1.5s ease-in-out infinite"
              }} />
            </div>
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
          </div>
        )}

        {/* Results */}
        {results && (
          <div>
            {/* Score comparison */}
            {results.mode === "optimize" && improvement !== null && (
              <div style={{
                background: improvement > 0 ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${improvement > 0 ? "#bbf7d0" : "#fecaca"}`,
                borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1rem",
                display: "flex", alignItems: "center", gap: 12
              }}>
                <span style={{ fontSize: 28 }}>{improvement > 0 ? "🚀" : "📊"}</span>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 2px", color: improvement > 0 ? "#166534" : "#991b1b" }}>
                    {improvement > 0 ? `+${improvement} point improvement` : `Score: ${results.new_score.score}/100`}
                  </p>
                  <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                    {improvement > 0
                      ? `Original: ${results.original_score.score}/100 → Optimized: ${results.new_score.score}/100`
                      : "Optimization complete"}
                  </p>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              {results.mode === "optimize" ? (
                <>
                  <ScoreCard label="Original Score" data={results.original_score} />
                  <ScoreCard label="Optimized Score" data={results.new_score} />
                </>
              ) : (
                <ScoreCard label="Resume Score" data={results.score_data} />
              )}
            </div>

            {/* Keywords */}
            {(results.score_data || results.new_score) && (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem" }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 10px" }}>Keywords</p>
                <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 6px", fontWeight: 500 }}>FOUND IN RESUME</p>
                <KeywordBadges keywords={(results.score_data || results.original_score)?.present_keywords} found={true} />
                <p style={{ fontSize: 11, color: "#6b7280", margin: "12px 0 6px", fontWeight: 500 }}>MISSING — NOT IN RESUME</p>
                <KeywordBadges keywords={(results.score_data || results.original_score)?.missing_keywords} found={false} />
              </div>
            )}

            {/* Metadata */}
            {results.metadata && (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem" }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 10px" }}>PDF Metadata — baked into your download</p>
                {[
                  ["Title", results.metadata.title],
                  ["Author", "(empty — protects your identity)"],
                  ["Subject", results.metadata.subject],
                  ["Keywords", results.metadata.keywords],
                  ["Creator / Producer", "Microsoft Word"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <span style={{ fontSize: 12, color: "#9ca3af", minWidth: 120 }}>{k}</span>
                    <span style={{ fontSize: 12, color: "#374151" }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Download */}
            {results.download_path && (
              <button
                onClick={downloadPDF}
                style={{
                  width: "100%", padding: "14px", background: "#16a34a", color: "#fff",
                  border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600,
                  cursor: "pointer", marginBottom: "1rem"
                }}
              >
                ⬇ Download Optimized PDF (with metadata)
              </button>
            )}

            {/* Rewritten text preview */}
            {results.rewritten_text && (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1.25rem" }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 10px" }}>Optimized Resume Preview</p>
                <pre style={{
                  fontSize: 11, color: "#374151", whiteSpace: "pre-wrap", wordBreak: "break-word",
                  background: "#f9fafb", borderRadius: 8, padding: "1rem", maxHeight: 400, overflowY: "auto", margin: 0
                }}>
                  {results.rewritten_text}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "2rem 0 1rem", borderTop: "1px solid #e5e7eb", marginTop: "2rem" }}>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 4px" }}>
            JumpLite Resume Optimizer — Built by JumpLite Tech Nonprofit
          </p>
          <p style={{ fontSize: 11, color: "#d1d5db", margin: 0 }}>
            Open source · Free forever · No data stored · Your resume never leaves your device
          </p>
        </div>
      </div>
    </div>
  );
}
