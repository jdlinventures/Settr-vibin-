import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import ConnectedEmail from "@/models/ConnectedEmail";
import {
  exchangeCodeForTokens,
  getEmailFromTokens,
  encryptTokens,
} from "@/libs/gmail";

/**
 * GET /api/auth/gmail/callback
 * Handle OAuth callback from Google
 */
export async function GET(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/api/auth/signin", request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error("Gmail OAuth error:", error);
      return NextResponse.redirect(
        new URL("/dashboard/settings/emails?error=oauth_denied", request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/dashboard/settings/emails?error=invalid_callback", request.url)
      );
    }

    // Verify state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      return NextResponse.redirect(
        new URL("/dashboard/settings/emails?error=invalid_state", request.url)
      );
    }

    // Verify state belongs to current user
    if (stateData.userId !== session.user.id) {
      return NextResponse.redirect(
        new URL("/dashboard/settings/emails?error=state_mismatch", request.url)
      );
    }

    // Check state is not too old (10 minutes)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(
        new URL("/dashboard/settings/emails?error=state_expired", request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get email address from tokens
    const emailAddress = await getEmailFromTokens(tokens);

    // Connect to MongoDB
    await connectMongo();

    // Check if this email is already connected
    const existingEmail = await ConnectedEmail.findOne({
      userId: session.user.id,
      emailAddress,
    });

    if (existingEmail) {
      // Update existing connection with new tokens
      existingEmail.oauthTokens = encryptTokens(tokens);
      existingEmail.status = "connected";
      existingEmail.errorMessage = null;
      await existingEmail.save();
    } else {
      // Create new connected email
      await ConnectedEmail.create({
        userId: session.user.id,
        emailAddress,
        provider: "gmail",
        oauthTokens: encryptTokens(tokens),
        status: "connected",
      });
    }

    // Redirect to settings with success
    return NextResponse.redirect(
      new URL("/dashboard/settings/emails?success=gmail_connected", request.url)
    );
  } catch (error) {
    console.error("Gmail callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/settings/emails?error=connection_failed", request.url)
    );
  }
}
