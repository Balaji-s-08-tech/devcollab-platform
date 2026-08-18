const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const keyMaterial = () =>
  crypto
    .createHash("sha256")
    .update(process.env.TOTP_ENCRYPTION_KEY || process.env.JWT_SECRET || "devcollab-dev-key")
    .digest();

const encryptSecret = (plainText) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
};

const decryptSecret = (encryptedSecret) => {
  const [iv, authTag, encrypted] = String(encryptedSecret || "").split(".");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    keyMaterial(),
    Buffer.from(iv, "base64url")
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
};

const generateBackupCodes = () =>
  Array.from({ length: 10 }, () =>
    `${crypto.randomBytes(4).toString("hex").slice(0, 4)}-${crypto
      .randomBytes(4)
      .toString("hex")
      .slice(0, 4)}`.toUpperCase()
  );

const hashBackupCodes = async (codes) =>
  Promise.all(codes.map(async (code) => ({ codeHash: await bcrypt.hash(code, 12), usedAt: null })));

const consumeBackupCode = async (user, code) => {
  if (!code || !user.twoFactor?.backupCodes?.length) return false;

  for (const backup of user.twoFactor.backupCodes) {
    if (backup.usedAt) continue;
    if (await bcrypt.compare(String(code).trim().toUpperCase(), backup.codeHash)) {
      backup.usedAt = new Date();
      await user.save({ validateBeforeSave: false });
      return true;
    }
  }

  return false;
};

module.exports = {
  consumeBackupCode,
  decryptSecret,
  encryptSecret,
  generateBackupCodes,
  hashBackupCodes,
};
