const DEFAULT_SHEET_EXPORT_URL =
  "https://docs.google.com/spreadsheets/d/1Fn7dh3kwvgDaMww7WunkxaOcRiW_qpos/export?format=csv";

const configuredUrl = process.env.UPCOMING_SHEET_EXPORT_URL?.trim();

export const SHEET_EXPORT_URL =
  configuredUrl && /^https?:\/\//i.test(configuredUrl) ? configuredUrl : DEFAULT_SHEET_EXPORT_URL;

export type UpcomingTask = {
  id: string;
  workstream: string;
  task: string;
  mandatoryCategory: string;
  urgency: string;
  criticalPath: boolean;
  owner: string;
  dependencies: string[];
  dueDate: string | null;
  dueInDays: number | null;
  status: string;
  pressing: boolean;
};
