import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Draft from "@/models/Draft";
import Email from "@/models/Email";
import ConnectedEmail from "@/models/ConnectedEmail";
import CentralInbox from "@/models/CentralInbox";
import { sendEmail as sendSmtpEmail } from "@/libs/smtp";

/**
 * Convert HTML to plain text (basic)
 */
function htmlToText(html) {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * POST /api/send
 * Send an email
 */
export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      draftId,
      sendFromEmailId,
      centralInboxId,
      to,
      cc,
      bcc,
      subject,
      bodyHtml,
      replyToEmailId,
    } = body;

    await connectMongo();

    let emailData;
    let draft;
    let inboxId;

    // If draftId provided, load draft data
    if (draftId) {
      draft = await Draft.findOne({
        _id: draftId,
        userId: session.user.id,
      }).populate("replyToEmailId", "messageId references threadId");

      if (!draft) {
        return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      }

      emailData = {
        sendFromEmailId: draft.sendFromEmailId,
        centralInboxId: draft.centralInboxId,
        to: draft.to,
        cc: draft.cc,
        subject: draft.subject,
        bodyHtml: draft.bodyHtml,
        replyToEmail: draft.replyToEmailId,
      };
      inboxId = draft.centralInboxId;
    } else {
      // Use provided data directly
      if (!sendFromEmailId || !centralInboxId || !to?.length || !subject) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      // Load reply context if replying
      let replyToEmail = null;
      if (replyToEmailId) {
        replyToEmail = await Email.findById(replyToEmailId).select(
          "messageId references threadId"
        );
      }

      emailData = {
        sendFromEmailId,
        centralInboxId,
        to,
        cc: cc || [],
        bcc: bcc || [],
        subject,
        bodyHtml,
        replyToEmail,
      };
      inboxId = centralInboxId;
    }

    // Verify user has access to this inbox
    const centralInbox = await CentralInbox.findById(inboxId);

    if (!centralInbox) {
      return NextResponse.json(
        { error: "Central inbox not found" },
        { status: 404 }
      );
    }

    const isOwner = centralInbox.userId.toString() === session.user.id;
    const isMember = centralInbox.teamMembers.some(
      (m) => m.userId.toString() === session.user.id
    );

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the connected email to send from
    const connectedEmail = await ConnectedEmail.findOne({
      _id: emailData.sendFromEmailId,
      userId: session.user.id,
    });

    if (!connectedEmail) {
      return NextResponse.json(
        { error: "Connected email not found" },
        { status: 404 }
      );
    }

    if (connectedEmail.status !== "connected") {
      return NextResponse.json(
        { error: "Email account is not connected" },
        { status: 400 }
      );
    }

    // Build email for sending
    const emailToSend = {
      to: emailData.to,
      cc: emailData.cc,
      bcc: emailData.bcc || [],
      subject: emailData.subject,
      bodyHtml: emailData.bodyHtml,
      bodyText: htmlToText(emailData.bodyHtml),
    };

    // Add reply headers if replying
    if (emailData.replyToEmail) {
      emailToSend.inReplyTo = emailData.replyToEmail.messageId;
      emailToSend.references = emailData.replyToEmail.references
        ? `${emailData.replyToEmail.references} ${emailData.replyToEmail.messageId}`
        : emailData.replyToEmail.messageId;
    }

    // Send the email based on provider
    let sentInfo;

    if (connectedEmail.provider === "smtp") {
      sentInfo = await sendSmtpEmail(connectedEmail, emailToSend);
    } else if (connectedEmail.provider === "gmail") {
      // TODO: Implement Gmail API sending
      return NextResponse.json(
        { error: "Gmail sending not yet implemented" },
        { status: 501 }
      );
    }

    // Create Email record for sent message
    const sentEmail = await Email.create({
      centralInboxId: inboxId,
      connectedEmailId: connectedEmail._id,
      threadId: emailData.replyToEmail?.threadId || sentInfo.messageId,
      messageId: sentInfo.messageId,
      inReplyTo: emailToSend.inReplyTo,
      references: emailToSend.references
        ? emailToSend.references.split(" ")
        : [],
      from: {
        name: session.user.name,
        email: connectedEmail.emailAddress,
      },
      to: emailData.to,
      cc: emailData.cc,
      subject: emailData.subject,
      bodyText: emailToSend.bodyText,
      bodyHtml: emailData.bodyHtml,
      receivedAt: new Date(),
      isRead: true,
      isArchived: false,
      isWarmupFiltered: false,
      isSent: true,
    });

    // Delete draft if it exists
    if (draft) {
      await Draft.deleteOne({ _id: draft._id });
    }

    return NextResponse.json({
      success: true,
      emailId: sentEmail._id,
      messageId: sentInfo.messageId,
    });
  } catch (error) {
    console.error("Send email error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
