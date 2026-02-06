import { redirect } from "next/navigation";
import { auth } from "@/libs/auth";
import GlobalLeadsView from "@/components/crm/GlobalLeadsView";

export const dynamic = "force-dynamic";

export default async function GlobalLeadsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  return <GlobalLeadsView />;
}
