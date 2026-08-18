import { useState } from "react";
import Modal from "../common/Modal";
import { useIssueStore } from "../../context/stores";
import toast from "react-hot-toast";

const TYPES = ["bug","feature","enhancement","documentation","question","task","other"];
const PRIORITIES = ["none","low","medium","high","critical"];

export default function NewIssueModal({ projectId, onClose }) {
  const { createIssue } = useIssueStore();
  const [form, setForm] = useState({ title: "", body: "", type: "bug", priority: "none" });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handle = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      await createIssue({ ...form, project: projectId });
      toast.success("Issue created");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create issue");
    }
    setLoading(false);
  };

  return (
    <Modal title="New Issue" onClose={onClose} size="lg">
      <form onSubmit={handle} className="p-6 space-y-4">
        <div>
          <label className="label">Title *</label>
          <input className="input" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Issue title" required autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={e => set("type", e.target.value)}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={e => set("priority", e.target.value)}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input resize-none h-40 font-mono text-sm" value={form.body}
            onChange={e => set("body", e.target.value)} placeholder="Describe the issue in detail... (Markdown supported)" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={loading || !form.title.trim()} className="btn-primary flex-1">
            {loading ? "Submitting..." : "Submit Issue"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
