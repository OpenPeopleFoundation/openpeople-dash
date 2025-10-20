import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { FINANCE_SHEET_XLSX_URL } from "@/lib/finance";

type RawRow = Record<string, unknown>;

type FinanceMetrics = {
  openingCapital: number;
  currentSpendToDate: number;
  incomeToDate: number;
  netCashOut: number;
  capitalRemaining: number;
  monthBurn: number;
  last30Burn: number;
  avgDailyBurn: number;
  runwayDays: number;
};

type FinanceAttachment = {
  savedAt: string | null;
  emailId: string;
  threadId: string;
  fileName: string;
  drivePath: string;
  link: string | null;
  vendorGuess: string;
  parsedAmount: number | null;
  notes: string;
};

type FinanceTransaction = {
  id: string;
  date: string | null;
  account: string;
  type: string;
  payee: string;
  memo: string;
  category: string;
  subcategory: string;
  amount: number | null;
  gstHst: number | null;
  tip: number | null;
  total: number | null;
  source: string;
  emailId: string;
  threadId: string;
  attachmentFolder: string;
  attachmentCount: number;
  status: string;
  notes: string;
  month: string;
  attachments: FinanceAttachment[];
};

type VendorRule = {
  vendorContains: string;
  assignCategory: string;
  assignSubcategory: string;
  tag: string;
};

type BurnTrendPoint = {
  date: string;
  label: string;
  amount: number;
};

type RecentExpense = {
  date: string | null;
  label: string;
  payee: string;
  total: number;
  category: string;
};

const numberFormatter = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    if (!cleaned) return null;
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normaliseDate = (value: unknown): string | null => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const date = new Date(Date.UTC(parsed.y, (parsed.m ?? 1) - 1, parsed.d ?? 1));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const fromString = new Date(String(value));
  return Number.isNaN(fromString.getTime()) ? null : fromString.toISOString();
};

const formatLabelDate = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
  }).format(date);
};

const collectMetrics = (rows: unknown[][]): FinanceMetrics => {
  const lookup = new Map<string, number>();
  rows.forEach((row) => {
    const labelCell = row[0];
    if (!labelCell) return;
    const label = String(labelCell).trim();
    const value = numberFormatter(row[1]);
    if (label && value !== null) {
      lookup.set(label.toLowerCase(), value);
    }
  });

  const get = (key: string, fallback = 0) => lookup.get(key.toLowerCase()) ?? fallback;

  return {
    openingCapital: get("opening capital"),
    currentSpendToDate: get("current spend to date (all)"),
    incomeToDate: get("income to date (all)"),
    netCashOut: get("net cash out"),
    capitalRemaining: get("current capital remaining"),
    monthBurn: get("this month burn (expenses)"),
    last30Burn: get("last 30 days burn"),
    avgDailyBurn: get("avg daily burn (30d)"),
    runwayDays: get("runway (days)"),
  };
};

const buildTransactions = (
  rows: RawRow[],
  attachments: FinanceAttachment[],
): FinanceTransaction[] => {
  const attachmentsByEmail = new Map<string, FinanceAttachment[]>();
  const attachmentsByThread = new Map<string, FinanceAttachment[]>();

  attachments.forEach((attachment) => {
    if (attachment.emailId) {
      const key = attachment.emailId;
      const list = attachmentsByEmail.get(key) ?? [];
      if (!list.includes(attachment)) {
        list.push(attachment);
      }
      attachmentsByEmail.set(key, list);
    }
    if (attachment.threadId) {
      const key = attachment.threadId;
      const list = attachmentsByThread.get(key) ?? [];
      if (!list.includes(attachment)) {
        list.push(attachment);
      }
      attachmentsByThread.set(key, list);
    }
  });

  return rows
    .filter((row) => row.Date)
    .map((row, index) => {
      const date = normaliseDate(row.Date);
      const amount = numberFormatter(row.Amount);
      const total = numberFormatter(row.Total ?? row.Amount);
      const gstHst = numberFormatter(row["GST/HST"]);
      const tip = numberFormatter(row.Tip);
      const attachmentFolder = String(row.AttachmentFolder ?? "").trim();
      const attachmentCountRaw = numberFormatter(row.AttachmentCount);
      const emailId = String(row.EmailId ?? "").trim();
      const threadId = String(row.ThreadId ?? "").trim();

      const derivedAttachments = new Map<string, FinanceAttachment>();
      if (emailId) {
        (attachmentsByEmail.get(emailId) ?? []).forEach((attachment) => {
          const key = `${attachment.link ?? attachment.drivePath}-${attachment.fileName}`;
          derivedAttachments.set(key, attachment);
        });
      }
      if (threadId) {
        (attachmentsByThread.get(threadId) ?? []).forEach((attachment) => {
          const key = `${attachment.link ?? attachment.drivePath}-${attachment.fileName}`;
          derivedAttachments.set(key, attachment);
        });
      }

      if (attachmentFolder) {
        const isUrl = /^https?:\/\//i.test(attachmentFolder);
        derivedAttachments.set(`${attachmentFolder}-folder`, {
          savedAt: null,
          emailId,
          threadId,
          fileName: attachmentFolder,
          drivePath: attachmentFolder,
          link: isUrl ? attachmentFolder : null,
          vendorGuess: "",
          parsedAmount: null,
          notes: "",
        });
      }

      const attachmentsList = Array.from(derivedAttachments.values());

      return {
        id: String(row.EmailId ?? row.ThreadId ?? `tx-${index}`),
        date,
        account: String(row.Account ?? "").trim(),
        type: String(row.Type ?? "").trim(),
        payee: String(row.Payee ?? "").trim(),
        memo: String(row.Memo ?? "").trim(),
        category: String(row.Category ?? "").trim(),
        subcategory: String(row.Subcategory ?? "").trim(),
        amount,
        gstHst,
        tip,
        total,
        source: String(row.Source ?? "").trim(),
        emailId,
        threadId,
        attachmentFolder,
        attachmentCount: attachmentCountRaw !== null ? attachmentCountRaw : 0,
        status: String(row.Status ?? "").trim(),
        notes: String(row.Notes ?? "").trim(),
        month: String(row.Month ?? "").trim(),
        attachments: attachmentsList,
      };
    })
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
};

const buildAttachments = (sheet?: XLSX.WorkSheet): FinanceAttachment[] => {
  if (!sheet) return [];

  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  }) as string[][];

  if (!rows.length) return [];
  const header = rows[0].map((value) => String(value).trim().toLowerCase());
  const indexOf = (name: string) => header.findIndex((value) => value === name.toLowerCase());

  const idxSavedAt = indexOf("savedat");
  const idxEmail = indexOf("emailid");
  const idxThread = indexOf("threadid");
  const idxFile = indexOf("filename");
  const idxDrive = indexOf("drivepath");
  const idxByte = indexOf("bytesize");
  const idxVendor = indexOf("vendorguess");
  const idxParsed = indexOf("parsedamount");
  const idxNotes = indexOf("notes");

  const results: FinanceAttachment[] = [];

  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    if (!row) continue;
    const fileName = idxFile >= 0 ? String(row[idxFile] ?? "").trim() : "";
    const drivePath = idxDrive >= 0 ? String(row[idxDrive] ?? "").trim() : "";
    if (!fileName && !drivePath) continue;

    let link: string | null = null;
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      const candidate = cell?.l?.Target || (typeof cell?.v === "string" ? cell.v : undefined);
      if (candidate && /^https?:/i.test(candidate)) {
        link = candidate;
        break;
      }
    }
    if (!link && drivePath && /^https?:/i.test(drivePath)) {
      link = drivePath;
    }

    results.push({
      savedAt: idxSavedAt >= 0 ? normaliseDate(row[idxSavedAt]) : null,
      emailId: idxEmail >= 0 ? String(row[idxEmail] ?? "").trim() : "",
      threadId: idxThread >= 0 ? String(row[idxThread] ?? "").trim() : "",
      fileName,
      drivePath,
      link,
      vendorGuess: idxVendor >= 0 ? String(row[idxVendor] ?? "").trim() : "",
      parsedAmount: idxParsed >= 0 ? numberFormatter(row[idxParsed]) : null,
      notes: idxNotes >= 0 ? String(row[idxNotes] ?? "").trim() : "",
    });
  }

  return results.sort((a, b) => {
    if (!a.savedAt && !b.savedAt) return 0;
    if (!a.savedAt) return 1;
    if (!b.savedAt) return -1;
    return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
  });
};

const buildVendorRules = (rows: RawRow[]): VendorRule[] =>
  rows
    .filter((row) => row.Vendor_Contains)
    .map((row) => ({
      vendorContains: String(row.Vendor_Contains ?? "").trim(),
      assignCategory: String(row.Assign_Category ?? "").trim(),
      assignSubcategory: String(row.Assign_Subcategory ?? "").trim(),
      tag: String(row.Tag ?? "").trim(),
    }));

const buildBurnTrend = (transactions: FinanceTransaction[]): BurnTrendPoint[] => {
  const expenses = transactions.filter((tx) => {
    const total = tx.total ?? tx.amount ?? 0;
    if (total === null) return false;
    if (tx.type && tx.type.toLowerCase().includes("income")) return false;
    return total < 0 || !tx.type || tx.type.toLowerCase().includes("expense");
  });

  const start = new Date();
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const map = new Map<string, number>();

  expenses.forEach((tx) => {
    if (!tx.date) return;
    const date = new Date(tx.date);
    if (Number.isNaN(date.getTime())) return;
    if (date < start || date > end) return;
    const key = date.toISOString().slice(0, 10);
    const value = Math.abs(tx.total ?? tx.amount ?? 0);
    map.set(key, (map.get(key) ?? 0) + value);
  });

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({
      date,
      label: formatLabelDate(`${date}T00:00:00.000Z`),
      amount: Number(amount.toFixed(2)),
    }));
};

const buildRecentExpenses = (transactions: FinanceTransaction[]): RecentExpense[] =>
  transactions
    .filter((tx) => {
      const total = tx.total ?? tx.amount ?? 0;
      if (total === null) return false;
      if (tx.type && tx.type.toLowerCase().includes("income")) return false;
      return total < 0 || !tx.type || tx.type.toLowerCase().includes("expense");
    })
    .slice(0, 5)
    .map((tx) => ({
      date: tx.date,
      label: formatLabelDate(tx.date),
      payee: tx.payee || tx.memo || tx.category || "Unknown",
      total: Math.abs(tx.total ?? tx.amount ?? 0),
      category: tx.category || tx.subcategory || "",
    }));

export async function GET() {
  try {
    const response = await fetch(FINANCE_SHEET_XLSX_URL, {
      next: { revalidate: 600 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to load finance data from Google Sheets." },
        { status: 502 },
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });

    const toJson = (sheetName: string, options?: XLSX.Sheet2JSONOpts) => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return [];
      return XLSX.utils.sheet_to_json<RawRow>(sheet, {
        defval: "",
        raw: false,
        ...options,
      });
    };

    const metrics = collectMetrics(
      XLSX.utils.sheet_to_json(workbook.Sheets["Burn_Dashboard"], {
        header: 1,
        defval: "",
        raw: false,
      }) as unknown as unknown[][],
    );

    const attachmentsSheet = workbook.Sheets["Attachments_Log"];
    const attachments = buildAttachments(attachmentsSheet);
    const transactions = buildTransactions(toJson("Transactions"), attachments);
    const vendorRules = buildVendorRules(toJson("Rules_Vendors"));
    const burnTrend = buildBurnTrend(transactions);
    const recentExpenses = buildRecentExpenses(transactions);

    return NextResponse.json({
      metrics,
      transactions,
      attachments,
      vendorRules,
      burnTrend,
      recentExpenses,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected error loading finance data.", details: `${error}` },
      { status: 500 },
    );
  }
}
