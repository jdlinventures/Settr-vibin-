import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import ConnectedEmail from "@/models/ConnectedEmail";
import { testConnection as testGmail } from "@/libs/gmail";
import { testConnectedEmail as testImap } from "@/libs/imap";
import { testConnectedEmail as testSmtp } from "@/libs/smtp";

/**
 * POST /api/emails/[id]/test
 * Test connection health for a connected email
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await connectMongo();

    const connectedEmail = await ConnectedEmail.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!connectedEmail) {
      return NextResponse.json(
        { error: "Connected email not found" },
        { status: 404 }
      );
    }

    let isConnected = false;
    let errorMessage = null;

    try {
      if (connectedEmail.provider === "gmail") {
        isConnected = await testGmail(connectedEmail);
      } else {
        // Test both IMAP and SMTP for SMTP/IMAP connections
        const imapOk = await testImap(connectedEmail);
        const smtpOk = await testSmtp(connectedEmail);
        isConnected = imapOk && smtpOk;

        if (!imapOk) errorMessage = "IMAP connection failed";
        if (!smtpOk)
          errorMessage = errorMessage
            ? `${errorMessage}, SMTP connection failed`
            : "SMTP connection failed";
      }
    } catch (error) {
      errorMessage = error.message;
    }

    // Update status in database
    connectedEmail.status = isConnected ? "connected" : "error";
    connectedEmail.errorMessage = errorMessage;
    await connectedEmail.save();

    return NextResponse.json({
      status: connectedEmail.status,
      error: errorMessage,
    });
  } catch (error) {
    console.error("Test connection error:", error);
    return NextResponse.json(
      { error: "Failed to test connection" },
      { status: 500 }
    );
  }
}
