import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  inferCategoryFromTitle,
  roundToQuarterHour,
  refreshGoogleToken,
} from "@/lib/calendar-utils";
import { syncCalendarSchema } from "@/lib/schemas";

interface GoogleEvent {
  id: string;
  summary?: string;
  status?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: { email: string; responseStatus: string; self?: boolean }[];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = syncCalendarSchema.safeParse(body);
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

  // Get Google integration
  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: "google" } },
  });
  if (!integration) {
    return NextResponse.json(
      { error: "Google account not connected. Please sign in with Google." },
      { status: 404 }
    );
  }

  // Refresh token if needed
  let accessToken: string;
  try {
    accessToken = await refreshGoogleToken(integration);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Token refresh failed" },
      { status: 401 }
    );
  }

  // Fetch calendar events for the given date
  const timeMin = new Date(`${date}T00:00:00Z`).toISOString();
  const timeMax = new Date(`${date}T23:59:59Z`).toISOString();

  const calendarUrl = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
  );
  calendarUrl.searchParams.set("timeMin", timeMin);
  calendarUrl.searchParams.set("timeMax", timeMax);
  calendarUrl.searchParams.set("singleEvents", "true");
  calendarUrl.searchParams.set("orderBy", "startTime");
  calendarUrl.searchParams.set("maxResults", "250");

  const calendarRes = await fetch(calendarUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!calendarRes.ok) {
    const errorBody = await calendarRes.json().catch(() => null);
    const googleMessage =
      errorBody?.error?.message ?? errorBody?.error_description ?? "";

    if (calendarRes.status === 401) {
      return NextResponse.json(
        { error: "Google token expired. Please sign out and sign back in." },
        { status: 401 }
      );
    }
    if (calendarRes.status === 403) {
      return NextResponse.json(
        {
          error:
            "Google Calendar API access denied. Please enable the Google Calendar API in your Google Cloud Console and ensure the calendar.readonly scope is granted. " +
            (googleMessage ? `Details: ${googleMessage}` : ""),
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      {
        error: `Failed to fetch calendar events from Google (${calendarRes.status}). ${googleMessage}`,
      },
      { status: 502 }
    );
  }

  const calendarData = await calendarRes.json();
  const events: GoogleEvent[] = calendarData.items ?? [];

  // Cache category lookups
  const categories = await prisma.category.findMany();
  const categoryMap = new Map(categories.map((c) => [c.name, c.id]));

  let synced = 0;
  let skipped = 0;

  for (const event of events) {
    // Skip cancelled events
    if (event.status === "cancelled") {
      skipped++;
      continue;
    }

    // Skip all-day events (have start.date instead of start.dateTime)
    if (!event.start.dateTime || !event.end.dateTime) {
      skipped++;
      continue;
    }

    // Skip declined events
    const selfAttendee = event.attendees?.find((a) => a.self);
    if (selfAttendee?.responseStatus === "declined") {
      skipped++;
      continue;
    }

    // Calculate duration
    const startMs = new Date(event.start.dateTime).getTime();
    const endMs = new Date(event.end.dateTime).getTime();
    const durationMinutes = (endMs - startMs) / 60_000;

    // Skip events shorter than 5 minutes
    if (durationMinutes < 5) {
      skipped++;
      continue;
    }

    // Skip events that haven't ended yet (only sync past events)
    if (endMs > Date.now()) {
      skipped++;
      continue;
    }

    const timeHours = roundToQuarterHour(durationMinutes);
    const title = event.summary || "Untitled event";

    // Upsert signal (idempotent via provider + externalId)
    const signal = await prisma.signal.upsert({
      where: {
        provider_externalId: {
          provider: "google_calendar",
          externalId: event.id,
        },
      },
      create: {
        userId,
        provider: "google_calendar",
        externalId: event.id,
        occurredAt: new Date(event.start.dateTime),
        rawData: event as object,
      },
      update: {
        rawData: event as object,
      },
    });

    // Check if an entry already exists for this signal
    const existingEntry = await prisma.entry.findFirst({
      where: { userId, signalIds: { has: signal.id } },
    });

    if (existingEntry) {
      skipped++;
      continue;
    }

    // Infer category
    const categoryName = inferCategoryFromTitle(title);
    const categoryId = categoryName ? categoryMap.get(categoryName) ?? null : null;

    // Create draft entry
    await prisma.entry.create({
      data: {
        userId,
        date: new Date(date),
        categoryId,
        timeHours,
        description: title,
        status: "draft",
        source: "google_calendar",
        signalIds: [signal.id],
      },
    });

    synced++;
  }

  // Update last sync timestamp
  await prisma.integration.update({
    where: { id: integration.id },
    data: { lastSyncAt: new Date() },
  });

  return NextResponse.json({
    synced,
    skipped,
    total: events.length,
  });
}
