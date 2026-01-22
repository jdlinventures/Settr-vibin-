import { redirect } from "next/navigation";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import CentralInbox from "@/models/CentralInbox";
import InboxLayout from "@/components/inbox/InboxLayout";

export const dynamic = "force-dynamic";

export default async function InboxPage({ params }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const { centralInboxId } = await params;

  await connectMongo();

  // Verify user has access to this inbox
  const centralInbox = await CentralInbox.findById(centralInboxId);

  if (!centralInbox) {
    redirect("/dashboard");
  }

  const isOwner = centralInbox.userId.toString() === session.user.id;
  const isMember = centralInbox.teamMembers.some(
    (m) => m.userId.toString() === session.user.id
  );

  if (!isOwner && !isMember) {
    redirect("/dashboard");
  }

  return <InboxLayout centralInboxId={centralInboxId} />;
}
