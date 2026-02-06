import { redirect } from "next/navigation";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import CentralInbox from "@/models/CentralInbox";
import ConnectedEmail from "@/models/ConnectedEmail";
import User from "@/models/User";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  await connectMongo();

  // Check onboarding status
  const user = await User.findById(session.user.id).select(
    "onboardingCompleted onboardingStep"
  );

  // Redirect to onboarding if not completed
  if (user && !user.onboardingCompleted) {
    redirect("/dashboard/onboarding");
  }

  // Check if user has any central inboxes
  const inboxes = await CentralInbox.find({
    $or: [
      { userId: session.user.id },
      { "teamMembers.userId": session.user.id },
    ],
  }).sort({ createdAt: -1 });

  // If user has inboxes, redirect to the first one
  if (inboxes.length > 0) {
    const firstInbox = inboxes[0];
    redirect(`/dashboard/inbox/${firstInbox._id}`);
  }

  // Check if user has any connected emails
  const connectedEmails = await ConnectedEmail.find({
    userId: session.user.id,
  });

  // Show onboarding/setup screen
  return (
    <main className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="bg-white border border-[#e5e5e5] rounded-xl shadow-sm max-w-lg w-full">
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-[#171717] mb-2">Welcome to Settr</h1>
          <p className="text-neutral-500 text-sm mb-8">
            Let&apos;s get you set up with your first unified inbox.
          </p>

          <div className="space-y-3">
            {/* Step 1: Connect Email */}
            <div
              className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                connectedEmails.length > 0
                  ? "border-green-200 bg-green-50"
                  : "border-[#e5e5e5] bg-[#fafafa]"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  connectedEmails.length > 0
                    ? "bg-green-500 text-white"
                    : "bg-[#e5e5e5] text-neutral-500"
                }`}
              >
                {connectedEmails.length > 0 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  "1"
                )}
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-sm text-[#171717]">Connect an email account</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {connectedEmails.length > 0
                    ? `${connectedEmails.length} email(s) connected`
                    : "Link your Gmail or other email provider"}
                </div>
              </div>
              <Link
                href="/dashboard/settings/emails"
                className="px-3 py-1.5 bg-[#171717] text-white rounded-lg text-xs font-medium hover:bg-[#262626] transition-colors"
              >
                {connectedEmails.length > 0 ? "Manage" : "Connect"}
              </Link>
            </div>

            {/* Step 2: Create Inbox */}
            <div className="flex items-center gap-4 p-4 rounded-xl border border-[#e5e5e5] bg-[#fafafa]">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-[#e5e5e5] text-neutral-500">
                2
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-sm text-[#171717]">Create a central inbox</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  Group emails by client, campaign, or team
                </div>
              </div>
              <CreateInboxButton disabled={connectedEmails.length === 0} />
            </div>
          </div>

          {connectedEmails.length === 0 && (
            <p className="text-xs text-neutral-400 mt-6">
              Connect at least one email account to create your first inbox.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

// Client component for creating inbox
function CreateInboxButton({ disabled }) {
  return (
    <form action="/api/central-inboxes" method="POST">
      <input type="hidden" name="name" value="My First Inbox" />
      <button
        type="submit"
        disabled={disabled}
        className="px-3 py-1.5 bg-[#171717] text-white rounded-lg text-xs font-medium hover:bg-[#262626] disabled:opacity-30 transition-colors"
        formAction={async () => {
          "use server";
          const { auth } = await import("@/libs/auth");
          const session = await auth();
          if (!session) return;

          const connectMongo = (await import("@/libs/mongoose")).default;
          await connectMongo();

          const CentralInbox = (await import("@/models/CentralInbox")).default;
          const Stage = (await import("@/models/Stage")).default;

          const inbox = await CentralInbox.create({
            userId: session.user.id,
            name: "My First Inbox",
            description: "",
            teamMembers: [],
            warmupKeywords: [],
          });

          // Create default stages
          const stages = [
            { name: "New", color: "#6366f1", order: 0, isDefault: true },
            { name: "Interested", color: "#22c55e", order: 1 },
            { name: "Meeting Booked", color: "#3b82f6", order: 2 },
            { name: "Not Interested", color: "#ef4444", order: 3 },
            { name: "No Response", color: "#9ca3af", order: 4 },
          ];

          await Stage.insertMany(
            stages.map((s) => ({ ...s, centralInboxId: inbox._id }))
          );

          const { redirect } = await import("next/navigation");
          redirect(`/dashboard/inbox/${inbox._id}`);
        }}
      >
        Create
      </button>
    </form>
  );
}
