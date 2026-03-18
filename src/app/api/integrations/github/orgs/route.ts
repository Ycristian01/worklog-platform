import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId: session.user.id, provider: "github" } },
  });

  if (!integration?.accessToken) {
    return NextResponse.json(
      { error: "GitHub account not connected" },
      { status: 404 }
    );
  }

  const res = await fetch("https://api.github.com/user/orgs?per_page=100", {
    headers: {
      Authorization: `Bearer ${integration.accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Failed to fetch GitHub orgs (${res.status})` },
      { status: 502 }
    );
  }

  const orgs: { login: string; avatar_url: string }[] = await res.json();

  // Return the currently selected org from metadata
  const metadata = (integration.metadata ?? {}) as Record<string, unknown>;
  const selectedOrg = (metadata.githubOrg as string) || null;

  return NextResponse.json({
    orgs: orgs.map((o) => ({ login: o.login, avatarUrl: o.avatar_url })),
    selectedOrg,
  });
}
