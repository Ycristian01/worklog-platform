import { prisma } from "@/lib/prisma";

// ─── Category inference from event title ────────────────────────────

const CATEGORY_KEYWORDS: { category: string; keywords: string[] }[] = [
  {
    category: "Production Support",
    keywords: [
      "support",
      "triage",
      "escalation",
      "outage",
      "hotfix",
      "incident review",
      "sev1",
      "sev2",
      "pagerduty",
      "on-call",
      "production issue",
    ],
  },
  {
    category: "Engineering Operations",
    keywords: [
      "sprint planning",
      "grooming",
      "refinement",
      "backlog",
      "deploy",
      "release",
      "postmortem",
      "architecture review",
      "tech debt",
      "ci/cd",
      "infra",
      "code review",
    ],
  },
  {
    category: "Administration",
    keywords: [
      "standup",
      "daily",
      "1:1",
      "one-on-one",
      "sync",
      "team meeting",
      "all-hands",
      "retro",
      "retrospective",
      "check-in",
      "status update",
      "weekly",
      "staff meeting",
      "meeting",
      "call",
    ],
  },
  {
    category: "New Feature/Enhancements",
    keywords: [
      "design review",
      "spec review",
      "feature",
      "demo",
      "kickoff",
      "brainstorm",
      "user research",
      "prototype",
    ],
  },
];

export function inferCategoryFromTitle(title: string): string | null {
  const lower = title.toLowerCase();
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    // Check longer phrases first (keywords are ordered longest-first within each group)
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return category;
      }
    }
  }
  return null;
}

// ─── Duration rounding ──────────────────────────────────────────────

export function roundToQuarterHour(minutes: number): number {
  const rounded = Math.round((minutes / 60) * 4) / 4;
  return Math.max(0.25, rounded);
}

// ─── Google token refresh ───────────────────────────────────────────

interface IntegrationRecord {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpires: Date | null;
}

export async function refreshGoogleToken(
  integration: IntegrationRecord
): Promise<string> {
  // If token is still valid (with 60s buffer), return it
  if (
    integration.accessToken &&
    integration.tokenExpires &&
    integration.tokenExpires.getTime() > Date.now() + 60_000
  ) {
    return integration.accessToken;
  }

  if (!integration.refreshToken) {
    throw new Error(
      "No refresh token available. Please sign out and sign back in with Google."
    );
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: integration.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(
      "Failed to refresh Google token. Please sign out and sign back in with Google."
    );
  }

  const data = await res.json();
  const newAccessToken: string = data.access_token;
  const expiresIn: number = data.expires_in; // seconds

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      accessToken: newAccessToken,
      tokenExpires: new Date(Date.now() + expiresIn * 1000),
    },
  });

  return newAccessToken;
}
