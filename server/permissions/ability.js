const { AbilityBuilder, createMongoAbility } = require("@casl/ability");
const { ROLES } = require("../constants/roles");

const SUBJECTS = ["Organization", "Workspace", "Project", "Document", "Board", "Issue", "User", "Permission", "Invite", "ShareLink"];

const ROLE_POLICIES = {
  [ROLES.OWNER]: (can) => {
    can("manage", "all");
  },
  [ROLES.ADMIN]: (can, cannot) => {
    can(["read", "create", "update", "comment", "assign", "invite", "share"], SUBJECTS);
    can("delete", ["Document", "Board", "Issue"]);
    can("manage", ["Permission", "Invite", "ShareLink"]);
    cannot("delete", ["Organization", "Workspace", "Project"]);
    cannot("transferOwnership", "all");
  },
  [ROLES.MEMBER]: (can) => {
    can("read", SUBJECTS);
    can(["create", "update", "comment"], ["Document", "Board", "Issue"]);
    can(["create", "update"], "Project");
    can("assign", ["Board", "Issue"]);
  },
  [ROLES.VIEWER]: (can) => {
    can("read", SUBJECTS);
    can("comment", ["Document", "Issue"]);
  },
  [ROLES.GUEST]: (can) => {
    can("read", ["Project", "Document", "Board", "Issue"]);
  },
};

const defineAbilityForRole = (role) => {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);
  const policy = ROLE_POLICIES[role] || ROLE_POLICIES[ROLES.GUEST];
  policy(can, cannot);
  return build({
    detectSubjectType: (item) => item?.__caslSubjectType__ || item?.constructor?.modelName || item,
  });
};

module.exports = {
  ROLE_POLICIES,
  SUBJECTS,
  defineAbilityForRole,
};
