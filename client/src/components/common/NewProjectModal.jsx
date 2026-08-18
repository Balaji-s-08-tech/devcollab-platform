import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "./Modal";
import { useProjectStore } from "../../context/stores";
import toast from "react-hot-toast";

const ICONS = ["🚀", "⚡", "🔥", "🎯", "💎", "🛠", "🌐", "📱", "🤖", "🎨"];
const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

export default function NewProjectModal({ onClose }) {
  const navigate = useNavigate();
  const { createProject } = useProjectStore();
  const [form, setForm] = useState({ name: "", description: "", icon: "🚀", color: "#6366f1", visibility: "private" });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const project = await createProject(form);
      toast.success(`Project "${project.name}" created!`);
      navigate(`/projects/${project._id}`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="New Project" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {}
        <div className="flex gap-3">
          <div>
            <label className="label">Icon</label>
            <div className="w-12 h-10 bg-surface-600 border border-surface-400 rounded-lg flex items-center justify-center text-xl cursor-pointer">
              {form.icon}
            </div>
          </div>
          <div className="flex-1">
            <label className="label">Project Name *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Backend API"
              required
              autoFocus
            />
          </div>
        </div>

        {}
        <div>
          <label className="label">Choose Icon</label>
          <div className="flex gap-2 flex-wrap">
            {ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => set("icon", ic)}
                className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all ${
                  form.icon === ic ? "bg-brand-600/30 ring-2 ring-brand-500" : "bg-surface-600 hover:bg-surface-500"
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        {}
        <div>
          <label className="label">Color</label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("color", c)}
                className={`w-7 h-7 rounded-full transition-all ${
                  form.color === c ? "ring-2 ring-white ring-offset-2 ring-offset-surface-800" : ""
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {}
        <div>
          <label className="label">Description</label>
          <textarea
            className="input resize-none h-20"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What is this project about?"
          />
        </div>

        {}
        <div>
          <label className="label">Visibility</label>
          <select className="input" value={form.visibility} onChange={(e) => set("visibility", e.target.value)}>
            <option value="private">🔒 Private — only members</option>
            <option value="internal">🏢 Internal — all team members</option>
            <option value="public">🌐 Public — anyone</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={loading || !form.name.trim()} className="btn-primary flex-1">
            {loading ? "Creating..." : "Create Project"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
