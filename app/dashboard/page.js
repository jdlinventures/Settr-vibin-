import { redirect } from "next/navigation";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import CentralInbox from "@/models/CentralInbox";
import ConnectedEmail from "@/models/ConnectedEmail";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  await connectMongo();

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
    <main className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card bg-base-100 shadow-xl max-w-lg w-full">
        <div className="card-body text-center">
          <h1 className="text-2xl font-bold mb-2">Welcome to Settr</h1>
          <p className="text-base-content/70 mb-6">
            Let's get you set up with your first unified inbox.
          </p>

          <div className="space-y-4">
            {/* Step 1: Connect Email */}
            <div
              className={`flex items-center gap-4 p-4 rounded-lg border ${
                connectedEmails.length > 0
                  ? "border-success bg-success/10"
                  : "border-base-300"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  connectedEmails.length > 0
                    ? "bg-success text-success-content"
                    : "bg-base-300"
                }`}
              >
                {connectedEmails.length > 0 ? "✓" : "1"}
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">Connect an email account</div>
                <div className="text-sm text-base-content/60">
                  {connectedEmails.length > 0
                    ? `${connectedEmails.length} email(s) connected`
                    : "Link your Gmail or other email provider"}
                </div>
              </div>
              <Link
                href="/dashboard/settings/emails"
                className="btn btn-sm btn-primary"
              >
                {connectedEmails.length > 0 ? "Manage" : "Connect"}
              </Link>
            </div>

            {/* Step 2: Create Inbox */}
            <div className="flex items-center gap-4 p-4 rounded-lg border border-base-300">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-base-300">
                2
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">Create a central inbox</div>
                <div className="text-sm text-base-content/60">
                  Group emails by client, campaign, or team
                </div>
              </div>
              <CreateInboxButton disabled={connectedEmails.length === 0} />
            </div>
          </div>

          {connectedEmails.length === 0 && (
            <p className="text-sm text-base-content/50 mt-6">
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
        className="btn btn-sm btn-primary"
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
