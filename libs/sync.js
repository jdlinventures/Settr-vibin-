import connectMongo from "./mongoose";
import ConnectedEmail from "@/models/ConnectedEmail";
import CentralInbox from "@/models/CentralInbox";
import Email from "@/models/Email";
import Stage from "@/models/Stage";
import {
  fetchEmails as fetchGmailEmails,
  fetchEmailContent as fetchGmailContent,
  refreshTokensIfNeeded,
  encryptTokens,
} from "./gmail";
import { fetchEmails as fetchImapEmails } from "./imap";

/**
 * Sync all connected emails for all users
 * Called by cron job
 */
export async function syncAllEmails() {
  await connectMongo();

  // Find all connected emails that are assigned to a central inbox
  const connectedEmails = await ConnectedEmail.find({
    centralInboxId: { $exists: true, $ne: null },
    status: "connected",
  });

  console.log(`Syncing ${connectedEmails.length} connected emails`);

  const results = [];

  for (const connectedEmail of connectedEmails) {
    try {
      const result = await syncConnectedEmail(connectedEmail._id);
      results.push({ id: connectedEmail._id, success: true, ...result });
    } catch (error) {
      console.error(`Sync failed for ${connectedEmail.emailAddress}:`, error);
      results.push({
        id: connectedEmail._id,
        success: false,
        error: error.message,
      });

      // Update status to error
      await ConnectedEmail.updateOne(
        { _id: connectedEmail._id },
        { status: "error", errorMessage: error.message }
      );
    }
  }

  return results;
}

/**
 * Sync a single connected email account
 * @param {string} connectedEmailId - ConnectedEmail document ID
 * @returns {Promise<object>} - Sync results
 */
export async function syncConnectedEmail(connectedEmailId) {
  await connectMongo();

  const connectedEmail = await ConnectedEmail.findById(connectedEmailId);

  if (!connectedEmail) {
    throw new Error("Connected email not found");
  }

  if (!connectedEmail.centralInboxId) {
    throw new Error("Email not assigned to a central inbox");
  }

  // Get the central inbox for warmup keywords
  const centralInbox = await CentralInbox.findById(connectedEmail.centralInboxId);

  if (!centralInbox) {
    throw new Error("Central inbox not found");
  }

  // Get default stage for new emails
  const defaultStage = await Stage.findOne({
    centralInboxId: connectedEmail.centralInboxId,
    isDefault: true,
  });

  // Determine sync window
  // First sync: last 90 days
  // Subsequent syncs: since last sync
  let since;
  if (connectedEmail.lastSyncAt) {
    since = connectedEmail.lastSyncAt;
  } else {
    since = new Date();
    since.setDate(since.getDate() - 90);
  }

  let newEmailCount = 0;
  let skippedCount = 0;

  if (connectedEmail.provider === "gmail") {
    // Refresh tokens if needed
    const newTokens = await refreshTokensIfNeeded(connectedEmail);
    if (newTokens) {
      connectedEmail.oauthTokens = encryptTokens(newTokens);
      await connectedEmail.save();
    }

    // Fetch email list from Gmail
    let pageToken = null;
    let allMessages = [];

    do {
      const { messages, nextPageToken } = await fetchGmailEmails(
        connectedEmail,
        { since, maxResults: 100, pageToken }
      );
      allMessages = allMessages.concat(messages);
      pageToken = nextPageToken;
    } while (pageToken && allMessages.length < 500); // Cap at 500 emails per sync

    console.log(
      `Found ${allMessages.length} messages for ${connectedEmail.emailAddress}`
    );

    // Process each email
    for (const message of allMessages) {
      try {
        // Check if we already have this email
        const existingEmail = await Email.findOne({
          connectedEmailId: connectedEmail._id,
          $or: [
            { messageId: `<${message.id}@gmail.com>` },
            { messageId: { $regex: message.id } },
          ],
        });

        if (existingEmail) {
          skippedCount++;
          continue;
        }

        // Fetch full email content
        const emailData = await fetchGmailContent(connectedEmail, message.id);

        // Check if messageId already exists (dedup by actual Message-ID header)
        const existsByMessageId = await Email.findOne({
          messageId: emailData.messageId,
        });

        if (existsByMessageId) {
          skippedCount++;
          continue;
        }

        // Process and save
        await processAndSaveEmail(
          emailData,
          connectedEmail,
          centralInbox,
          defaultStage
        );
        newEmailCount++;
      } catch (err) {
        console.error(`Failed to process Gmail message ${message.id}:`, err);
      }
    }
  } else {
    // IMAP sync
    const emails = await fetchImapEmails(connectedEmail, {
      since,
      limit: 500,
    });

    console.log(
      `Found ${emails.length} messages for ${connectedEmail.emailAddress}`
    );

    for (const emailData of emails) {
      try {
        // Check if we already have this email
        const existingEmail = await Email.findOne({
          messageId: emailData.messageId,
        });

        if (existingEmail) {
          skippedCount++;
          continue;
        }

        // Process and save
        await processAndSaveEmail(
          emailData,
          connectedEmail,
          centralInbox,
          defaultStage
        );
        newEmailCount++;
      } catch (err) {
        console.error(`Failed to process IMAP email:`, err);
      }
    }
  }

  // Update last sync time
  connectedEmail.lastSyncAt = new Date();
  connectedEmail.status = "connected";
  connectedEmail.errorMessage = null;
  await connectedEmail.save();

  return { newEmailCount, skippedCount };
}

/**
 * Process email data and save to database
 */
async function processAndSaveEmail(
  emailData,
  connectedEmail,
  centralInbox,
  defaultStage
) {
  // Check warmup filter
  const isWarmupFiltered = applyWarmupFilter(
    emailData,
    centralInbox.warmupKeywords
  );

  // Determine if this is a sent email (from our connected email)
  const isSent =
    emailData.from?.email?.toLowerCase() ===
    connectedEmail.emailAddress.toLowerCase();

  // Create email document
  const email = new Email({
    centralInboxId: connectedEmail.centralInboxId,
    connectedEmailId: connectedEmail._id,
    threadId: emailData.threadId,
    messageId: emailData.messageId,
    inReplyTo: emailData.inReplyTo || null,
    references: emailData.references || [],
    from: emailData.from,
    to: emailData.to || [],
    cc: emailData.cc || [],
    subject: emailData.subject || "(No Subject)",
    bodyText: emailData.bodyText || "",
    bodyHtml: emailData.bodyHtml || "",
    receivedAt: emailData.receivedAt,
    isRead: isSent, // Mark sent emails as read
    isArchived: false,
    isWarmupFiltered,
    isSent,
    tags: [],
    stageId: defaultStage?._id || null,
    assignedTo: null,
    notes: [],
    attachments: emailData.attachments || [],
  });

  await email.save();

  return email;
}

/**
 * Check if email matches warmup filter keywords
 */
function applyWarmupFilter(emailData, warmupKeywords) {
  if (!warmupKeywords || warmupKeywords.length === 0) {
    return false;
  }

  const subject = (emailData.subject || "").toLowerCase();
  const bodyText = (emailData.bodyText || "").toLowerCase();
  const searchText = `${subject} ${bodyText}`;

  return warmupKeywords.some((keyword) => searchText.includes(keyword));
}

/**
 * Manual sync trigger for a user's connected emails
 */
export async function syncUserEmails(userId) {
  await connectMongo();

  const connectedEmails = await ConnectedEmail.find({
    userId,
    centralInboxId: { $exists: true, $ne: null },
    status: "connected",
  });

  const results = [];

  for (const connectedEmail of connectedEmails) {
    try {
      const result = await syncConnectedEmail(connectedEmail._id);
      results.push({ id: connectedEmail._id, success: true, ...result });
    } catch (error) {
      results.push({
        id: connectedEmail._id,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}
