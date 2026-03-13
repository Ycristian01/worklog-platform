import { z } from "zod";

export const CATEGORIES = [
  "Administration",
  "Engineering Operations",
  "New Feature/Enhancements",
  "Production Support",
] as const;

export const ENTRY_STATUSES = ["draft", "confirmed", "submitted"] as const;

export const ENTRY_SOURCES = [
  "google_calendar",
  "github",
  "slack",
  "jira",
  "linear",
  "notion",
  "manual",
  "ai",
] as const;

export const PROVIDERS = [
  "google",
  "github",
  "slack",
  "jira",
  "linear",
  "notion",
] as const;

// ─── Entry schemas ───────────────────────────────────────────────

export const createEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoryId: z.string().cuid().optional(),
  timeHours: z.number().min(0.25).max(24).multipleOf(0.25),
  description: z.string().min(1).max(500),
  notes: z.string().max(500).optional(),
  source: z.enum(ENTRY_SOURCES).optional().default("manual"),
});

export const updateEntrySchema = z.object({
  categoryId: z.string().cuid().optional(),
  timeHours: z.number().min(0.25).max(24).multipleOf(0.25).optional(),
  description: z.string().min(1).max(500).optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(ENTRY_STATUSES).optional(),
});

export const mergeEntriesSchema = z.object({
  entryIds: z.array(z.string().cuid()).min(2),
  description: z.string().min(1).max(500),
  categoryId: z.string().cuid().optional(),
});

export const splitEntrySchema = z.object({
  entries: z
    .array(
      z.object({
        description: z.string().min(1).max(500),
        timeHours: z.number().min(0.25).max(24),
        categoryId: z.string().cuid().optional(),
      })
    )
    .length(2),
});

// ─── Filter / query schemas ──────────────────────────────────────

export const dateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const entriesQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  userId: z.string().cuid().optional(),
  status: z.enum(ENTRY_STATUSES).optional(),
});

// ─── Export schemas ──────────────────────────────────────────────

export const exportSchema = z.object({
  format: z.enum(["xlsx", "csv"]),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scope: z.enum(["self", "team"]).default("self"),
  userId: z.string().cuid().optional(),
});

// ─── Timer schemas ───────────────────────────────────────────────

export const startTimerSchema = z.object({
  description: z.string().max(500).optional(),
  categoryId: z.string().cuid().optional(),
});

// ─── Sync schemas ───────────────────────────────────────────────

export const syncCalendarSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// ─── Types ───────────────────────────────────────────────────────

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type MergeEntriesInput = z.infer<typeof mergeEntriesSchema>;
export type SplitEntryInput = z.infer<typeof splitEntrySchema>;
export type EntriesQuery = z.infer<typeof entriesQuerySchema>;
export type ExportInput = z.infer<typeof exportSchema>;
export type StartTimerInput = z.infer<typeof startTimerSchema>;
export type SyncCalendarInput = z.infer<typeof syncCalendarSchema>;
