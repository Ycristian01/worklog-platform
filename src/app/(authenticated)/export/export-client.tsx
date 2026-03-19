"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, FileText, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useExport } from "@/lib/hooks";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

type ExportScope = "self" | "team";

type ExportFormat = "xlsx" | "csv";

function toDateStr(d: Date) {
  return format(d, "yyyy-MM-dd");
}

const presets = [
  {
    label: "This month",
    range: () => ({ from: toDateStr(startOfMonth(new Date())), to: toDateStr(new Date()) }),
  },
  {
    label: "Last month",
    range: () => ({
      from: toDateStr(startOfMonth(subMonths(new Date(), 1))),
      to: toDateStr(endOfMonth(subMonths(new Date(), 1))),
    }),
  },
  {
    label: "Last 7 days",
    range: () => ({
      from: toDateStr(new Date(Date.now() - 7 * 86400000)),
      to: toDateStr(new Date()),
    }),
  },
  {
    label: "Last 30 days",
    range: () => ({
      from: toDateStr(new Date(Date.now() - 30 * 86400000)),
      to: toDateStr(new Date()),
    }),
  },
];

export function ExportClient() {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "manager";
  const [fromDate, setFromDate] = useState(() => toDateStr(startOfMonth(new Date())));
  const [toDate, setToDate] = useState(() => toDateStr(new Date()));
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
  const [scope, setScope] = useState<ExportScope>("self");
  const [selectedPreset, setSelectedPreset] = useState<string | null>("This month");
  const exportMutation = useExport();

  const handleExport = () => {
    if (!fromDate || !toDate) {
      toast.error("Please select a date range");
      return;
    }
    if (fromDate > toDate) {
      toast.error("Start date must be before end date");
      return;
    }

    exportMutation.mutate(
      {
        format: exportFormat,
        from: fromDate,
        to: toDate,
        scope,
      },
      {
        onSuccess: (data) => {
          toast.success(`Downloaded ${data.filename}`);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Export Worklog</h1>
        <p className="mt-1 text-muted-foreground">
          Download your submitted entries as Excel or CSV
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-display text-lg">Date Range</CardTitle>
          <CardDescription>
            Select the period to export. Only submitted entries are included.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const isSelected = selectedPreset === preset.label;
              return (
                <Button
                  key={preset.label}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const r = preset.range();
                    setFromDate(r.from);
                    setToDate(r.to);
                    setSelectedPreset(preset.label);
                  }}
                  className={cn(
                    "transition-all",
                    isSelected
                      ? "bg-accent text-accent-foreground border-accent shadow-sm hover:bg-accent/90"
                      : "border-border/60 hover:bg-accent/8 hover:text-accent hover:border-accent/30"
                  )}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from-date" className="text-sm font-medium">From</Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setSelectedPreset(null);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-date" className="text-sm font-medium">To</Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                max={toDateStr(new Date())}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setSelectedPreset(null);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isManager && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-lg">Scope</CardTitle>
            <CardDescription>
              Export your entries or the entire team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={scope}
              onValueChange={(v) => setScope(v as ExportScope)}
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    My entries
                  </div>
                </SelectItem>
                <SelectItem value="team">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Entire team
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-display text-lg">Format</CardTitle>
          <CardDescription>
            Excel matches the Trashie worklog format exactly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={exportFormat}
            onValueChange={(v) => setExportFormat(v as ExportFormat)}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xlsx">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel (.xlsx)
                </div>
              </SelectItem>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  CSV (.csv)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Button
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90 border-0 shadow-sm transition-all hover:shadow-md"
        size="lg"
        onClick={handleExport}
        disabled={exportMutation.isPending || !fromDate || !toDate}
      >
        <Download className="mr-2 h-4 w-4" />
        {exportMutation.isPending ? "Generating..." : "Download Export"}
      </Button>
    </div>
  );
}
