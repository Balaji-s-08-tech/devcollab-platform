import { useEffect, useMemo, useState } from "react";
import { permissionAPI } from "../services/api";

const ROLE_RANK = {
  guest: 10,
  viewer: 20,
  member: 30,
  admin: 40,
  owner: 50,
};

const ACTION_MIN_ROLE = {
  read: "guest",
  comment: "viewer",
  create: "member",
  update: "member",
  assign: "member",
  invite: "admin",
  share: "admin",
  delete: "admin",
  manage: "admin",
};

export default function usePermission(action, resourceType, resourceId) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(Boolean(resourceId));

  useEffect(() => {
    let alive = true;
    if (!resourceType || !resourceId) {
      setRole(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    permissionAPI
      .effective({ resourceType, resourceId })
      .then(({ data }) => {
        if (alive) setRole(data.role);
      })
      .catch(() => {
        if (alive) setRole(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [resourceType, resourceId]);

  const allowed = useMemo(() => {
    const required = ACTION_MIN_ROLE[action] || "owner";
    return (ROLE_RANK[role] || 0) >= (ROLE_RANK[required] || 999);
  }, [action, role]);

  return { allowed, role, loading };
}
