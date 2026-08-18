const ROLES = Object.freeze({
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
  VIEWER: "viewer",
  GUEST: "guest",
});

const ROLE_RANK = Object.freeze({
  [ROLES.GUEST]: 10,
  [ROLES.VIEWER]: 20,
  [ROLES.MEMBER]: 30,
  [ROLES.ADMIN]: 40,
  [ROLES.OWNER]: 50,
});

const normalizeRole = (role) => {
  if (role === "developer") return ROLES.MEMBER;
  if (role === "owner" || role === "admin" || role === "member" || role === "viewer" || role === "guest") {
    return role;
  }
  return null;
};

const maxRole = (...roles) =>
  roles.map(normalizeRole).filter(Boolean).sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0] || null;

module.exports = {
  ROLES,
  ROLE_RANK,
  maxRole,
  normalizeRole,
};
