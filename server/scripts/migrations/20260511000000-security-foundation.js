module.exports = {
  id: "20260511000000-security-foundation",
  up: async ({ mongoose }) => {
    const db = mongoose.connection.db;

    await db.collection("users").updateMany(
      { authProviders: { $exists: false } },
      { $set: { authProviders: ["local"], "twoFactor.enabled": false } }
    );

    await db.collection("sessions").createIndex({ user: 1, revokedAt: 1, expiresAt: 1 });
    await db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await db.collection("sessions").createIndex({ family: 1 });

    await db.collection("auditlogs").createIndex({ actor: 1, createdAt: -1 });
    await db.collection("auditlogs").createIndex({ action: 1, createdAt: -1 });
    await db.collection("auditlogs").createIndex({ createdAt: -1 });
  },
};
