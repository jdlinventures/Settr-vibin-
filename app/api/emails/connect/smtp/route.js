import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import ConnectedEmail from "@/models/ConnectedEmail";
import { testConnection as testImap } from "@/libs/imap";
import { testConnection as testSmtp, encryptConfig } from "@/libs/smtp";

/**
 * POST /api/emails/connect/smtp
 * Connect an SMTP/IMAP email account
 */
export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      email,
      imapHost,
      imapPort,
      smtpHost,
      smtpPort,
      username,
      password,
    } = body;

    // Validate required fields
    if (!email || !imapHost || !smtpHost || !username || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const config = {
      email,
      imapHost,
      imapPort: imapPort || 993,
      smtpHost,
      smtpPort: smtpPort || 587,
      username,
      password,
    };

    // Test IMAP connection
    try {
      await testImap(config);
    } catch (imapError) {
      return NextResponse.json(
        { error: `IMAP connection failed: ${imapError.message}` },
        { status: 400 }
      );
    }

    // Test SMTP connection
    try {
      await testSmtp(config);
    } catch (smtpError) {
      return NextResponse.json(
        { error: `SMTP connection failed: ${smtpError.message}` },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    await connectMongo();

    // Check if this email is already connected
    const existingEmail = await ConnectedEmail.findOne({
      userId: session.user.id,
      emailAddress: email.toLowerCase(),
    });

    let connectedEmail;

    if (existingEmail) {
      // Update existing connection
      existingEmail.smtpConfig = encryptConfig(config);
      existingEmail.status = "connected";
      existingEmail.errorMessage = null;
      await existingEmail.save();
      connectedEmail = existingEmail;
    } else {
      // Create new connected email
      connectedEmail = await ConnectedEmail.create({
        userId: session.user.id,
        emailAddress: email.toLowerCase(),
        provider: "smtp",
        smtpConfig: encryptConfig(config),
        status: "connected",
      });
    }

    return NextResponse.json({
      success: true,
      connectedEmailId: connectedEmail._id,
      emailAddress: connectedEmail.emailAddress,
    });
  } catch (error) {
    console.error("SMTP connection error:", error);
    return NextResponse.json(
      { error: "Failed to connect email account" },
      { status: 500 }
    );
  }
}
