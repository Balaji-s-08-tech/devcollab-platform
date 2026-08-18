import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, Trash2, Archive, Link, AlertTriangle } from "lucide-react";
import { useProjectStore } from "../context/stores";
import { PageSpinner } from "../components/common/Spinner";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { currentProject, fetchProject, updateProject, deleteProject } = useProjectStore();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProject(projectId).then(p => {
      setForm({
        name: p.name, description: p.description || "", icon: p.icon, color: p.color,
        visibility: p.visibility, status: p.status, githubRepo: p.githubRepo || "",
        settings: p.settings || { enableIssues: true, enableDocs: true, enableBoard: true },
      });
    });
  }, [projectId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProject(projectId, form);
      toast.success("Settings saved");
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  };

  const handleDelete = async () => {
    const name = prompt(`Type "${currentProject?.name}" to confirm deletion:`);
    if (name !== currentProject?.name) return;
    await deleteProject(projectId);
    toast.success("Project deleted");
    navigate("/dashboard");
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setSetting = (k, v) => setForm(p => ({ ...p, settings: { ...p.settings, [k]: v } }));

  if (!form) return <PageSpinner />;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-display font-bold text-white">Project Settings</h1>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-white">General</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Project Name</label>
              <input className="input" value={form.name} onChange={e => set("name", e.target.value)} required />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none h-20" value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
          <div>
            <label className="label">Visibility</label>
            <select className="input" value={form.visibility} onChange={e => set("visibility", e.target.value)}>
              <option value="private">Private</option>
              <option value="internal">Internal</option>
              <option value="public">Public</option>
            </select>
          </div>
          <div>
            <label className="label flex items-center gap-1.5"><Link size={12} /> GitHub Repository URL</label>
            <input className="input font-mono text-sm" value={form.githubRepo} onChange={e => set("githubRepo", e.target.value)} placeholder="https://github.com/org/repo" />
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-white">Features</h2>
          {[
            { key: "enableIssues", label: "Issue Tracker", desc: "GitHub-style issue tracking" },
            { key: "enableBoard", label: "Kanban Board", desc: "Drag-and-drop task management" },
            { key: "enableDocs", label: "Documents", desc: "Notion-style rich text pages" },
          ].map(({ key, label, desc }) => (
            <label key={key} className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <div
                onClick={() => setSetting(key, !form.settings[key])}
                className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${form.settings[key] ? "bg-brand-600" : "bg-surface-500"}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${form.settings[key] ? "translate-x-6" : "translate-x-1"}`} />
              </div>
            </label>
          ))}
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
          <Save size={15} /> {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {}
      <div className="card border-red-500/30 p-6">
        <h2 className="font-semibold text-red-400 flex items-center gap-2 mb-4">
          <AlertTriangle size={16} /> Danger Zone
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Delete Project</p>
            <p className="text-xs text-slate-500">This action cannot be undone. All data will be permanently deleted.</p>
          </div>
          <button onClick={handleDelete} className="btn-danger btn-sm">
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
