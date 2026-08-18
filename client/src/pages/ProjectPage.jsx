import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Kanban, Bug, FileText, Users, Activity, GitBranch, Clock } from "lucide-react";
import { useProjectStore, useTaskStore, useIssueStore } from "../context/stores";
import { formatDistanceToNow } from "date-fns";
import Avatar from "../components/common/Avatar";
import { PageSpinner } from "../components/common/Spinner";

export default function ProjectPage() {
  const { projectId } = useParams();
  const { currentProject, activity, fetchProject, fetchActivity } = useProjectStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { issues, fetchIssues } = useIssueStore();

  useEffect(() => {
    fetchProject(projectId);
    fetchActivity(projectId);
    fetchTasks({ project: projectId });
    fetchIssues({ project: projectId, state: "open" });
  }, [projectId]);

  if (!currentProject) return <PageSpinner />;

  const inProgress = tasks.filter(t => t.status === "in_progress").length;
  const done = tasks.filter(t => t.status === "done").length;
  const total = tasks.length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {}
      <div className="flex items-start gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
          style={{ backgroundColor: currentProject.color + "25", border: `1px solid ${currentProject.color}40` }}
        >
          {currentProject.icon}
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-white">{currentProject.name}</h1>
            <span className={`badge ${currentProject.status === "active" ? "badge-open" : "badge-closed"}`}>
              {currentProject.status}
            </span>
          </div>
          {currentProject.description && (
            <p className="text-slate-400 mt-1">{currentProject.description}</p>
          )}
          {currentProject.githubRepo && (
            <a href={currentProject.githubRepo} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 mt-1.5">
              <GitBranch size={14} /> {currentProject.githubRepo.replace("https://github.com/", "")}
            </a>
          )}
        </div>
      </div>

      {}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: `board`, icon: Kanban, label: "Board", value: `${inProgress} in progress`, color: "text-yellow-400", bg: "bg-yellow-500/10" },
          { to: `issues`, icon: Bug, label: "Issues", value: `${issues.length} open`, color: "text-red-400", bg: "bg-red-500/10" },
          { to: `docs`, icon: FileText, label: "Docs", value: `${currentProject.stats?.documents || 0} pages`, color: "text-green-400", bg: "bg-green-500/10" },
          { to: `team`, icon: Users, label: "Team", value: `${currentProject.members?.length || 0} members`, color: "text-blue-400", bg: "bg-blue-500/10" },
        ].map(({ to, icon: Icon, label, value, color, bg }) => (
          <Link key={to} to={to} className="card-hover p-4 block">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon size={17} className={color} />
            </div>
            <p className="font-semibold text-white text-sm">{label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{value}</p>
          </Link>
        ))}
      </div>

      {}
      {total > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Task Progress</h3>
            <span className="text-sm text-slate-400">{done}/{total} done</span>
          </div>
          <div className="h-2.5 bg-surface-500 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all"
              style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }}
            />
          </div>
          <div className="flex gap-4 mt-3 text-xs text-slate-500">
            <span className="text-yellow-400">{inProgress} in progress</span>
            <span className="text-green-400">{done} completed</span>
            <span>{total - done - inProgress} remaining</span>
          </div>
        </div>
      )}

      {}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Activity size={18} className="text-brand-400" /> Recent Activity
        </h2>
        <div className="space-y-2">
          {activity.slice(0, 10).map((a) => (
            <div key={a._id} className="flex items-start gap-3 py-2 border-b border-surface-600/50 last:border-0">
              <Avatar user={a.actor} size="sm" className="flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-300">
                  <span className="font-medium text-white">{a.actor?.name}</span>
                  {" "}<span className="text-slate-400">{a.action.replace(/_/g, " ")}</span>
                  {a.entityTitle && <span className="text-brand-400"> "{a.entityTitle}"</span>}
                </p>
                <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                  <Clock size={10} />
                  {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
          {activity.length === 0 && (
            <p className="text-slate-600 text-sm italic py-4 text-center">No activity yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
