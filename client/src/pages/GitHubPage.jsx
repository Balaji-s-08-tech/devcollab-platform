import { useState, useEffect } from "react";
import { githubAPI } from "../services/api";
import toast from "react-hot-toast";
import { Github, Star, GitFork, ExternalLink, RefreshCw, GitCommit, AlertCircle, Unlink, Link2, Code2 } from "lucide-react";

function LanguageBadge({ language }) {
  const colors = {
    JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5",
    Java: "#b07219", "C++": "#f34b7d", Go: "#00ADD8", Rust: "#dea584",
    CSS: "#563d7c", HTML: "#e34c26", Shell: "#89e051",
  };
  const color = colors[language] || "#6b7280";
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", color: "var(--text-muted)" }}>
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {language}
    </span>
  );
}

function RepoCard({ repo, onViewCommits, onSyncIssues, syncing }) {
  const updated = new Date(repo.updated_at).toLocaleDateString();

  return (
    <div className="gh-repo-card">
      <div className="gh-repo-header">
        <div className="gh-repo-name-row">
          <Code2 size={15} style={{ color: "#818cf8", flexShrink: 0 }} />
          <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="gh-repo-name">
            {repo.full_name}
          </a>
          {repo.private && <span className="private-badge">private</span>}
        </div>
        <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="external-link-btn">
          <ExternalLink size={13} />
        </a>
      </div>
      {repo.description && <p className="gh-repo-desc">{repo.description}</p>}
      <div className="gh-repo-stats">
        {repo.language && <LanguageBadge language={repo.language} />}
        <span className="gh-stat"><Star size={12} /> {repo.stargazers_count}</span>
        <span className="gh-stat"><GitFork size={12} /> {repo.forks_count}</span>
        <span className="gh-stat" style={{ marginLeft: "auto", fontSize: "0.72rem" }}>Updated {updated}</span>
      </div>
      <div className="gh-repo-actions">
        <button className="gh-action-btn" onClick={() => onViewCommits(repo)}>
          <GitCommit size={13} /> Commits
        </button>
        <button className="gh-action-btn accent" onClick={() => onSyncIssues(repo)} disabled={syncing}>
          <AlertCircle size={13} /> {syncing ? "Syncing…" : "Sync Issues"}
        </button>
      </div>
    </div>
  );
}

function CommitList({ commits, repoFullName, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="commits-modal" onClick={(e) => e.stopPropagation()}>
        <div className="commits-modal-header">
          <h3><GitCommit size={16} style={{ color: "#818cf8" }} /> Commits — {repoFullName}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="commits-list">
          {commits.map((c) => (
            <div key={c.sha} className="gh-commit-item">
              <div className="gh-commit-hash">{c.sha?.slice(0, 7)}</div>
              <div className="gh-commit-info">
                <a href={c.html_url} target="_blank" rel="noopener noreferrer" className="gh-commit-msg">
                  {c.commit?.message?.split("\n")[0]}
                </a>
                <div className="gh-commit-meta">
                  <img src={c.author?.avatar_url} alt="" width={16} height={16} style={{ borderRadius: "50%" }} />
                  <span>{c.commit?.author?.name}</span>
                  <span>·</span>
                  <span>{new Date(c.commit?.author?.date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GitHubPage() {
  const [status, setStatus] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [commits, setCommits] = useState([]);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [syncingRepo, setSyncingRepo] = useState(null);
  const [sort, setSort] = useState("updated");
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    checkStatus();

    const parts = window.location.pathname.split("/");
    const idx = parts.indexOf("projects");
    if (idx !== -1) setProjectId(parts[idx + 1] || "");

    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      toast.success("GitHub connected successfully!");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("error")) {
      toast.error(`GitHub connection failed: ${params.get("error")}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const checkStatus = async () => {
    try {
      const { data } = await githubAPI.getStatus();
      setStatus(data);
      if (data.connected) loadRepos();
    } catch {  }
  };

  const loadRepos = async () => {
    setLoading(true);
    try {
      const { data } = await githubAPI.getRepos({ sort });
      setRepos(data.repos || []);
    } catch {
      toast.error("Failed to load repositories");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = githubAPI.getAuthUrl();
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect GitHub? This will remove your access token from DevCollab.")) return;
    try {
      await githubAPI.disconnect();
      setStatus({ connected: false });
      setRepos([]);
      toast.success("GitHub disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const viewCommits = async (repo) => {
    setSelectedRepo(repo);
    setCommitsLoading(true);
    try {
      const { data } = await githubAPI.getRepoCommits(repo.owner.login, repo.name);
      setCommits(data.commits || []);
    } catch {
      toast.error("Failed to load commits");
    } finally {
      setCommitsLoading(false);
    }
  };

  const syncIssues = async (repo) => {
    if (!projectId) return toast.error("Select a project first (navigate from a project page)");
    setSyncingRepo(repo.full_name);
    try {
      const { data } = await githubAPI.syncIssues(repo.owner.login, repo.name, { projectId });
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || "Sync failed");
    } finally {
      setSyncingRepo(null);
    }
  };

  const filteredRepos = repos.filter((r) =>
    r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="github-page">
      <style>{`
        .github-page { padding: 2rem; overflow-y: auto; height: 100%; background: var(--bg-primary); }
        .gh-hero { background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06)); border: 1px solid rgba(99,102,241,0.15); border-radius: 20px; padding: 2rem; margin-bottom: 2rem; display: flex; align-items: center; gap: 2rem; }
        .gh-hero-icon { width: 72px; height: 72px; background: linear-gradient(135deg, #1f2937, #111827); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid #374151; flex-shrink: 0; }
        .gh-hero-content h1 { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem; }
        .gh-hero-content p { color: var(--text-muted); font-size: 0.9rem; }
        .gh-status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; margin-top: 0.75rem; }
        .gh-status-badge.connected { background: rgba(34,197,94,0.15); color: #22c55e; }
        .gh-status-badge.disconnected { background: rgba(239,68,68,0.12); color: #ef4444; }
        .gh-hero-actions { margin-left: auto; display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end; }
        .btn-connect { display: flex; align-items: center; gap: 8px; padding: 0.75rem 1.5rem; background: #24292e; color: #fff; border-radius: 10px; border: none; cursor: pointer; font-weight: 700; font-size: 0.9rem; transition: background 0.15s; }
        .btn-connect:hover { background: #1a1f24; }
        .btn-disconnect { display: flex; align-items: center; gap: 6px; padding: 0.5rem 1rem; background: transparent; color: var(--text-muted); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-size: 0.82rem; transition: all 0.15s; }
        .btn-disconnect:hover { border-color: #ef4444; color: #ef4444; }
        .gh-toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .gh-search { flex: 1; min-width: 200px; padding: 0.65rem 1rem; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; color: var(--text-primary); font-size: 0.88rem; outline: none; }
        .gh-search:focus { border-color: #6366f1; }
        .gh-sort { padding: 0.65rem 1rem; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; color: var(--text-primary); font-size: 0.85rem; cursor: pointer; }
        .gh-repos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1rem; }
        .gh-repo-card { background: var(--bg-secondary); border-radius: 14px; padding: 1.25rem; border: 1px solid var(--border); transition: border-color 0.15s, transform 0.15s; }
        .gh-repo-card:hover { border-color: rgba(99,102,241,0.3); transform: translateY(-1px); }
        .gh-repo-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.5rem; }
        .gh-repo-name-row { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
        .gh-repo-name { font-size: 0.9rem; font-weight: 700; color: #818cf8; text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .gh-repo-name:hover { text-decoration: underline; }
        .private-badge { background: rgba(245,158,11,0.15); color: #f59e0b; padding: 1px 6px; border-radius: 10px; font-size: 0.65rem; font-weight: 700; flex-shrink: 0; }
        .external-link-btn { color: var(--text-muted); text-decoration: none; padding: 2px; display: flex; }
        .external-link-btn:hover { color: var(--text-primary); }
        .gh-repo-desc { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.4; }
        .gh-repo-stats { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
        .gh-stat { display: flex; align-items: center; gap: 3px; font-size: 0.75rem; color: var(--text-muted); }
        .gh-repo-actions { display: flex; gap: 0.5rem; }
        .gh-action-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 0.45rem 0; background: var(--bg-tertiary); color: var(--text-muted); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-size: 0.78rem; font-weight: 600; transition: all 0.15s; }
        .gh-action-btn:hover { background: var(--bg-primary); color: var(--text-primary); }
        .gh-action-btn.accent { background: rgba(99,102,241,0.1); color: #818cf8; border-color: rgba(99,102,241,0.2); }
        .gh-action-btn.accent:hover { background: rgba(99,102,241,0.2); }
        .gh-action-btn:disabled { opacity: 0.5; cursor: default; }
        .no-repos { text-align: center; padding: 4rem; color: var(--text-muted); }
        .no-repos p { font-size: 0.9rem; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; }
        .commits-modal { background: var(--bg-secondary); border-radius: 18px; width: 640px; max-height: 80vh; display: flex; flex-direction: column; border: 1px solid var(--border); overflow: hidden; }
        .commits-modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .commits-modal-header h3 { font-size: 1rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
        .close-btn { background: transparent; border: none; cursor: pointer; color: var(--text-muted); font-size: 1.1rem; }
        .commits-list { overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .gh-commit-item { display: grid; grid-template-columns: 70px 1fr; gap: 0.75rem; padding: 0.75rem; background: var(--bg-primary); border-radius: 10px; border: 1px solid var(--border); }
        .gh-commit-hash { font-family: monospace; font-size: 0.8rem; color: #818cf8; padding-top: 2px; }
        .gh-commit-msg { font-size: 0.87rem; color: var(--text-primary); text-decoration: none; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .gh-commit-msg:hover { color: #818cf8; }
        .gh-commit-meta { display: flex; align-items: center; gap: 5px; margin-top: 4px; font-size: 0.72rem; color: var(--text-muted); }
        .not-connected { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; gap: 1.5rem; text-align: center; color: var(--text-muted); }
        .not-connected h3 { font-size: 1.1rem; font-weight: 600; color: var(--text-secondary); }
        .loading-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1rem; }
        .skeleton-card { background: var(--bg-secondary); border-radius: 14px; padding: 1.25rem; border: 1px solid var(--border); height: 140px; animation: skeleton-pulse 1.5s ease-in-out infinite; }
        @keyframes skeleton-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      {}
      <div className="gh-hero">
        <div className="gh-hero-icon">
          <Github size={36} color="#e2e8f0" />
        </div>
        <div className="gh-hero-content">
          <h1>GitHub Integration</h1>
          <p>Connect your GitHub account to browse repos, view commits, and sync issues into DevCollab</p>
          <div className={`gh-status-badge ${status?.connected ? "connected" : "disconnected"}`}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} />
            {status?.connected ? `Connected as @${status.username}` : "Not connected"}
          </div>
        </div>
        <div className="gh-hero-actions">
          {status?.connected ? (
            <>
              <button className="btn-connect" onClick={loadRepos} disabled={loading}>
                <RefreshCw size={15} /> {loading ? "Loading…" : "Refresh Repos"}
              </button>
              <button className="btn-disconnect" onClick={handleDisconnect}>
                <Unlink size={13} /> Disconnect
              </button>
            </>
          ) : (
            <button className="btn-connect" onClick={handleConnect}>
              <Github size={18} /> Connect GitHub
            </button>
          )}
        </div>
      </div>

      {!status?.connected ? (
        <div className="not-connected">
          <Github size={48} style={{ opacity: 0.3 }} />
          <h3>Connect your GitHub account to get started</h3>
          <p style={{ fontSize: "0.85rem", maxWidth: 400 }}>
            Once connected, you can browse all your repositories, view recent commits, and sync GitHub issues directly into your DevCollab project.
          </p>
          <button className="btn-connect" onClick={handleConnect}>
            <Github size={18} /> Connect GitHub
          </button>
        </div>
      ) : (
        <>
          <div className="gh-toolbar">
            <input
              className="gh-search"
              placeholder="Search repositories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="gh-sort" value={sort} onChange={(e) => { setSort(e.target.value); loadRepos(); }}>
              <option value="updated">Recently updated</option>
              <option value="created">Newest created</option>
              <option value="name">Name</option>
              <option value="pushed">Last push</option>
            </select>
          </div>

          {loading ? (
            <div className="loading-grid">
              {[...Array(6)].map((_, i) => <div key={i} className="skeleton-card" />)}
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="no-repos">
              <Github size={40} style={{ opacity: 0.3, margin: "0 auto 1rem" }} />
              <p>{search ? `No repos match "${search}"` : "No repositories found"}</p>
            </div>
          ) : (
            <div className="gh-repos-grid">
              {filteredRepos.map((repo) => (
                <RepoCard
                  key={repo.id}
                  repo={repo}
                  onViewCommits={viewCommits}
                  onSyncIssues={syncIssues}
                  syncing={syncingRepo === repo.full_name}
                />
              ))}
            </div>
          )}
        </>
      )}

      {selectedRepo && (
        <CommitList
          commits={commitsLoading ? [] : commits}
          repoFullName={selectedRepo.full_name}
          onClose={() => { setSelectedRepo(null); setCommits([]); }}
        />
      )}
    </div>
  );
}
