import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/require-manager";
import { exportSchema } from "@/lib/schemas";
import ExcelJS from "exceljs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = exportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { format, from, to, scope } = parsed.data;

  // Team export requires manager role
  if (scope === "team") {
    const mgr = await requireManager();
    if (!mgr) {
      return NextResponse.json(
        { error: "Forbidden: manager role required" },
        { status: 403 }
      );
    }
  }

  const where: Record<string, unknown> = {
    status: "submitted",
    date: { gte: new Date(from), lte: new Date(to) },
  };

  if (scope === "self") {
    where.userId = session.user.id;
  }

  const entries = await prisma.entry.findMany({
    where,
    include: { category: true, user: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  // Record the export
  await prisma.export.create({
    data: {
      userId: session.user.id,
      format,
      dateFrom: new Date(from),
      dateTo: new Date(to),
      scope,
    },
  });

  // Trashie worklog columns: Name, Category, Date, Time, Comments, Other
  const rows = entries.map((e) => ({
    Name: e.user.name,
    Category: e.category?.name ?? "",
    Date: e.date,
    Time: Number(e.timeHours),
    Comments: e.description,
    Other: e.notes ?? "",
  }));

  if (format === "csv") {
    const header = "Name,Category,Date,Time,Comments,Other";
    const csvRows = rows.map((r) => {
      const date = r.Date.toISOString().split("T")[0];
      return [
        csvEscape(r.Name),
        csvEscape(r.Category),
        date,
        r.Time,
        csvEscape(r.Comments),
        csvEscape(r.Other),
      ].join(",");
    });
    const csv = [header, ...csvRows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="worklog_${from}_${to}.csv"`,
      },
    });
  }

  // XLSX format
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Worklog");

  sheet.columns = [
    { header: "Name", key: "Name", width: 25 },
    { header: "Category", key: "Category", width: 28 },
    { header: "Date", key: "Date", width: 14 },
    { header: "Time", key: "Time", width: 8 },
    { header: "Comments", key: "Comments", width: 50 },
    { header: "Other", key: "Other", width: 30 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  for (const r of rows) {
    sheet.addRow({
      Name: r.Name,
      Category: r.Category,
      Date: r.Date,
      Time: r.Time,
      Comments: r.Comments,
      Other: r.Other,
    });
  }

  // Format Date column as date and Time column as number
  sheet.getColumn("Date").numFmt = "yyyy-mm-dd";
  sheet.getColumn("Time").numFmt = "0.00";

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="worklog_${from}_${to}.xlsx"`,
    },
  });
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
