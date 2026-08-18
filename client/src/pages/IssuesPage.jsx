import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Plus, Bug, CheckCircle, Circle, Filter, ChevronDown } from "lucide-react";
import { useIssueStore } from "../context/stores";
import { formatDistanceToNow } from "date-fns";
import Avatar from "../components/common/Avatar";
import { PageSpinner } from "../components/common/Spinner";
import NewIssueModal from "../components/Issues/NewIssueModal";
import clsx from "clsx";

const TYPE_COLORS = {
  bug: "text-red-400", feature: "text-blue-400", enhancement: "text-purple-400",
  documentation: "text-green-400", question: "text-yellow-400", other: "text-slate-400",
};
const PRIORITY_COLORS = {
  none: "text-slate-600", low: "text-blue-400", medium: "text-yellow-400",
  high: "text-orange-400", critical: "text-red-400",
};

export default function IssuesPage() {
  const { projectId } = useParams();
  const { issues, loading, fetchIssues } = useIssueStore();
  const [state, setState] = useState("open");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { fetchIssues({ project: projectId, state }); }, [projectId, state]);

  const openCount = issues.filter(i => i.state === "open").length;
  const closedCount = issues.filter(i => i.state === "closed").length;

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-white">Issues</h1>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus size={16} /> New Issue
        </button>
      </div>

      {}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-600 bg-surface-700/30">
          <button
            onClick={() => setState("open")}
            className={clsx("flex items-center gap-1.5 text-sm font-medium transition-colors",
              state === "open" ? "text-white" : "text-slate-500 hover:text-slate-300")}
          >
            <Circle size={14} className="text-green-400" />
            {openCount} Open
          </button>
          <button
            onClick={() => setState("closed")}
            className={clsx("flex items-center gap-1.5 text-sm font-medium transition-colors",
              state === "closed" ? "text-white" : "text-slate-500 hover:text-slate-300")}
          >
            <CheckCircle size={14} className="text-slate-400" />
            {closedCount} Closed
          </button>
        </div>

        {}
        <div className="divide-y divide-surface-600">
          {issues.length === 0 ? (
            <div className="py-16 text-center">
              <Bug size={36} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">No {state} issues</p>
              <button onClick={() => setShowNew(true)} className="btn-ghost btn-sm mt-3 mx-auto">
                + Create the first issue
              </button>
            </div>
          ) : (
            issues.map((issue) => (
              <Link
                key={issue._id}
                to={`/projects/${projectId}/issues/${issue._id}`}
                className="flex items-start gap-3 px-4 py-3.5 hover:bg-surface-600/40 transition-colors group"
              >
                {issue.state === "open"
                  ? <Circle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                  : <CheckCircle size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white group-hover:text-brand-400 transition-colors">
                      {issue.title}
                    </span>
                    {issue.labels?.map(l => (
                      <span key={l.name} className="badge text-[10px]"
                        style={{ backgroundColor: l.color + "25", color: l.color, border: `1px solid ${l.color}40` }}>
                        {l.name}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className={TYPE_COLORS[issue.type]}>#{issue.number} {issue.type}</span>
                    <span>opened {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}</span>
                    {issue.author && <span>by {issue.author.name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {issue.assignees?.slice(0, 2).map(u => (
                    <Avatar key={u._id} user={u} size="xs" />
                  ))}
                  <span className={clsx("text-xs", PRIORITY_COLORS[issue.priority])}>
                    {issue.priority !== "none" && issue.priority}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {showNew && <NewIssueModal projectId={projectId} onClose={() => setShowNew(false)} />}
    </div>
  );
}
