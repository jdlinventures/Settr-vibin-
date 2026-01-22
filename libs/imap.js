import Imap from "imap";
import { simpleParser } from "mailparser";
import { decrypt } from "./encryption";
import crypto from "crypto";

/**
 * Create IMAP client from config
 * @param {object} config - IMAP configuration
 * @returns {Imap} - IMAP client instance
 */
function createImapClient(config) {
  return new Imap({
    user: config.username,
    password: config.password,
    host: config.imapHost,
    port: config.imapPort || 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
  });
}

/**
 * Test IMAP connection
 * @param {object} config - IMAP config (decrypted)
 * @returns {Promise<boolean>} - True if connection successful
 */
export function testConnection(config) {
  return new Promise((resolve, reject) => {
    const imap = createImapClient(config);

    imap.once("ready", () => {
      imap.end();
      resolve(true);
    });

    imap.once("error", (err) => {
      reject(err);
    });

    imap.connect();
  });
}

/**
 * Fetch emails via IMAP
 * @param {object} connectedEmail - ConnectedEmail document with encrypted config
 * @param {object} options - Fetch options
 * @param {Date} options.since - Fetch emails after this date
 * @param {number} options.limit - Max emails to fetch
 * @returns {Promise<Array>} - Array of parsed emails
 */
export function fetchEmails(connectedEmail, options = {}) {
  return new Promise((resolve, reject) => {
    const configJson = decrypt(connectedEmail.smtpConfig);
    const config = JSON.parse(configJson);
    const imap = createImapClient(config);

    const { since, limit = 100 } = options;
    const emails = [];

    imap.once("ready", () => {
      imap.openBox("INBOX", true, (err, box) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        // Build search criteria
        const searchCriteria = ["ALL"];
        if (since) {
          searchCriteria.push(["SINCE", since]);
        }

        imap.search(searchCriteria, (err, results) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          if (!results || results.length === 0) {
            imap.end();
            return resolve([]);
          }

          // Take only the most recent emails up to limit
          const messageIds = results.slice(-limit);

          const fetch = imap.fetch(messageIds, {
            bodies: "",
            struct: true,
          });

          fetch.on("message", (msg, seqno) => {
            let buffer = "";

            msg.on("body", (stream) => {
              stream.on("data", (chunk) => {
                buffer += chunk.toString("utf8");
              });
            });

            msg.once("end", async () => {
              try {
                const parsed = await simpleParser(buffer);
                emails.push(parseEmail(parsed, connectedEmail.emailAddress));
              } catch (parseErr) {
                console.error("Failed to parse email:", parseErr);
              }
            });
          });

          fetch.once("error", (err) => {
            imap.end();
            reject(err);
          });

          fetch.once("end", () => {
            imap.end();
            // Wait a bit for all parsing to complete
            setTimeout(() => resolve(emails), 100);
          });
        });
      });
    });

    imap.once("error", (err) => {
      reject(err);
    });

    imap.connect();
  });
}

/**
 * Parse a mailparser email object to our format
 * @param {object} parsed - Parsed email from mailparser
 * @param {string} receiverEmail - Email address that received this
 * @returns {object} - Formatted email object
 */
function parseEmail(parsed, receiverEmail) {
  // Generate a threadId based on subject and references
  const normalizedSubject = (parsed.subject || "")
    .replace(/^(re:|fwd?:)\s*/gi, "")
    .trim()
    .toLowerCase();

  const firstReference = parsed.references?.[0] || parsed.inReplyTo || "";
  const threadIdSource = firstReference || normalizedSubject;
  const threadId = crypto
    .createHash("md5")
    .update(threadIdSource)
    .digest("hex");

  // Parse addresses
  const parseAddress = (addr) => {
    if (!addr) return null;
    if (addr.value && addr.value[0]) {
      return {
        name: addr.value[0].name || "",
        email: (addr.value[0].address || "").toLowerCase(),
      };
    }
    return null;
  };

  const parseAddresses = (addrs) => {
    if (!addrs || !addrs.value) return [];
    return addrs.value.map((a) => ({
      name: a.name || "",
      email: (a.address || "").toLowerCase(),
    }));
  };

  // Get attachments
  const attachments = (parsed.attachments || []).map((att) => ({
    filename: att.filename || "attachment",
    mimeType: att.contentType,
    size: att.size,
    // For IMAP we'd need to store attachments differently
    // For now we just track metadata
  }));

  return {
    messageId: parsed.messageId || `<${Date.now()}@imap.local>`,
    threadId,
    from: parseAddress(parsed.from),
    to: parseAddresses(parsed.to),
    cc: parseAddresses(parsed.cc),
    subject: parsed.subject || "(No Subject)",
    inReplyTo: parsed.inReplyTo || "",
    references: parsed.references || [],
    bodyText: parsed.text || "",
    bodyHtml: parsed.html || "",
    receivedAt: parsed.date || new Date(),
    attachments,
  };
}

/**
 * Test IMAP connection for a connected email
 * @param {object} connectedEmail - ConnectedEmail document
 * @returns {Promise<boolean>}
 */
export async function testConnectedEmail(connectedEmail) {
  try {
    const configJson = decrypt(connectedEmail.smtpConfig);
    const config = JSON.parse(configJson);
    return await testConnection(config);
  } catch (error) {
    console.error("IMAP connection test failed:", error.message);
    return false;
  }
}
