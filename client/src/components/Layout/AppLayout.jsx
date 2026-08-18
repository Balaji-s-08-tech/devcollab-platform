import { Outlet, useParams, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Kanban, Bug, FileText, Users,
  Settings, Bell, Search, LogOut, Plus, ChevronDown,
  Zap, Moon, Sun, Command, GitBranch, MessageSquare, Video, Github, Bot
} from "lucide-react";
import useAuthStore from "../../context/authStore";
import { useProjectStore, useNotifStore } from "../../context/stores";
import { joinProject, leaveProject } from "../../services/socket";
import Avatar from "../common/Avatar";
import NotifPanel from "../common/NotifPanel";
import SearchModal from "../common/SearchModal";
import NewProjectModal from "../common/NewProjectModal";
import AIAssistantSidebar from "../AI/AIAssistantSidebar";
import clsx from "clsx";

const NAV = [
  { to: "", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "board", label: "Board", icon: Kanban },
  { to: "issues", label: "Issues", icon: Bug },
  { to: "docs", label: "Docs", icon: FileText },
  { to: "team", label: "Team", icon: Users },
  { to: "settings", label: "Settings", icon: Settings },
];

const MODULE_NAV = [
  { to: "git", label: "Git", icon: GitBranch },
  { to: "chat", label: "Chat", icon: MessageSquare },
  { to: "video", label: "Video", icon: Video },
];

export default function AppLayout() {
  const { projectId, docId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { projects, currentProject, fetchProjects, fetchProject } = useProjectStore();
  const { unreadCount } = useNotifStore();
  const [showNotif, setShowNotif] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(true);

  useEffect(() => { fetchProjects(); }, []);

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
      joinProject(projectId);
      return () => leaveProject(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-900">
      {}
      <aside className="w-60 flex-shrink-0 bg-surface-800 border-r border-surface-600 flex flex-col">
        {}
        <div className="px-4 py-4 border-b border-surface-600">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-glow-sm">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-display font-bold text-white text-lg tracking-tight">DevCollab</span>
          </div>
        </div>

        {}
        <nav className="px-2 pt-3 pb-2">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              clsx("sidebar-item", isActive && "active")
            }
          >
            <LayoutDashboard size={16} />
            Dashboard
          </NavLink>
          <NavLink
            to="/github"
            className={({ isActive }) =>
              clsx("sidebar-item", isActive && "active")
            }
          >
            <Github size={16} />
            GitHub
          </NavLink>
        </nav>

        {}
        <div className="px-2 mb-1">
          <button
            onClick={() => setShowSearch(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-700
                       border border-surface-500 text-slate-500 text-sm hover:border-surface-400
                       transition-all cursor-pointer"
          >
            <Search size={14} />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="text-xs bg-surface-600 px-1.5 py-0.5 rounded text-slate-500 font-mono">⌘K</kbd>
          </button>
        </div>

        {}
        <div className="flex-1 overflow-y-auto px-2 pt-2">
          <div
            className="flex items-center justify-between px-3 py-1.5 cursor-pointer select-none"
            onClick={() => setProjectsOpen(!projectsOpen)}
          >
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Projects</span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setShowNewProject(true); }}
                className="p-0.5 rounded hover:bg-surface-600 text-slate-500 hover:text-white transition-colors"
              >
                <Plus size={13} />
              </button>
              <ChevronDown
                size={13}
                className={clsx("text-slate-500 transition-transform", !projectsOpen && "-rotate-90")}
              />
            </div>
          </div>

          {projectsOpen && (
            <div className="space-y-0.5 mt-1">
              {projects.map((p) => (
                <NavLink
                  key={p._id}
                  to={`/projects/${p._id}`}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer",
                      isActive
                        ? "bg-brand-600/20 text-white"
                        : "text-slate-400 hover:bg-surface-600 hover:text-white"
                    )
                  }
                >
                  <span className="text-base leading-none">{p.icon}</span>
                  <span className="truncate">{p.name}</span>
                </NavLink>
              ))}
              {projects.length === 0 && (
                <p className="px-3 py-2 text-xs text-slate-600 italic">No projects yet</p>
              )}
            </div>
          )}

          {}
          {projectId && currentProject && (
            <div className="mt-3 border-t border-surface-600 pt-3">
              <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 truncate">
                {currentProject.icon} {currentProject.name}
              </p>
              {NAV.slice(1).map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={`/projects/${projectId}/${to}`}
                  end={to === ""}
                  className={({ isActive }) =>
                    clsx("sidebar-item text-xs", isActive && "active")
                  }
                >
                  <Icon size={14} />
                  {label}
                </NavLink>
              ))}
              {}
              <p className="px-3 mt-3 mb-1 text-xs font-semibold text-slate-600 uppercase tracking-wider">Modules</p>
              {MODULE_NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={`/projects/${projectId}/${to}`}
                  className={({ isActive }) =>
                    clsx("sidebar-item text-xs", isActive && "active")
                  }
                >
                  <Icon size={14} />
                  {label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {}
        <div className="px-3 py-3 border-t border-surface-600">
          <div className="flex items-center gap-2.5">
            <Avatar user={user} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="btn-icon text-slate-500 hover:text-red-400">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {}
      <div className="flex-1 flex flex-col overflow-hidden">
        {}
        <header className="h-14 flex items-center justify-between px-6 border-b border-surface-600 bg-surface-800/50 backdrop-blur flex-shrink-0">
          <div className="flex items-center gap-3">
            {projectId && currentProject && (
              <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                {[...NAV, ...MODULE_NAV].map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={`/projects/${projectId}${to ? `/${to}` : ""}`}
                    end={end || to === ""}
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all",
                        isActive
                          ? "bg-brand-600/20 text-brand-400"
                          : "text-slate-400 hover:text-white hover:bg-surface-600"
                      )
                    }
                  >
                    <Icon size={14} />
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="btn-icon"
            >
              <Search size={17} />
            </button>
            <button
              onClick={() => setShowAI(true)}
              className="btn-icon"
            >
              <Bot size={17} />
            </button>
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="btn-icon relative"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-brand-500 rounded-full animate-pulse-dot" />
              )}
            </button>
          </div>
        </header>

        {}
        <main className="flex-1 overflow-y-auto">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {}
      {showNotif && <NotifPanel onClose={() => setShowNotif(false)} />}
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} />}
      {showAI && <AIAssistantSidebar documentId={docId} onClose={() => setShowAI(false)} />}
    </div>
  );
}
