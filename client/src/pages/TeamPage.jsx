import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { UserPlus, Crown, Shield, Code2, Eye, Trash2, Search } from "lucide-react";
import { useProjectStore } from "../context/stores";
import { projectAPI, teamAPI } from "../services/api";
import Avatar from "../components/common/Avatar";
import { formatDistanceToNow } from "date-fns";
import { PageSpinner } from "../components/common/Spinner";
import useAuthStore from "../context/authStore";
import toast from "react-hot-toast";
import clsx from "clsx";

const ROLE_CONFIG = {
  owner:     { icon: Crown,  label: "Owner",     color: "text-yellow-400", bg: "bg-yellow-500/10" },
  admin:     { icon: Shield, label: "Admin",      color: "text-blue-400",   bg: "bg-blue-500/10"  },
  developer: { icon: Code2,  label: "Developer",  color: "text-green-400",  bg: "bg-green-500/10" },
  viewer:    { icon: Eye,    label: "Viewer",     color: "text-slate-400",  bg: "bg-slate-500/10" },
};

export default function TeamPage() {
  const { projectId } = useParams();
  const { user } = useAuthStore();
  const { currentProject, fetchProject } = useProjectStore();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState(null);
  const timer = useRef(null);

  useEffect(() => { fetchProject(projectId); }, [projectId]);

  const searchUsers = async (q) => {
    if (q.length < 2) return setSearchResults([]);
    setSearching(true);
    const { data } = await teamAPI.searchUsers(q);
    setSearchResults(data.data);
    setSearching(false);
  };

  const handleInvite = async (userId, role = "developer") => {
    setInviting(userId);
    try {
      await projectAPI.addMember(projectId, { userId, role });
      await fetchProject(projectId);
      setSearch("");
      setSearchResults([]);
      toast.success("Member added!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add member");
    }
    setInviting(null);
  };

  const handleRemove = async (userId) => {
    if (!confirm("Remove this member?")) return;
    await projectAPI.removeMember(projectId, userId);
    await fetchProject(projectId);
    toast.success("Member removed");
  };

  if (!currentProject) return <PageSpinner />;

  const isOwner = currentProject.owner?._id === user?._id || currentProject.owner === user?._id;
  const memberIds = new Set(currentProject.members?.map(m => m.user?._id || m.user));

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Team</h1>
        <p className="text-slate-500 mt-0.5">{currentProject.members?.length || 0} members</p>
      </div>

      {}
      {isOwner && (
        <div className="card p-5">
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2"><UserPlus size={16} className="text-brand-400" /> Invite Members</h2>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="input pl-9"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => { setSearch(e.target.value); searchUsers(e.target.value); }}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 border border-surface-500 rounded-xl overflow-hidden">
              {searchResults.filter(u => !memberIds.has(u._id)).map(u => (
                <div key={u._id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-600/50 border-b border-surface-600 last:border-0">
                  <Avatar user={u} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  <button
                    onClick={() => handleInvite(u._id)}
                    disabled={inviting === u._id}
                    className="btn-primary btn-sm"
                  >
                    {inviting === u._id ? "Adding..." : "Add"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-600 bg-surface-700/30">
          <h2 className="font-semibold text-white text-sm">Members</h2>
        </div>
        <div className="divide-y divide-surface-600">
          {currentProject.members?.map((m) => {
            const u = m.user || {};
            const role = m.role || "developer";
            const RoleIcon = ROLE_CONFIG[role]?.icon || Code2;
            const isMe = u._id === user?._id;
            return (
              <div key={u._id || m._id} className="flex items-center gap-3 px-4 py-3">
                <div className="relative">
                  <Avatar user={u} size="md" />
                  {u.isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full ring-2 ring-surface-800" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white text-sm">{u.name} {isMe && <span className="text-brand-400">(you)</span>}</p>
                  </div>
                  <p className="text-xs text-slate-500">{u.email}</p>
                  {!u.isOnline && u.lastSeen && (
                    <p className="text-xs text-slate-600">Last seen {formatDistanceToNow(new Date(u.lastSeen), { addSuffix: true })}</p>
                  )}
                </div>
                <div className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", ROLE_CONFIG[role]?.bg, ROLE_CONFIG[role]?.color)}>
                  <RoleIcon size={11} />
                  {ROLE_CONFIG[role]?.label}
                </div>
                {isOwner && !isMe && (
                  <button onClick={() => handleRemove(u._id)} className="btn-icon text-slate-500 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useRef } from "react";
