module.exports = {
  id: "20260603000000-rbac-search-ai",
  up: async ({ mongoose }) => {
    const db = mongoose.connection.db;

    await db.collection("projects").createIndex({ organization: 1 });
    await db.collection("projects").createIndex({ workspace: 1 });
    await db.collection("organizations").createIndex({ owner: 1 });
    await db.collection("organizations").createIndex({ "members.user": 1 });
    await db.collection("workspaces").createIndex({ organization: 1 });
    await db.collection("workspaces").createIndex({ owner: 1 });
    await db.collection("workspaces").createIndex({ "members.user": 1 });

    await db.collection("permissiongrants").createIndex({ user: 1, resourceType: 1, resource: 1 }, { unique: true });
    await db.collection("permissiongrants").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: "date" } } });

    await db.collection("invites").createIndex({ tokenHash: 1 }, { unique: true });
    await db.collection("invites").createIndex({ scopeType: 1, scope: 1, email: 1, acceptedAt: 1, revokedAt: 1 });
    await db.collection("invites").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    await db.collection("sharelinks").createIndex({ tokenHash: 1 }, { unique: true });
    await db.collection("sharelinks").createIndex({ resourceType: 1, resource: 1 });
    await db.collection("sharelinks").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    await db.collection("aidocumentchunks").createIndex({ document: 1, chunkIndex: 1 }, { unique: true });
    await db.collection("aidocumentchunks").createIndex({ project: 1 });
    await db.collection("aidocumentchunks").createIndex({ workspace: 1 });
    await db.collection("aijobs").createIndex({ user: 1, status: 1, createdAt: -1 });
    await db.collection("aijobs").createIndex({ type: 1, status: 1 });
  },
};
