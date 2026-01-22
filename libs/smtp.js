import nodemailer from "nodemailer";
import { decrypt } from "./encryption";

/**
 * Create SMTP transporter from config
 * @param {object} config - SMTP configuration (decrypted)
 * @returns {object} - Nodemailer transporter
 */
function createTransporter(config) {
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort || 587,
    secure: config.smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: config.username,
      pass: config.password,
    },
  });
}

/**
 * Test SMTP connection
 * @param {object} config - SMTP config (decrypted)
 * @returns {Promise<boolean>} - True if connection successful
 */
export async function testConnection(config) {
  const transporter = createTransporter(config);
  await transporter.verify();
  return true;
}

/**
 * Send email via SMTP
 * @param {object} connectedEmail - ConnectedEmail document with encrypted config
 * @param {object} email - Email to send
 * @param {Array} email.to - Recipients [{ name, email }]
 * @param {Array} email.cc - CC recipients [{ name, email }]
 * @param {string} email.subject - Subject line
 * @param {string} email.bodyHtml - HTML body
 * @param {string} email.bodyText - Plain text body
 * @param {string} email.inReplyTo - Message-ID being replied to
 * @param {string} email.references - References header value
 * @returns {Promise<object>} - Sent message info
 */
export async function sendEmail(connectedEmail, email) {
  const configJson = decrypt(connectedEmail.smtpConfig);
  const config = JSON.parse(configJson);
  const transporter = createTransporter(config);

  const formatAddress = (addr) =>
    addr.name ? `"${addr.name}" <${addr.email}>` : addr.email;

  const mailOptions = {
    from: connectedEmail.emailAddress,
    to: email.to.map(formatAddress).join(", "),
    subject: email.subject,
    text: email.bodyText,
    html: email.bodyHtml,
  };

  if (email.cc?.length) {
    mailOptions.cc = email.cc.map(formatAddress).join(", ");
  }

  if (email.inReplyTo) {
    mailOptions.inReplyTo = email.inReplyTo;
  }

  if (email.references) {
    mailOptions.references = email.references;
  }

  const info = await transporter.sendMail(mailOptions);

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  };
}

/**
 * Test SMTP connection for a connected email
 * @param {object} connectedEmail - ConnectedEmail document
 * @returns {Promise<boolean>}
 */
export async function testConnectedEmail(connectedEmail) {
  try {
    const configJson = decrypt(connectedEmail.smtpConfig);
    const config = JSON.parse(configJson);
    return await testConnection(config);
  } catch (error) {
    console.error("SMTP connection test failed:", error.message);
    return false;
  }
}

/**
 * Encrypt SMTP/IMAP config for storage
 * @param {object} config - SMTP/IMAP configuration
 * @returns {string} - Encrypted config string
 */
export function encryptConfig(config) {
  const { encrypt } = require("./encryption");
  return encrypt(JSON.stringify(config));
}
