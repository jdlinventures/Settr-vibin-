import { google } from "googleapis";
import { encrypt, decrypt } from "./encryption";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
];

/**
 * Create OAuth2 client with credentials from environment
 */
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
}

/**
 * Generate the OAuth URL for user to authorize Gmail access
 * @param {string} state - State parameter to verify callback (usually contains userId)
 * @returns {string} - Authorization URL
 */
export function getAuthUrl(state) {
  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: "offline", // Get refresh token
    scope: SCOPES,
    state: state,
    prompt: "consent", // Always show consent screen to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code from OAuth callback
 * @returns {Promise<object>} - Token object with access_token, refresh_token, etc.
 */
export async function exchangeCodeForTokens(code) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Get authenticated Gmail client for a connected email
 * @param {object} connectedEmail - ConnectedEmail document with encrypted tokens
 * @returns {Promise<object>} - { gmail, oauth2Client }
 */
export async function getGmailClient(connectedEmail) {
  const oauth2Client = createOAuth2Client();

  // Decrypt stored tokens
  const tokensJson = decrypt(connectedEmail.oauthTokens);
  const tokens = JSON.parse(tokensJson);

  oauth2Client.setCredentials(tokens);

  // Handle token refresh
  oauth2Client.on("tokens", (newTokens) => {
    // Tokens were refreshed - caller should update the database
    console.log("Gmail tokens refreshed for:", connectedEmail.emailAddress);
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  return { gmail, oauth2Client };
}

/**
 * Get the email address associated with the OAuth tokens
 * @param {object} tokens - OAuth tokens
 * @returns {Promise<string>} - Email address
 */
export async function getEmailFromTokens(tokens) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const profile = await gmail.users.getProfile({ userId: "me" });

  return profile.data.emailAddress;
}

/**
 * Refresh tokens if needed and return updated tokens
 * @param {object} connectedEmail - ConnectedEmail document
 * @returns {Promise<object|null>} - New tokens if refreshed, null if no refresh needed
 */
export async function refreshTokensIfNeeded(connectedEmail) {
  const oauth2Client = createOAuth2Client();

  const tokensJson = decrypt(connectedEmail.oauthTokens);
  const tokens = JSON.parse(tokensJson);

  oauth2Client.setCredentials(tokens);

  // Check if token is expired or will expire in next 5 minutes
  const expiryDate = tokens.expiry_date;
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (expiryDate && expiryDate - now < fiveMinutes) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  }

  return null;
}

/**
 * Fetch emails from Gmail
 * @param {object} connectedEmail - ConnectedEmail document
 * @param {object} options - Query options
 * @param {Date} options.since - Fetch emails after this date
 * @param {number} options.maxResults - Max number of emails to fetch
 * @param {string} options.pageToken - Pagination token
 * @returns {Promise<object>} - { messages, nextPageToken }
 */
export async function fetchEmails(connectedEmail, options = {}) {
  const { gmail } = await getGmailClient(connectedEmail);

  const { since, maxResults = 100, pageToken } = options;

  // Build query
  let query = "";
  if (since) {
    const sinceTimestamp = Math.floor(since.getTime() / 1000);
    query = `after:${sinceTimestamp}`;
  }

  // List messages
  const response = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
    pageToken,
  });

  return {
    messages: response.data.messages || [],
    nextPageToken: response.data.nextPageToken,
  };
}

/**
 * Fetch full email content
 * @param {object} connectedEmail - ConnectedEmail document
 * @param {string} messageId - Gmail message ID
 * @returns {Promise<object>} - Parsed email object
 */
export async function fetchEmailContent(connectedEmail, messageId) {
  const { gmail } = await getGmailClient(connectedEmail);

  const response = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const message = response.data;

  // Parse headers
  const headers = message.payload.headers || [];
  const getHeader = (name) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

  // Parse email addresses from header
  const parseEmailAddress = (header) => {
    if (!header) return null;
    const match = header.match(/(?:"?([^"]*)"?\s)?<?([^\s<>]+@[^\s<>]+)>?/);
    if (match) {
      return { name: match[1] || "", email: match[2].toLowerCase() };
    }
    return { name: "", email: header.toLowerCase() };
  };

  const parseEmailAddresses = (header) => {
    if (!header) return [];
    return header.split(",").map((addr) => parseEmailAddress(addr.trim())).filter(Boolean);
  };

  // Get body
  const getBody = (payload, mimeType) => {
    if (payload.mimeType === mimeType && payload.body?.data) {
      return Buffer.from(payload.body.data, "base64").toString("utf8");
    }
    if (payload.parts) {
      for (const part of payload.parts) {
        const body = getBody(part, mimeType);
        if (body) return body;
      }
    }
    return "";
  };

  // Get attachments info
  const getAttachments = (payload, attachments = []) => {
    if (payload.filename && payload.body?.attachmentId) {
      attachments.push({
        filename: payload.filename,
        mimeType: payload.mimeType,
        size: payload.body.size,
        gmailAttachmentId: payload.body.attachmentId,
      });
    }
    if (payload.parts) {
      for (const part of payload.parts) {
        getAttachments(part, attachments);
      }
    }
    return attachments;
  };

  // Parse References header into array
  const referencesHeader = getHeader("References");
  const references = referencesHeader
    ? referencesHeader.split(/\s+/).filter((r) => r.startsWith("<"))
    : [];

  return {
    messageId: getHeader("Message-ID"),
    threadId: message.threadId,
    from: parseEmailAddress(getHeader("From")),
    to: parseEmailAddresses(getHeader("To")),
    cc: parseEmailAddresses(getHeader("Cc")),
    subject: getHeader("Subject"),
    inReplyTo: getHeader("In-Reply-To"),
    references,
    bodyText: getBody(message.payload, "text/plain"),
    bodyHtml: getBody(message.payload, "text/html"),
    receivedAt: new Date(parseInt(message.internalDate)),
    labelIds: message.labelIds || [],
    attachments: getAttachments(message.payload),
  };
}

/**
 * Fetch attachment content
 * @param {object} connectedEmail - ConnectedEmail document
 * @param {string} messageId - Gmail message ID
 * @param {string} attachmentId - Attachment ID
 * @returns {Promise<Buffer>} - Attachment data
 */
export async function fetchAttachment(connectedEmail, messageId, attachmentId) {
  const { gmail } = await getGmailClient(connectedEmail);

  const response = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId,
    id: attachmentId,
  });

  return Buffer.from(response.data.data, "base64");
}

/**
 * Send an email via Gmail
 * @param {object} connectedEmail - ConnectedEmail document
 * @param {object} email - Email to send
 * @param {Array} email.to - Recipients [{ name, email }]
 * @param {Array} email.cc - CC recipients [{ name, email }]
 * @param {string} email.subject - Subject line
 * @param {string} email.bodyHtml - HTML body
 * @param {string} email.bodyText - Plain text body (fallback)
 * @param {string} email.threadId - Thread ID for replies
 * @param {string} email.inReplyTo - Message-ID being replied to
 * @param {string} email.references - References header value
 * @returns {Promise<object>} - Sent message info
 */
export async function sendEmail(connectedEmail, email) {
  const { gmail } = await getGmailClient(connectedEmail);

  const formatAddress = (addr) =>
    addr.name ? `"${addr.name}" <${addr.email}>` : addr.email;

  // Build email headers
  const headers = [
    `From: ${connectedEmail.emailAddress}`,
    `To: ${email.to.map(formatAddress).join(", ")}`,
  ];

  if (email.cc?.length) {
    headers.push(`Cc: ${email.cc.map(formatAddress).join(", ")}`);
  }

  headers.push(`Subject: ${email.subject}`);

  if (email.inReplyTo) {
    headers.push(`In-Reply-To: ${email.inReplyTo}`);
  }

  if (email.references) {
    headers.push(`References: ${email.references}`);
  }

  headers.push("MIME-Version: 1.0");
  headers.push('Content-Type: text/html; charset="UTF-8"');

  // Build raw email
  const rawEmail = [...headers, "", email.bodyHtml || email.bodyText].join("\r\n");

  // Encode to base64url
  const encodedEmail = Buffer.from(rawEmail)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Send
  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedEmail,
      threadId: email.threadId,
    },
  });

  return response.data;
}

/**
 * Mark email as read
 * @param {object} connectedEmail - ConnectedEmail document
 * @param {string} messageId - Gmail message ID
 */
export async function markAsRead(connectedEmail, messageId) {
  const { gmail } = await getGmailClient(connectedEmail);

  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      removeLabelIds: ["UNREAD"],
    },
  });
}

/**
 * Test Gmail connection
 * @param {object} connectedEmail - ConnectedEmail document
 * @returns {Promise<boolean>} - True if connection is valid
 */
export async function testConnection(connectedEmail) {
  try {
    const { gmail } = await getGmailClient(connectedEmail);
    await gmail.users.getProfile({ userId: "me" });
    return true;
  } catch (error) {
    console.error("Gmail connection test failed:", error.message);
    return false;
  }
}

/**
 * Encrypt tokens for storage
 * @param {object} tokens - OAuth tokens
 * @returns {string} - Encrypted tokens string
 */
export function encryptTokens(tokens) {
  return encrypt(JSON.stringify(tokens));
}
