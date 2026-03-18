import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncGitHubSchema } from "@/lib/schemas";
import {
  type GitHubEvent,
  inferGitHubCategory,
  GITHUB_TIME_DEFAULTS,
  MIN_REVIEWS_TO_GROUP,
  prCreatedDescription,
  prMergedDescription,
  reviewGroupDescription,
  reviewGroupNotes,
  commitGroupDescription,
  issueCommentDescription,
  fetchPRTitle,
  fetchPRCommits,
  branchToTitle,
} from "@/lib/github-utils";

// Tracked event types from GitHub Events API
const TRACKED_EVENT_TYPES = [
  "PushEvent",
  "PullRequestEvent",
  "PullRequestReviewEvent",
  "IssueCommentEvent",
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = syncGitHubSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { date } = parsed.data;
  const userId = session.user.id;

  // Check if day is already submitted
  const submission = await prisma.dailySubmission.findUnique({
    where: { userId_date: { userId, date: new Date(date) } },
  });
  if (submission?.submittedAt) {
    return NextResponse.json(
      { error: "This day has already been submitted" },
      { status: 409 }
    );
  }

  // Get GitHub integration
  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: "github" } },
  });
  if (!integration?.accessToken) {
    return NextResponse.json(
      { error: "GitHub account not connected. Please sign in with GitHub." },
      { status: 404 }
    );
  }

  const accessToken = integration.accessToken;
  const githubHeaders = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Read org filter from integration metadata
  const metadata = (integration.metadata ?? {}) as Record<string, unknown>;
  const orgFilter = (metadata.githubOrg as string) || null;

  // Fetch the authenticated user's GitHub username
  const userRes = await fetch("https://api.github.com/user", {
    headers: githubHeaders,
  });

  if (!userRes.ok) {
    if (userRes.status === 401) {
      return NextResponse.json(
        { error: "GitHub token expired. Please sign out and sign back in." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: `Failed to fetch GitHub user (${userRes.status})` },
      { status: 502 }
    );
  }

  const githubUser = await userRes.json();
  const username: string = githubUser.login;

  // Fetch user events (paginated, up to 10 pages of 100)
  const targetDate = date; // YYYY-MM-DD
  const dayStart = new Date(`${targetDate}T00:00:00Z`);
  const dayEnd = new Date(`${targetDate}T23:59:59Z`);
  const allEvents: GitHubEvent[] = [];

  // Use org events endpoint if org filter is set
  const eventsBasePath = orgFilter
    ? `https://api.github.com/users/${encodeURIComponent(username)}/events/orgs/${encodeURIComponent(orgFilter)}`
    : `https://api.github.com/users/${encodeURIComponent(username)}/events`;

  for (let page = 1; page <= 10; page++) {
    const eventsUrl = new URL(eventsBasePath);
    eventsUrl.searchParams.set("per_page", "100");
    eventsUrl.searchParams.set("page", String(page));

    const eventsRes = await fetch(eventsUrl.toString(), {
      headers: githubHeaders,
    });

    if (!eventsRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch GitHub events (${eventsRes.status})` },
        { status: 502 }
      );
    }

    const events: GitHubEvent[] = await eventsRes.json();
    if (events.length === 0) break;

    for (const event of events) {
      const eventDate = new Date(event.created_at);

      if (eventDate > dayEnd) continue;

      if (eventDate < dayStart) {
        page = 11;
        break;
      }

      if (TRACKED_EVENT_TYPES.includes(event.type)) {
        allEvents.push(event);
      }
    }

    if (events.length > 0) {
      const oldest = new Date(events[events.length - 1].created_at);
      if (oldest < dayStart) break;
    }
  }

  // Cache category lookups
  const categories = await prisma.category.findMany();
  const categoryMap = new Map(categories.map((c) => [c.name, c.id]));

  let synced = 0;
  let skipped = 0;

  // ─── Process PR events (opened/merged) ─────────────────────────
  // The Events API does NOT include `title` in pull_request — we must fetch it.
  const processedPRs = new Set<string>();

  for (const event of allEvents) {
    if (event.type === "PullRequestEvent" && event.payload.pull_request) {
      const pr = event.payload.pull_request;
      const action = event.payload.action;
      const repoFullName = event.repo.name; // "org/repo"
      const prNumber = pr.number ?? event.payload.number;

      // Fetch the actual PR title from the API
      let prTitle = await fetchPRTitle(pr.url, githubHeaders);
      if (!prTitle) {
        // Fallback: derive from branch name
        prTitle = pr.head?.ref ? branchToTitle(pr.head.ref) : `PR #${prNumber}`;
      }

      let descriptionText: string;
      let timeHours: number;
      let externalId: string;
      let notes: string | null = null;

      if (action === "opened") {
        descriptionText = prCreatedDescription(prTitle);
        timeHours = GITHUB_TIME_DEFAULTS.pr_created;
        externalId = `pr-opened-${pr.id}`;

        // Fetch commits for this PR
        if (prNumber) {
          notes = await fetchPRCommits(repoFullName, prNumber, githubHeaders);
        }
      } else if (action === "closed" && pr.merged) {
        descriptionText = prMergedDescription(prTitle);
        timeHours = GITHUB_TIME_DEFAULTS.pr_merged;
        externalId = `pr-merged-${pr.id}`;
      } else {
        skipped++;
        continue;
      }

      if (processedPRs.has(externalId)) {
        skipped++;
        continue;
      }
      processedPRs.add(externalId);

      const created = await createGitHubEntry({
        userId,
        date: targetDate,
        externalId,
        description: descriptionText,
        notes,
        timeHours,
        rawData: event,
        categoryMap,
      });
      if (created) synced++;
      else skipped++;
    }
  }

  // ─── Process PR review events (group if >= threshold) ──────────
  // Collect all reviews, fetch PR titles, then decide whether to group
  const reviewsCollected: {
    prTitle: string;
    reviewId: string;
    event: GitHubEvent;
  }[] = [];
  const seenReviewIds = new Set<string>();

  for (const event of allEvents) {
    if (event.type === "PullRequestReviewEvent" && event.payload.pull_request) {
      const pr = event.payload.pull_request;
      const review = event.payload.review;

      // Only count submitted reviews
      if (
        review?.state &&
        review.state !== "approved" &&
        review.state !== "changes_requested" &&
        review.state !== "commented"
      ) {
        skipped++;
        continue;
      }

      const reviewId = `pr-review-${review?.id ?? event.id}`;
      if (seenReviewIds.has(reviewId)) {
        skipped++;
        continue;
      }
      seenReviewIds.add(reviewId);

      // Fetch the PR title from the API
      let prTitle = await fetchPRTitle(pr.url, githubHeaders);
      if (!prTitle) {
        prTitle = pr.head?.ref ? branchToTitle(pr.head.ref) : `PR #${pr.number}`;
      }

      reviewsCollected.push({ prTitle, reviewId, event });
    }
  }

  // Only create a grouped entry if we have enough reviews
  if (reviewsCollected.length >= MIN_REVIEWS_TO_GROUP) {
    const description = reviewGroupDescription(reviewsCollected.length);
    const notes = reviewGroupNotes(reviewsCollected);
    const externalId = `reviews-group-${targetDate}`;

    const created = await createGitHubEntry({
      userId,
      date: targetDate,
      externalId,
      description,
      notes,
      timeHours: GITHUB_TIME_DEFAULTS.review_group,
      rawData: reviewsCollected.map((r) => ({
        reviewId: r.reviewId,
        prTitle: r.prTitle,
      })),
      categoryMap,
    });
    if (created) synced++;
    else skipped += reviewsCollected.length;
  } else {
    skipped += reviewsCollected.length;
  }

  // ─── Process push events (group commits per repo) ──────────────
  const commitsByRepo = new Map<
    string,
    { commits: { sha: string; message: string }[]; events: GitHubEvent[] }
  >();

  for (const event of allEvents) {
    if (event.type === "PushEvent" && event.payload.commits) {
      const repo = event.repo.name.split("/").pop() ?? event.repo.name;
      const existing = commitsByRepo.get(repo) ?? { commits: [], events: [] };

      for (const commit of event.payload.commits) {
        if (!existing.commits.some((c) => c.sha === commit.sha)) {
          existing.commits.push(commit);
        }
      }
      existing.events.push(event);
      commitsByRepo.set(repo, existing);
    }
  }

  for (const [repo, { commits, events }] of Array.from(commitsByRepo.entries())) {
    if (commits.length === 0) continue;

    const externalId = `commits-${repo}-${targetDate}`;
    const description = commitGroupDescription(
      repo,
      commits.length,
      commits.length === 1 ? commits[0].message.split("\n")[0] : undefined
    );

    const created = await createGitHubEntry({
      userId,
      date: targetDate,
      externalId,
      description,
      notes: null,
      timeHours: GITHUB_TIME_DEFAULTS.commit_group,
      rawData: { repo, commits, events: events.map((e: GitHubEvent) => e.id) },
      categoryMap,
    });
    if (created) synced++;
    else skipped++;
  }

  // ─── Process issue comment events ──────────────────────────────
  const processedComments = new Set<string>();

  for (const event of allEvents) {
    if (event.type === "IssueCommentEvent" && event.payload.issue) {
      const issue = event.payload.issue;

      if (issue.pull_request) {
        skipped++;
        continue;
      }

      const repo = event.repo.name.split("/").pop() ?? event.repo.name;
      const externalId = `issue-comment-${event.payload.comment?.id ?? event.id}`;

      if (processedComments.has(externalId)) {
        skipped++;
        continue;
      }
      processedComments.add(externalId);

      const description = issueCommentDescription(repo, issue.number, issue.title);

      const created = await createGitHubEntry({
        userId,
        date: targetDate,
        externalId,
        description,
        notes: null,
        timeHours: GITHUB_TIME_DEFAULTS.issue_commented,
        rawData: event,
        categoryMap,
      });
      if (created) synced++;
      else skipped++;
    }
  }

  // Update last sync timestamp
  await prisma.integration.update({
    where: { id: integration.id },
    data: { lastSyncAt: new Date() },
  });

  return NextResponse.json({
    synced,
    skipped,
    total: allEvents.length,
  });
}

// ─── Helper: create signal + draft entry if not already exists ──

async function createGitHubEntry({
  userId,
  date,
  externalId,
  description,
  notes,
  timeHours,
  rawData,
  categoryMap,
}: {
  userId: string;
  date: string;
  externalId: string;
  description: string;
  notes: string | null;
  timeHours: number;
  rawData: object;
  categoryMap: Map<string, string>;
}): Promise<boolean> {
  const signal = await prisma.signal.upsert({
    where: {
      provider_externalId: {
        provider: "github",
        externalId,
      },
    },
    create: {
      userId,
      provider: "github",
      externalId,
      occurredAt: new Date(`${date}T12:00:00Z`),
      rawData,
    },
    update: {
      rawData,
    },
  });

  const existingEntry = await prisma.entry.findFirst({
    where: { userId, signalIds: { has: signal.id } },
  });

  if (existingEntry) {
    return false;
  }

  const categoryName = inferGitHubCategory(description);
  const categoryId = categoryMap.get(categoryName) ?? null;

  await prisma.entry.create({
    data: {
      userId,
      date: new Date(date),
      categoryId,
      timeHours,
      description,
      notes,
      status: "draft",
      source: "github",
      signalIds: [signal.id],
    },
  });

  return true;
}
