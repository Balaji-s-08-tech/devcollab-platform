import Avatar from "./Avatar";
import clsx from "clsx";

const STATUS_DOT = {
  active: "bg-green-400",
  idle:   "bg-yellow-400",
  away:   "bg-slate-500",
};

export default function PresenceAvatars({ presence, max = 5, className }) {
  const users = Object.entries(presence).slice(0, max);
  if (users.length === 0) return null;

  return (
    <div className={clsx("flex items-center gap-1.5", className)}>
      <div className="flex -space-x-2">
        {users.map(([id, u]) => (
          <div key={id} className="relative" title={`${u.name} — ${u.status || "active"}`}>
            <Avatar user={u} size="xs" className="ring-2 ring-surface-800" />
            <span
              className={clsx(
                "absolute bottom-0 right-0 w-2 h-2 rounded-full ring-1 ring-surface-800",
                STATUS_DOT[u.status] || STATUS_DOT.active
              )}
            />
          </div>
        ))}
      </div>
      {users.length === 1 ? (
        <span className="text-xs text-slate-500">{users[0][1].name} is here</span>
      ) : (
        <span className="text-xs text-slate-500">{users.length} people here</span>
      )}
    </div>
  );
}
