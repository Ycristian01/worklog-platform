import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ExportClient } from "./export-client";

export default async function ExportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <ExportClient />;
}
