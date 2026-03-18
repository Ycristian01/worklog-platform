// ─── GitHub category inference ──────────────────────────────────

const PRODUCTION_SUPPORT_KEYWORDS = [
  "hotfix",
  "bug",
  "fix",
  "incident",
  "patch",
  "revert",
  "rollback",
  "emergency",
  "production issue",
  "sev1",
  "sev2",
];

const ENGINEERING_OPS_KEYWORDS = [
  "docs",
  "readme",
  "documentation",
  "ci/cd",
  "ci",
  "cd",
  "pipeline",
  "infra",
  "terraform",
  "deploy",
  "release",
  "config",
  "lint",
  "refactor",
  "chore",
  "test",
  "tests",
];

export function inferGitHubCategory(text: string): string {
  const lower = text.toLowerCase();

  for (const kw of PRODUCTION_SUPPORT_KEYWORDS) {
    if (lower.includes(kw)) return "Production Support";
  }

  for (const kw of ENGINEERING_OPS_KEYWORDS) {
    if (lower.includes(kw)) return "Engineering Operations";
  }

  return "New Feature/Enhancements";
}

// ─── Default time estimates per event type ──────────────────────

export const GITHUB_TIME_DEFAULTS: Record<string, number> = {
  pr_created: 2.0,
  pr_merged: 0.5,
  review_group: 0.5,
  commit_group: 1.0,
  issue_commented: 0.5,
};

// Minimum reviews in a day before we create a grouped entry
export const MIN_REVIEWS_TO_GROUP = 3;

// ─── Description templates ──────────────────────────────────────

export function prCreatedDescription(title: string): string {
  return `PR: ${title}`;
}

export function prMergedDescription(title: string): string {
  return `PR Merged: ${title}`;
}

export function reviewGroupDescription(count: number): string {
  return `Code Reviews (${count})`;
}

export function reviewGroupNotes(
  reviews: { prTitle: string }[]
): string {
  return reviews.map((r) => `# ${r.prTitle}`).join("\n");
}

export function commitGroupDescription(
  repo: string,
  count: number,
  singleMessage?: string
): string {
  if (count === 1 && singleMessage) {
    return `Development | ${repo}: ${singleMessage}`;
  }
  return `Development | ${repo}: ${count} commit${count !== 1 ? "s" : ""}`;
}

export function issueCommentDescription(
  repo: string,
  number: number,
  title: string
): string {
  return `Issue Discussion | ${repo}: #${number} ${title}`;
}

// ─── PR commit notes formatting ─────────────────────────────────

export function formatPRCommitNotes(
  commits: { message: string }[]
): string {
  return commits
    .map((c) => `# ${c.message.split("\n")[0]}`)
    .join("\n");
}

// ─── GitHub API helpers ─────────────────────────────────────────

/**
 * Fetch a PR's title from the GitHub API.
 * The Events API doesn't include `title` in the pull_request object,
 * so we need to fetch it separately.
 */
export async function fetchPRTitle(
  prUrl: string,
  headers: Record<string, string>
): Promise<string | null> {
  try {
    const res = await fetch(prUrl, { headers });
    if (!res.ok) return null;
    const data: { title: string } = await res.json();
    return data.title;
  } catch {
    return null;
  }
}

/**
 * Fetch a PR's commits to build notes with commit messages.
 */
export async function fetchPRCommits(
  repoFullName: string,
  prNumber: number,
  headers: Record<string, string>
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}/commits?per_page=100`,
      { headers }
    );
    if (!res.ok) return null;

    const commits: { commit: { message: string } }[] = await res.json();
    if (commits.length === 0) return null;

    return formatPRCommitNotes(
      commits.map((c) => ({ message: c.commit.message }))
    );
  } catch {
    return null;
  }
}

// ─── Branch name to readable title fallback ─────────────────────

export function branchToTitle(ref: string): string {
  // "feat/improving-utm-variables" → "improving utm variables"
  const cleaned = ref
    .replace(/^(feat|fix|hotfix|chore|docs|refactor|test|ci)\//i, "")
    .replace(/[-_]/g, " ")
    .trim();
  return cleaned || ref;
}

// ─── GitHub API types ───────────────────────────────────────────

export interface GitHubEvent {
  id: string;
  type: string;
  org?: { login: string };
  repo: { name: string };
  created_at: string;
  payload: GitHubEventPayload;
}

interface GitHubEventPayload {
  action?: string;
  number?: number;
  pull_request?: {
    id: number;
    url: string;
    number: number;
    title?: string;
    merged?: boolean;
    user?: { login: string };
    head?: { ref: string };
    base?: { ref: string };
  };
  review?: {
    id: number;
    state: string;
    user?: { login: string };
    pull_request_url?: string;
  };
  commits?: {
    sha: string;
    message: string;
  }[];
  size?: number;
  issue?: {
    number: number;
    title: string;
    pull_request?: object;
  };
  comment?: {
    id: number;
  };
}
