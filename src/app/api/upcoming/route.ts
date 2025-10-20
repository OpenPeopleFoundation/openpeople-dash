import Papa from "papaparse";
import { NextResponse } from "next/server";
import { SHEET_EXPORT_URL, type UpcomingTask } from "@/lib/upcoming";

type RawRow = {
  ID: string;
  Workstream: string;
  Task: string;
  MandatoryCategory: string;
  Urgency: string;
  CriticalPath: string;
  Owner: string;
  Dependencies: string;
  DueDate: string;
  Status: string;
  DueInDays: string;
  Pressing: string;
};

const parseBool = (value: string | null | undefined) => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "y" || normalized === "yes";
};

export async function GET() {
  try {
    const response = await fetch(SHEET_EXPORT_URL, {
      // refresh every 10 minutes
      next: { revalidate: 600 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to load task data from Google Sheets." },
        { status: 502 },
      );
    }

    const csv = await response.text();

    const parsed = Papa.parse<RawRow>(csv, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length) {
      return NextResponse.json(
        { error: "Unable to parse task data.", details: parsed.errors },
        { status: 500 },
      );
    }

    const tasks: UpcomingTask[] = (parsed.data ?? [])
      .map((row) => {
        const dueInDays = row.DueInDays?.trim()
          ? Number.parseInt(row.DueInDays, 10)
          : null;

        const dueDate = row.DueDate?.trim()
          ? new Date(row.DueDate).toISOString()
          : null;

        return {
          id: row.ID?.trim() ?? "",
          workstream: row.Workstream?.trim() ?? "General",
          task: row.Task?.trim() ?? "",
          mandatoryCategory: row.MandatoryCategory?.trim() ?? "",
          urgency: row.Urgency?.trim() ?? "",
          criticalPath: parseBool(row.CriticalPath),
          owner: row.Owner?.trim() ?? "",
          dependencies: row.Dependencies?.split("|").map((d) => d.trim()).filter(Boolean) ?? [],
          dueDate,
          dueInDays: Number.isFinite(dueInDays) ? dueInDays : null,
          status: row.Status?.trim() ?? "Not Started",
          pressing: parseBool(row.Pressing),
        };
      })
      .filter((task) => task.id && task.task);

    return NextResponse.json({
      tasks: tasks.sort((a, b) => {
        const aDays = a.dueInDays ?? Number.POSITIVE_INFINITY;
        const bDays = b.dueInDays ?? Number.POSITIVE_INFINITY;
        if (aDays === bDays) {
          return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
        }
        return aDays - bDays;
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected error loading tasks.", details: `${error}` },
      { status: 500 },
    );
  }
}
