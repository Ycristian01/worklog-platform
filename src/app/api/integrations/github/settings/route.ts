import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateGitHubSettingsSchema = z.object({
  githubOrg: z.string().nullable(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateGitHubSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId: session.user.id, provider: "github" } },
  });

  if (!integration) {
    return NextResponse.json(
      { error: "GitHub account not connected" },
      { status: 404 }
    );
  }

  const currentMetadata = (integration.metadata ?? {}) as Record<string, unknown>;
  const updatedMetadata = {
    ...currentMetadata,
    githubOrg: parsed.data.githubOrg,
  };

  await prisma.integration.update({
    where: { id: integration.id },
    data: { metadata: updatedMetadata },
  });

  return NextResponse.json({ ok: true, githubOrg: parsed.data.githubOrg });
}
