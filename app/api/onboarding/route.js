import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";

/**
 * GET /api/onboarding
 * Get current onboarding status
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();

    const user = await User.findById(session.user.id).select(
      "onboardingStep onboardingCompleted"
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      step: user.onboardingStep || 0,
      completed: user.onboardingCompleted || false,
    });
  } catch (error) {
    console.error("Get onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to get onboarding status" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/onboarding
 * Update onboarding step
 */
export async function PUT(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { step } = await request.json();

    if (typeof step !== "number" || step < 0 || step > 5) {
      return NextResponse.json(
        { error: "Invalid step value" },
        { status: 400 }
      );
    }

    await connectMongo();

    const updateData = {
      onboardingStep: step,
    };

    // Mark as completed if step is 5
    if (step >= 5) {
      updateData.onboardingCompleted = true;
    }

    const user = await User.findByIdAndUpdate(session.user.id, updateData, {
      new: true,
    }).select("onboardingStep onboardingCompleted");

    return NextResponse.json({
      step: user.onboardingStep,
      completed: user.onboardingCompleted,
    });
  } catch (error) {
    console.error("Update onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to update onboarding" },
      { status: 500 }
    );
  }
}
