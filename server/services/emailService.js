const nodemailer = require("nodemailer");
const logger = require("../config/logger");

const getTransport = () => {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
};

const sendInviteEmail = async ({ to, token, role, scopeType, message }) => {
  const inviteUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/invite/accept?token=${encodeURIComponent(token)}`;
  const transport = getTransport();

  if (!transport) {
    logger.info(`[invite] SMTP not configured. Invite for ${to}: ${inviteUrl}`);
    return { previewUrl: inviteUrl };
  }

  const info = await transport.sendMail({
    from: process.env.SMTP_FROM || "DevCollab <noreply@devcollab.local>",
    to,
    subject: `You were invited to DevCollab as ${role}`,
    text: `${message || "You have been invited to collaborate."}\n\nAccept your ${scopeType} invite: ${inviteUrl}`,
    html: `<p>${message || "You have been invited to collaborate."}</p><p><a href="${inviteUrl}">Accept your ${scopeType} invite</a></p>`,
  });

  return { messageId: info.messageId };
};

module.exports = {
  sendInviteEmail,
};
