import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, Circle, MessageSquare, Trash2, Edit2, Check, X } from "lucide-react";
import { issueAPI } from "../services/api";
import { useIssueStore } from "../context/stores";
import { joinIssue, leaveIssue } from "../services/socket";
import useAuthStore from "../context/authStore";
import Avatar from "../components/common/Avatar";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PageSpinner } from "../components/common/Spinner";
import toast from "react-hot-toast";

export default function IssuePage() {
  const { projectId, issueId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { updateIssue, deleteIssue } = useIssueStore();
  const [issue, setIssue] = useState(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    issueAPI.get(issueId).then(({ data }) => { setIssue(data.data); setLoading(false); });
    joinIssue(issueId);
    return () => leaveIssue(issueId);
  }, [issueId]);

  const toggleState = async () => {
    const newState = issue.state === "open" ? "closed" : "open";
    const updated = await updateIssue(issue._id, { state: newState });
    setIssue(updated);
    toast.success(`Issue ${newState}`);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSending(true);
    try {
      const { data } = await issueAPI.addComment(issue._id, { content: comment });
      setIssue(i => ({ ...i, comments: [...(i.comments || []), data.data] }));
      setComment("");
    } catch { toast.error("Failed to post comment"); }
    setSending(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this issue?")) return;
    await deleteIssue(issue._id);
    navigate(`/projects/${projectId}/issues`);
    toast.success("Issue deleted");
  };

  if (loading) return <PageSpinner />;
  if (!issue) return <div className="p-6 text-slate-400">Issue not found</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link to={`/projects/${projectId}/issues`} className="flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors mb-6">
        <ArrowLeft size={15} /> Back to Issues
      </Link>

      {}
      <div className="flex items-start gap-3 mb-6">
        {issue.state === "open"
          ? <Circle size={22} className="text-green-400 flex-shrink-0 mt-1" />
          : <CheckCircle size={22} className="text-slate-400 flex-shrink-0 mt-1" />
        }
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-white">{issue.title}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
            <span className={`badge ${issue.state === "open" ? "badge-open" : "badge-closed"}`}>{issue.state}</span>
            <span>#{issue.number}</span>
            <span>opened by <span className="text-slate-300">{issue.author?.name}</span></span>
            <span>{formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleState} className={`btn-sm ${issue.state === "open" ? "btn-ghost" : "btn-primary"}`}>
            {issue.state === "open" ? <><X size={13} /> Close</> : <><Check size={13} /> Reopen</>}
          </button>
          <button onClick={handleDelete} className="btn-icon text-slate-500 hover:text-red-400">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {}
        <div className="col-span-2 space-y-6">
          {}
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-surface-600">
              <Avatar user={issue.author} size="sm" />
              <span className="font-medium text-white text-sm">{issue.author?.name}</span>
              <span className="text-xs text-slate-500">{formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}</span>
            </div>
            {issue.body ? (
              <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{issue.body}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-slate-600 italic text-sm">No description provided.</p>
            )}
          </div>

          {}
          {issue.comments?.map((c) => (
            <div key={c._id} className="card p-5">
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-surface-600">
                <Avatar user={c.author} size="sm" />
                <span className="font-medium text-white text-sm">{c.author?.name}</span>
                <span className="text-xs text-slate-500">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
              </div>
              <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.content}</ReactMarkdown>
              </div>
            </div>
          ))}

          {}
          <div className="flex gap-3">
            <Avatar user={user} size="sm" className="flex-shrink-0 mt-1" />
            <form onSubmit={handleComment} className="flex-1">
              <textarea
                className="input resize-none h-28 text-sm mb-2"
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Leave a comment... (Markdown supported)"
              />
              <div className="flex justify-end">
                <button type="submit" disabled={!comment.trim() || sending} className="btn-primary btn-sm">
                  {sending ? "Posting..." : "Comment"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {}
        <div className="space-y-4">
          <div className="card p-4 space-y-4">
            <div>
              <label className="label">Assignees</label>
              {issue.assignees?.length ? (
                <div className="space-y-2 mt-1">
                  {issue.assignees.map(u => (
                    <div key={u._id} className="flex items-center gap-2">
                      <Avatar user={u} size="xs" />
                      <span className="text-sm text-slate-300">{u.name}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-600">No assignees</p>}
            </div>
            <div>
              <label className="label">Type</label>
              <p className="text-sm text-slate-300 capitalize">{issue.type}</p>
            </div>
            <div>
              <label className="label">Priority</label>
              <p className="text-sm text-slate-300 capitalize">{issue.priority}</p>
            </div>
            {issue.labels?.length > 0 && (
              <div>
                <label className="label">Labels</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {issue.labels.map(l => (
                    <span key={l.name} className="badge text-xs"
                      style={{ backgroundColor: l.color + "25", color: l.color, border: `1px solid ${l.color}40` }}>
                      {l.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
