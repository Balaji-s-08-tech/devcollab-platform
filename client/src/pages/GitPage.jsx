import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { gitAPI } from "../services/api";
import toast from "react-hot-toast";
import { GitBranch, GitCommit, GitPullRequest, Upload, Download, Plus, Trash2, RefreshCw, Eye, Code2 } from "lucide-react";

const STATUS_COLORS = {
  ready: "#22c55e",
  cloning: "#f59e0b",
  pending: "#6366f1",
  error: "#ef4444",
};

function TerminalLog({ lines = [], title = "Output" }) {
  const endRef = useRef(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [lines]);
  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <div className="terminal-dots">
          <span /><span /><span />
        </div>
        <span className="terminal-title">{title}</span>
      </div>
      <div className="terminal-body">
        {lines.length === 0 ? (
          <span className="terminal-placeholder">
        ) : (
          lines.map((line, i) => (
            <div key={i} className={`terminal-line ${line.startsWith("✔") ? "success" : line.startsWith("✗") || line.toLowerCase().includes("error") ? "error" : ""}`}>
              <span className="terminal-prompt">$</span> {line}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function CommitCard({ commit }) {
  const short = commit.hash?.slice(0, 7);
  const date = new Date(commit.date).toLocaleDateString();
  return (
    <div className="commit-card">
      <div className="commit-hash">{short}</div>
      <div className="commit-info">
        <p className="commit-message">{commit.message}</p>
        <div className="commit-meta">
          <span>{commit.author_name || commit.author}</span>
          <span>•</span>
          <span>{date}</span>
        </div>
      </div>
    </div>
  );
}

export default function GitPage() {
  const { projectId } = useParams();
  const [repos, setRepos] = useState([]);
  const [activeRepo, setActiveRepo] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [view, setView] = useState("history");
  const [diff, setDiff] = useState("");
  const [loading, setLoading] = useState(false);

  const [showClone, setShowClone] = useState(false);
  const [cloneForm, setCloneForm] = useState({ repoUrl: "", name: "", branch: "main", token: "" });
  const [commitMsg, setCommitMsg] = useState("");
  const [showCommit, setShowCommit] = useState(false);

  useEffect(() => {
    loadRepos();
  }, [projectId]);

  const loadRepos = async () => {
    try {
      const { data } = await gitAPI.listRepos({ projectId });
      setRepos(data.repos || []);
    } catch {  }
  };

  const selectRepo = async (repo) => {
    setActiveRepo(repo);
    setLogs([]);
    await loadHistory(repo._id);
    await loadStatus(repo._id);
  };

  const loadHistory = async (repoId) => {
    try {
      const { data } = await gitAPI.getHistory({ repoId, limit: 20 });
      setHistory(data.commits || []);
    } catch {  }
  };

  const loadStatus = async (repoId) => {
    try {
      const { data } = await gitAPI.getStatus({ repoId });
      setStatus(data.status);
    } catch {  }
  };

  const loadDiff = async (staged = false) => {
    if (!activeRepo) return;
    try {
      const { data } = await gitAPI.getDiff({ repoId: activeRepo._id, staged });
      setDiff(data.diff || "No changes detected.");
    } catch {  }
  };

  const handleClone = async () => {
    if (!cloneForm.repoUrl || !cloneForm.name) return toast.error("URL and name are required");
    setLoading(true);
    try {
      const { data } = await gitAPI.clone({ ...cloneForm, projectId });
      toast.success(`Cloning "${cloneForm.name}"... check back shortly`);
      setLogs([`▶ Clone started for ${cloneForm.name}`, `📁 Will be available once ready`]);
      setShowClone(false);
      setCloneForm({ repoUrl: "", name: "", branch: "main", token: "" });
      loadRepos();
    } catch (err) {
      toast.error(err.response?.data?.message || "Clone failed");
      setLogs([`✗ Clone failed: ${err.response?.data?.message || err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const handlePull = async () => {
    if (!activeRepo) return;
    setLoading(true);
    setLogs(["▶ Pulling from remote..."]);
    try {
      const { data } = await gitAPI.pull({ repoId: activeRepo._id });
      setLogs(data.lines || ["✔ Pull complete"]);
      toast.success("Pull successful");
      await loadHistory(activeRepo._id);
      await loadStatus(activeRepo._id);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setLogs([`✗ Pull failed: ${msg}`]);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMsg.trim()) return toast.error("Commit message required");
    setLoading(true);
    setLogs(["▶ Staging changes and committing..."]);
    try {
      const { data } = await gitAPI.commit({ repoId: activeRepo._id, message: commitMsg });
      setLogs(data.lines || ["✔ Committed"]);
      setCommitMsg("");
      setShowCommit(false);
      toast.success("Commit successful");
      await loadHistory(activeRepo._id);
      await loadStatus(activeRepo._id);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setLogs([`✗ Commit failed: ${msg}`]);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async () => {
    if (!activeRepo) return;
    setLoading(true);
    setLogs(["▶ Pushing to remote..."]);
    try {
      const { data } = await gitAPI.push({ repoId: activeRepo._id });
      setLogs(data.lines || ["✔ Push successful"]);
      toast.success("Push successful");
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setLogs([`✗ Push failed: ${msg}`]);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (repo) => {
    if (!confirm(`Remove "${repo.name}" from workspace?`)) return;
    try {
      await gitAPI.deleteRepo(repo._id);
      toast.success("Repository removed");
      if (activeRepo?._id === repo._id) setActiveRepo(null);
      loadRepos();
    } catch {
      toast.error("Failed to remove repository");
    }
  };

  return (
    <div className="git-page">
      <style>{`
        .git-page { display: grid; grid-template-columns: 280px 1fr; height: 100%; gap: 0; background: var(--bg-primary); }
        .git-sidebar { background: var(--bg-secondary); border-right: 1px solid var(--border); padding: 1.5rem 1rem; display: flex; flex-direction: column; gap: 1rem; overflow-y: auto; }
        .git-header { display: flex; align-items: center; justify-content: space-between; padding: 0 0.5rem; }
        .git-header h2 { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .repo-item { padding: 0.75rem; border-radius: 10px; cursor: pointer; transition: background 0.15s; border: 1px solid transparent; }
        .repo-item:hover { background: var(--bg-tertiary); }
        .repo-item.active { background: rgba(99,102,241,0.12); border-color: rgba(99,102,241,0.3); }
        .repo-item-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
        .repo-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .repo-name { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
        .repo-branch { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
        .git-main { display: flex; flex-direction: column; overflow: hidden; }
        .git-toolbar { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); background: var(--bg-secondary); flex-wrap: wrap; }
        .git-repo-title { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); flex: 1; }
        .git-ops-btn { display: flex; align-items: center; gap: 6px; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; }
        .btn-pull { background: rgba(34,197,94,0.15); color: #22c55e; }
        .btn-pull:hover { background: rgba(34,197,94,0.25); }
        .btn-commit { background: rgba(99,102,241,0.15); color: #818cf8; }
        .btn-commit:hover { background: rgba(99,102,241,0.25); }
        .btn-push { background: rgba(245,158,11,0.15); color: #f59e0b; }
        .btn-push:hover { background: rgba(245,158,11,0.25); }
        .git-content { flex: 1; display: grid; grid-template-rows: 1fr auto; overflow: hidden; padding: 1.5rem; gap: 1rem; }
        .git-view-tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
        .view-tab { padding: 0.4rem 0.9rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--text-muted); transition: all 0.15s; }
        .view-tab.active { background: rgba(99,102,241,0.2); color: #818cf8; border-color: rgba(99,102,241,0.4); }
        .commit-list { overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; }
        .commit-card { display: grid; grid-template-columns: 80px 1fr; gap: 0.75rem; padding: 0.75rem 1rem; background: var(--bg-secondary); border-radius: 10px; border: 1px solid var(--border); transition: border-color 0.15s; }
        .commit-card:hover { border-color: rgba(99,102,241,0.3); }
        .commit-hash { font-family: monospace; font-size: 0.82rem; color: #818cf8; padding-top: 0.1rem; }
        .commit-message { font-size: 0.88rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.25rem; }
        .commit-meta { display: flex; gap: 0.5rem; font-size: 0.75rem; color: var(--text-muted); }
        .diff-view { font-family: monospace; font-size: 0.8rem; background: var(--bg-secondary); padding: 1rem; border-radius: 10px; border: 1px solid var(--border); overflow: auto; white-space: pre; color: var(--text-secondary); max-height: 400px; }
        .status-grid { display: grid; gap: 0.5rem; }
        .status-file { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; background: var(--bg-secondary); border-radius: 8px; font-size: 0.82rem; }
        .status-badge { padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; }
        .status-M { background: rgba(245,158,11,0.2); color: #f59e0b; }
        .status-A { background: rgba(34,197,94,0.2); color: #22c55e; }
        .status-D { background: rgba(239,68,68,0.2); color: #ef4444; }
        .status-? { background: rgba(99,102,241,0.2); color: #818cf8; }
        .terminal-panel { border-radius: 12px; overflow: hidden; border: 1px solid var(--border); font-family: monospace; background: #0d0d14; }
        .terminal-header { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 1rem; background: #1a1a24; border-bottom: 1px solid #2a2a38; }
        .terminal-dots { display: flex; gap: 6px; } .terminal-dots span { width: 12px; height: 12px; border-radius: 50%; background: #3a3a4a; }
        .terminal-title { font-size: 0.78rem; color: #6b7280; }
        .terminal-body { padding: 1rem; min-height: 80px; max-height: 200px; overflow-y: auto; }
        .terminal-placeholder { color: #3a3a4a; font-size: 0.82rem; }
        .terminal-line { font-size: 0.82rem; color: #a0aec0; padding: 2px 0; display: flex; gap: 0.5rem; }
        .terminal-line.success { color: #22c55e; }
        .terminal-line.error { color: #ef4444; }
        .terminal-prompt { color: #6366f1; }
        .clone-form-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); }
        .clone-form { background: var(--bg-secondary); border-radius: 16px; padding: 2rem; width: 480px; border: 1px solid var(--border); }
        .clone-form h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--text-primary); }
        .form-field { margin-bottom: 1rem; }
        .form-field label { display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.4rem; font-weight: 600; }
        .form-input { width: 100%; padding: 0.6rem 0.9rem; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); font-size: 0.88rem; outline: none; transition: border-color 0.15s; }
        .form-input:focus { border-color: #6366f1; }
        .form-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; justify-content: flex-end; }
        .btn-primary { padding: 0.6rem 1.25rem; background: #6366f1; color: #fff; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; font-size: 0.88rem; }
        .btn-cancel { padding: 0.6rem 1.25rem; background: transparent; color: var(--text-muted); border-radius: 8px; border: 1px solid var(--border); cursor: pointer; font-size: 0.88rem; }
        .commit-input-row { display: flex; gap: 0.75rem; align-items: center; }
        .commit-input { flex: 1; padding: 0.6rem 0.9rem; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); font-size: 0.88rem; outline: none; }
        .commit-input:focus { border-color: #6366f1; }
        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 1rem; color: var(--text-muted); }
        .empty-icon { font-size: 3rem; opacity: 0.4; }
        .empty-state h3 { font-size: 1.1rem; font-weight: 600; color: var(--text-secondary); }
        .delete-btn { opacity: 0; padding: 4px; border-radius: 6px; background: transparent; border: none; cursor: pointer; color: #ef4444; transition: opacity 0.15s; }
        .repo-item:hover .delete-btn { opacity: 1; }
      `}</style>

      {}
      <div className="git-sidebar">
        <div className="git-header">
          <h2>Repositories</h2>
          <button className="btn-primary" style={{ padding: "6px 12px", fontSize: "0.8rem", borderRadius: 8 }} onClick={() => setShowClone(true)}>
            <Plus size={14} />
          </button>
        </div>

        {repos.length === 0 ? (
          <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
            No repositories yet.<br />Click + to clone one.
          </div>
        ) : (
          repos.map((repo) => (
            <div
              key={repo._id}
              className={`repo-item ${activeRepo?._id === repo._id ? "active" : ""}`}
              onClick={() => selectRepo(repo)}
            >
              <div className="repo-item-header">
                <span className="repo-status-dot" style={{ background: STATUS_COLORS[repo.cloneStatus] || "#6b7280" }} />
                <span className="repo-name">{repo.name}</span>
                <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(repo); }}>
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="repo-branch">
                <GitBranch size={11} />
                <span>{repo.currentBranch}</span>
                {repo.cloneStatus !== "ready" && <span style={{ color: STATUS_COLORS[repo.cloneStatus] }}>({repo.cloneStatus})</span>}
              </div>
              {repo.lastCommit && (
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {repo.lastCommit.message}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {}
      <div className="git-main">
        {!activeRepo ? (
          <div className="empty-state">
            <div className="empty-icon">🗂️</div>
            <h3>Select a repository</h3>
            <p style={{ fontSize: "0.85rem" }}>or clone a new one with the + button</p>
            <button className="btn-primary" onClick={() => setShowClone(true)} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
              <Plus size={15} /> Clone Repository
            </button>
          </div>
        ) : (
          <>
            <div className="git-toolbar">
              <span className="git-repo-title">
                <GitBranch size={16} style={{ display: "inline", marginRight: 6, color: "#818cf8" }} />
                {activeRepo.name}
              </span>
              <button className="git-ops-btn btn-pull" onClick={handlePull} disabled={loading}>
                <Download size={14} /> Pull
              </button>
              <button className="git-ops-btn btn-commit" onClick={() => setShowCommit(!showCommit)} disabled={loading}>
                <GitCommit size={14} /> Commit
              </button>
              <button className="git-ops-btn btn-push" onClick={handlePush} disabled={loading}>
                <Upload size={14} /> Push
              </button>
              <button className="git-ops-btn" style={{ background: "rgba(99,102,241,0.08)", color: "var(--text-muted)" }} onClick={() => { loadHistory(activeRepo._id); loadStatus(activeRepo._id); }} disabled={loading}>
                <RefreshCw size={13} />
              </button>
            </div>

            {showCommit && (
              <div style={{ padding: "0.75rem 1.5rem", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
                <div className="commit-input-row">
                  <input
                    className="commit-input"
                    placeholder="Commit message…"
                    value={commitMsg}
                    onChange={(e) => setCommitMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCommit()}
                  />
                  <button className="btn-primary" onClick={handleCommit} disabled={loading}>
                    {loading ? "…" : "Commit"}
                  </button>
                  <button className="btn-cancel" onClick={() => setShowCommit(false)}>Cancel</button>
                </div>
              </div>
            )}

            <div className="git-content">
              <div>
                <div className="git-view-tabs">
                  {["history", "status", "diff"].map((v) => (
                    <button
                      key={v}
                      className={`view-tab ${view === v ? "active" : ""}`}
                      onClick={() => { setView(v); if (v === "diff") loadDiff(); }}
                    >
                      {v === "history" ? <><GitCommit size={12} style={{ marginRight: 4 }} />History</> :
                        v === "status" ? <><Eye size={12} style={{ marginRight: 4 }} />Status</> :
                          <><Code2 size={12} style={{ marginRight: 4 }} />Diff</>}
                    </button>
                  ))}
                </div>

                {view === "history" && (
                  <div className="commit-list">
                    {history.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "1rem" }}>No commits yet.</div>
                    ) : (
                      history.map((c) => <CommitCard key={c.hash} commit={c} />)
                    )}
                  </div>
                )}

                {view === "status" && (
                  <div className="status-grid">
                    {!status ? (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading status…</div>
                    ) : status.files?.length === 0 ? (
                      <div style={{ color: "#22c55e", fontSize: "0.85rem" }}>Working tree clean ✔</div>
                    ) : (
                      status.files?.map((f, i) => (
                        <div key={i} className="status-file">
                          <span className={`status-badge status-${f.working_dir || "?"}`}>{f.working_dir || "?"}</span>
                          <span style={{ fontFamily: "monospace", fontSize: "0.83rem", color: "var(--text-secondary)" }}>{f.path}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {view === "diff" && (
                  <div className="diff-view">{diff || "Loading diff…"}</div>
                )}
              </div>

              <TerminalLog lines={logs} title="Git Console" />
            </div>
          </>
        )}
      </div>

      {}
      {showClone && (
        <div className="clone-form-overlay" onClick={() => setShowClone(false)}>
          <div className="clone-form" onClick={(e) => e.stopPropagation()}>
            <h3>🔗 Clone Repository</h3>
            {["repoUrl", "name", "branch", "token"].map((field) => (
              <div className="form-field" key={field}>
                <label>{field === "repoUrl" ? "Repository URL" : field === "token" ? "Access Token (optional)" : field === "branch" ? "Branch" : "Repository Name"}</label>
                <input
                  className="form-input"
                  type={field === "token" ? "password" : "text"}
                  placeholder={field === "repoUrl" ? "https://github.com/user/repo.git" : field === "token" ? "ghp_xxxx" : field === "branch" ? "main" : "my-repo"}
                  value={cloneForm[field]}
                  onChange={(e) => setCloneForm((f) => ({ ...f, [field]: e.target.value }))}
                />
              </div>
            ))}
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setShowClone(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleClone} disabled={loading}>
                {loading ? "Cloning…" : "Clone"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
