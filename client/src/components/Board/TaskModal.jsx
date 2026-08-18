import { useState, useEffect } from "react";
import { X, Calendar, User, Tag, CheckSquare, MessageSquare, Trash2, Link2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTaskStore } from "../../context/stores";
import { taskAPI } from "../../services/api";
import Avatar from "../common/Avatar";
import useAuthStore from "../../context/authStore";
import toast from "react-hot-toast";
import clsx from "clsx";

const STATUSES = ["backlog","todo","in_progress","in_review","done","cancelled"];
const PRIORITIES = ["none","low","medium","high","urgent"];

export default function TaskModal({ task: initialTask, projectId, onClose }) {
  const { updateTask, deleteTask } = useTaskStore();
  const { user } = useAuthStore();
  const [task, setTask] = useState(initialTask);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    taskAPI.get(initialTask._id).then(({ data }) => setTask(data.data)).catch(() => {});
  }, [initialTask._id]);

  const handleUpdate = async (field, value) => {
    setTask((t) => ({ ...t, [field]: value }));
    try {
      const updated = await updateTask(task._id, { [field]: value });
      setTask(updated);
    } catch { toast.error("Update failed"); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this task?")) return;
    await deleteTask(task._id);
    toast.success("Task deleted");
    onClose();
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSaving(true);
    try {
      const { data } = await taskAPI.addComment(task._id, { content: comment });
      setTask((t) => ({ ...t, comments: [...(t.comments || []), data.data] }));
      setComment("");
    } catch { toast.error("Failed to post comment"); }
    setSaving(false);
  };

  const toggleChecklist = async (idx) => {
    const updated = task.checklist.map((item, i) =>
      i === idx ? { ...item, completed: !item.completed } : item
    );
    setTask((t) => ({ ...t, checklist: updated }));
    await taskAPI.update(task._id, { checklist: updated });
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface-800 border border-surface-500 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up">
        {}
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-surface-600">
          <div className="flex-1 pr-4">
            <input
              className="bg-transparent text-lg font-semibold text-white w-full outline-none 
                         border-b border-transparent focus:border-brand-500 pb-1 transition-colors"
              value={task.title}
              onChange={(e) => setTask((t) => ({ ...t, title: e.target.value }))}
              onBlur={(e) => handleUpdate("title", e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleDelete} className="btn-icon text-slate-500 hover:text-red-400">
              <Trash2 size={15} />
            </button>
            <button onClick={onClose} className="btn-icon">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {}
            <div>
              <label className="label">Description</label>
              <textarea
                className="input resize-none h-28 text-sm"
                value={task.description || ""}
                onChange={(e) => setTask((t) => ({ ...t, description: e.target.value }))}
                onBlur={(e) => handleUpdate("description", e.target.value)}
                placeholder="Add a description..."
              />
            </div>

            {}
            {task.checklist?.length > 0 && (
              <div>
                <label className="label flex items-center gap-2">
                  <CheckSquare size={12} /> Checklist
                  <span className="text-slate-600 normal-case font-normal">
                    {task.checklist.filter((c) => c.completed).length}/{task.checklist.length}
                  </span>
                </label>
                <div className="space-y-2 mt-2">
                  {task.checklist.map((item, idx) => (
                    <label key={idx} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => toggleChecklist(idx)}
                        className="w-4 h-4 rounded border-surface-400 bg-surface-600 accent-brand-500"
                      />
                      <span className={clsx("text-sm transition-all", item.completed && "line-through text-slate-500")}>
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {}
            <div>
              <label className="label flex items-center gap-2">
                <MessageSquare size={12} /> Comments ({task.comments?.length || 0})
              </label>
              <div className="space-y-3 mt-2">
                {task.comments?.map((c) => (
                  <div key={c._id} className="flex gap-3">
                    <Avatar user={c.author} size="sm" className="flex-shrink-0 mt-0.5" />
                    <div className="flex-1 bg-surface-700 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-white">{c.author?.name}</span>
                        <span className="text-xs text-slate-600">
                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleComment} className="flex gap-2 mt-3">
                <Avatar user={user} size="sm" className="flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <input
                    className="input text-sm"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                  />
                </div>
                <button type="submit" disabled={!comment.trim() || saving} className="btn-primary btn-sm">
                  Send
                </button>
              </form>
            </div>
          </div>

          {}
          <div className="w-52 flex-shrink-0 border-l border-surface-600 p-4 space-y-4 overflow-y-auto">
            <div>
              <label className="label">Status</label>
              <select
                className="input text-xs"
                value={task.status}
                onChange={(e) => handleUpdate("status", e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Priority</label>
              <select
                className="input text-xs"
                value={task.priority}
                onChange={(e) => handleUpdate("priority", e.target.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Due Date</label>
              <input
                type="date"
                className="input text-xs"
                value={task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""}
                onChange={(e) => handleUpdate("dueDate", e.target.value || null)}
              />
            </div>

            <div>
              <label className="label">Assignees</label>
              <div className="flex -space-x-1.5 mt-1">
                {task.assignees?.map((u) => (
                  <Avatar key={u._id} user={u} size="sm" className="ring-2 ring-surface-800" title={u.name} />
                ))}
                {(!task.assignees || task.assignees.length === 0) && (
                  <span className="text-xs text-slate-600">Unassigned</span>
                )}
              </div>
            </div>

            <div>
              <label className="label">Created</label>
              <p className="text-xs text-slate-500">
                {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
