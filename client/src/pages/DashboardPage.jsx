import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Kanban, Bug, FileText, Users, Activity, TrendingUp } from "lucide-react";
import { useProjectStore } from "../context/stores";
import useAuthStore from "../context/authStore";
import Avatar from "../components/common/Avatar";
import { formatDistanceToNow } from "date-fns";
import { PageSpinner } from "../components/common/Spinner";
import { useState } from "react";
import NewProjectModal from "../components/common/NewProjectModal";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { projects, activity, loading, fetchProjects, fetchActivity } = useProjectStore();
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { fetchProjects(); }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const totalStats = projects.reduce((acc, p) => ({
    issues: acc.issues + (p.stats?.openIssues || 0),
    tasks: acc.tasks + (p.stats?.totalTasks || 0),
    docs: acc.docs + (p.stats?.documents || 0),
  }), { issues: 0, tasks: 0, docs: 0 });

  if (loading && projects.length === 0) return <PageSpinner />;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">
            {greeting}, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-500 mt-1">Here's what's happening across your projects</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus size={16} /> New Project
        </button>
      </div>

      {}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Projects", value: projects.length, icon: TrendingUp, color: "text-brand-400", bg: "bg-brand-500/10" },
          { label: "Open Issues", value: totalStats.issues, icon: Bug, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Active Tasks", value: totalStats.tasks, icon: Kanban, color: "text-yellow-400", bg: "bg-yellow-500/10" },
          { label: "Documents", value: totalStats.docs, icon: FileText, color: "text-green-400", bg: "bg-green-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{label}</span>
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={16} className={color} />
              </div>
            </div>
            <p className={`text-3xl font-display font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Your Projects</h2>
        {projects.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-4xl mb-3">🚀</p>
            <p className="text-slate-400 mb-4">No projects yet. Create your first one!</p>
            <button onClick={() => setShowNew(true)} className="btn-primary mx-auto">
              <Plus size={16} /> Create Project
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Link key={p._id} to={`/projects/${p._id}`} className="card-hover p-5 block group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: p.color + "25", border: `1px solid ${p.color}40` }}
                    >
                      {p.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-brand-400 transition-colors">{p.name}</h3>
                      <p className="text-xs text-slate-500 capitalize">{p.visibility}</p>
                    </div>
                  </div>
                  <span className={`badge text-xs ${p.status === "active" ? "badge-open" : "badge-closed"}`}>
                    {p.status}
                  </span>
                </div>

                {p.description && (
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{p.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex -space-x-1.5">
                    {p.members?.slice(0, 4).map((m) => (
                      <Avatar key={m.user?._id || m._id} user={m.user} size="xs" className="ring-1 ring-surface-700" />
                    ))}
                    {p.members?.length > 4 && (
                      <div className="w-5 h-5 rounded-full bg-surface-500 flex items-center justify-center text-[10px] text-slate-400 ring-1 ring-surface-700">
                        +{p.members.length - 4}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1"><Bug size={11} /> {p.stats?.openIssues || 0}</span>
                    <span className="flex items-center gap-1"><Kanban size={11} /> {p.stats?.totalTasks || 0}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
