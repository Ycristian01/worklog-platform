import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome, {session.user?.name}. Your daily worklog will appear here.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <p className="text-lg font-medium">No entries yet</p>
        <p className="mt-1 text-sm">
          Connect your integrations or add a manual entry to get started.
        </p>
      </div>
    </div>
  );
}
