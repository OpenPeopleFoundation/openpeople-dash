"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Home,
  Clock,
  DollarSign,
  FileText,
  FolderOpen,
  Users,
  BarChart3,
  Settings,
  ClipboardList,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import Countdown from "@/components/Countdown";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { SectionProgress } from "@/components/dashboard/SectionProgress";
import type { UpcomingTask } from "@/lib/upcoming";

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

type FinanceResponse = {
  metrics: FinanceMetrics;
  transactions: FinanceTransaction[];
  attachments: FinanceAttachment[];
  vendorRules: VendorRule[];
  burnTrend: BurnTrendPoint[];
  recentExpenses: RecentExpense[];
};

type TabId =
  | "build"
  | "upcoming"
  | "countdown"
  | "financial"
  | "transactions"
  | "attachments"
  | "vendors"
  | "staff"
  | "pnl"
  | "settings";

type Tab = {
  id: TabId;
  name: string;
  icon: LucideIcon;
};

const tabs: Tab[] = [
  { id: "build", name: "Build Dashboard", icon: Home },
  { id: "upcoming", name: "Upcoming Tasks", icon: ClipboardCheck },
  { id: "countdown", name: "Countdown & Focus", icon: Clock },
  { id: "financial", name: "Financial Snapshot", icon: DollarSign },
  { id: "transactions", name: "Transactions", icon: FileText },
  { id: "attachments", name: "Receipts / Attachments", icon: FolderOpen },
  { id: "vendors", name: "Vendors & Rules", icon: ClipboardList },
  { id: "staff", name: "Payroll / Staff", icon: Users },
  { id: "pnl", name: "PNL / Budget", icon: BarChart3 },
  { id: "settings", name: "Settings / Config", icon: Settings },
];

const hiddenTabs: TabId[] = ["staff", "pnl", "settings"];
const visibleTabs = tabs.filter((tab) => !hiddenTabs.includes(tab.id));
const visibleTabIds = visibleTabs.map((tab) => tab.id as TabId);

const buildSectionDefinitions: Array<{
  id: string;
  title: string;
  match: (task: UpcomingTask) => boolean;
}> = [
  {
    id: "business",
    title: "Business & Legal",
    match: (task) => task.workstream.toLowerCase().includes("business"),
  },
  {
    id: "food",
    title: "Food Safety & Health",
    match: (task) => task.workstream.toLowerCase().includes("food"),
  },
  {
    id: "liquor",
    title: "Liquor / NLC",
    match: (task) => {
      const workstream = task.workstream.toLowerCase();
      return workstream.includes("liquor") || workstream.includes("nlc");
    },
  },
];

export default function DashPage() {
  const [activeTab, setActiveTab] = useState<TabId>("build");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    buildSectionDefinitions.forEach(({ id }) => {
      initial[id] = true;
    });
    return initial;
  });
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [taskNotes, setTaskNotes] = useState<Record<string, { comment: string; complete: boolean }>>({});
  const [financeData, setFinanceData] = useState<FinanceResponse | null>(null);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [bucketOpen, setBucketOpen] = useState<Record<string, boolean>>({});
  const openingISO = "2026-04-17T17:00:00-02:30";
  const openingAt = useMemo(() => new Date(openingISO), [openingISO]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;

    const loadTasks = async () => {
      try {
        setTasksLoading(true);
        setTasksError(null);
        const response = await fetch("/api/upcoming", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        const json = (await response.json()) as { tasks?: UpcomingTask[] };
        if (!cancelled) {
          setUpcomingTasks(json.tasks ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setTasksError("Unable to load upcoming tasks right now.");
          console.error(error);
        }
      } finally {
        if (!cancelled) {
          setTasksLoading(false);
        }
      }
    };

    loadTasks();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadFinance = async () => {
      try {
        setFinanceLoading(true);
        setFinanceError(null);
        const response = await fetch("/api/finance", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        const json = (await response.json()) as FinanceResponse;
        if (!cancelled) {
          setFinanceData(json);
        }
      } catch (error) {
        if (!cancelled) {
          setFinanceError("Unable to load finance data right now.");
          console.error(error);
        }
      } finally {
        if (!cancelled) {
          setFinanceLoading(false);
        }
      }
    };

    loadFinance();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeLeft = useMemo(() => {
    const ms = Math.max(0, openingAt.getTime() - now.getTime());
    const days = Math.floor(ms / 86_400_000);
    const hours = Math.floor((ms % 86_400_000) / 3_600_000);
    const mins = Math.floor((ms % 3_600_000) / 60_000);
    const secs = Math.floor((ms % 60_000) / 1000);
    return { days, hours, mins, secs };
  }, [openingAt, now]);

  const currencyCompact = useMemo(
    () =>
      new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 0,
      }),
    [],
  );

  const currencyFull = useMemo(
    () =>
      new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [],
  );

  const formatCurrency = useCallback(
    (value: number | null | undefined, options?: { precise?: boolean }) => {
      const target = value ?? 0;
      return (options?.precise ? currencyFull : currencyCompact).format(target);
    },
    [currencyCompact, currencyFull],
  );

  const financeMetrics: FinanceMetrics | null = financeData?.metrics ?? null;
  const burnTrend = financeData?.burnTrend ?? [];
  const recentExpenses = financeData?.recentExpenses ?? [];
  const financeTransactions = financeData?.transactions ?? [];
  const financeAttachments = financeData?.attachments ?? [];
  const vendorRules = financeData?.vendorRules ?? [];

  const capitalRemaining = financeMetrics?.capitalRemaining ?? 0;
  const monthBurn = financeMetrics?.monthBurn ?? 0;
  const last30Burn = financeMetrics?.last30Burn ?? 0;
  const avgDailyBurn = financeMetrics?.avgDailyBurn ?? 0;
  const runwayDays = financeMetrics?.runwayDays ?? 0;
  const openingCapital = financeMetrics?.openingCapital ?? 0;
  const currentSpendToDate = financeMetrics?.currentSpendToDate ?? 0;
  const incomeToDate = financeMetrics?.incomeToDate ?? 0;
  const netCashOut = financeMetrics?.netCashOut ?? 0;

  const spendTrendData = burnTrend.length > 0
    ? burnTrend
    : [
        { date: "-30d", label: "30 Days", amount: Math.abs(last30Burn) },
        { date: "-0d", label: "Today", amount: Math.abs(monthBurn) },
      ];

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-CA", {
        month: "short",
        day: "numeric",
      }),
    [],
  );

  const formatDueLabel = (task: UpcomingTask) => {
    if (task.dueInDays === null) return "Date TBC";
    if (task.dueInDays < 0) return `${Math.abs(task.dueInDays)} days overdue`;
    if (task.dueInDays === 0) return "Due today";
    if (task.dueInDays === 1) return "Due tomorrow";
    return `Due in ${task.dueInDays} days`;
  };

  const isTaskComplete = useCallback(
    (task: UpcomingTask) => {
      const manual = taskNotes[task.id]?.complete;
      if (manual) return true;
      const status = (task.status ?? "").toLowerCase();
      return (
        status.includes("done") ||
        status.includes("complete") ||
        status.includes("issued") ||
        status.includes("approved")
      );
    },
    [taskNotes],
  );

  const topTasks = useMemo(() => {
    if (!upcomingTasks.length) return [];
    const priority = [...upcomingTasks].sort((a, b) => {
      const aDays = a.dueInDays ?? Number.POSITIVE_INFINITY;
      const bDays = b.dueInDays ?? Number.POSITIVE_INFINITY;
      if (aDays === bDays) {
        return Number(b.pressing) - Number(a.pressing);
      }
      return aDays - bDays;
    });
    return priority.slice(0, 4);
  }, [upcomingTasks]);

  const pressingTasks = useMemo(() => {
    return upcomingTasks
      .filter((task) => task.pressing || (task.dueInDays !== null && task.dueInDays <= 7))
      .slice(0, 8);
  }, [upcomingTasks]);

  const buildSections = useMemo(() => {
    const comparator = (a: UpcomingTask, b: UpcomingTask) => {
      const aDays = a.dueInDays ?? Number.POSITIVE_INFINITY;
      const bDays = b.dueInDays ?? Number.POSITIVE_INFINITY;
      if (aDays !== bDays) {
        return aDays - bDays;
      }
      const aDate = a.dueDate ?? "";
      const bDate = b.dueDate ?? "";
      if (aDate !== bDate) {
        return aDate.localeCompare(bDate);
      }
      return a.task.localeCompare(b.task);
    };

    return buildSectionDefinitions.map((definition) => {
      const tasks = upcomingTasks.filter(definition.match).sort(comparator).slice(0, 3);
      const completed = tasks.filter((task) => isTaskComplete(task)).length;
      return {
        ...definition,
        tasks,
        completed,
        total: tasks.length,
      };
    });
  }, [upcomingTasks, isTaskComplete]);

  const totalTasks = upcomingTasks.length;
  const completedTasks = useMemo(
    () => upcomingTasks.filter((task) => isTaskComplete(task)).length,
    [upcomingTasks, isTaskComplete],
  );
  const overallPercent = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const outstandingCritical = useMemo(
    () => upcomingTasks.filter((task) => task.criticalPath && !isTaskComplete(task)).length,
    [upcomingTasks, isTaskComplete],
  );

  const buildAttachmentHref = useCallback((attachment: FinanceAttachment) => {
    if (attachment.link && /^https?:/i.test(attachment.link)) return attachment.link;
    if (attachment.drivePath && /^https?:/i.test(attachment.drivePath)) return attachment.drivePath;
    if (attachment.fileName && /^https?:/i.test(attachment.fileName)) return attachment.fileName;
    return null;
  }, []);

  const focusTasks = useMemo(
    () => [
      "Finish Fire Inspection Documentation",
      "Liquor License Submission Follow-Up",
      "Test POS Integration with Cortex Dashboard",
      "Prep staffing playbook for soft open",
      "Sync FOH training calendar with PM shift leads",
    ],
    [],
  );

  const groupedUpcoming = useMemo(() => {
    if (!upcomingTasks.length) return [];

    const buckets: Record<
      string,
      { title: string; description: string; items: UpcomingTask[] }
    > = {
      overdue: {
        title: "Past Due",
        description: "Tasks that have slipped—triage immediately.",
        items: [],
      },
      week: {
        title: "Next 7 Days",
        description: "Imminent launch blockers and compliance steps.",
        items: [],
      },
      month: {
        title: "Next 30 Days",
        description: "Milestones on deck for this build window.",
        items: [],
      },
      quarter: {
        title: "30–90 Days",
        description: "Mid-term requirements to keep runway clear.",
        items: [],
      },
      later: {
        title: "Beyond 90 Days",
        description: "Long-range prep to monitor.",
        items: [],
      },
      unscheduled: {
        title: "Planned / Date TBC",
        description: "Tasks waiting on timing or dependencies.",
        items: [],
      },
    };

    upcomingTasks.forEach((task) => {
      if (task.dueInDays === null) {
        buckets.unscheduled.items.push(task);
        return;
      }
      if (task.dueInDays < 0) {
        buckets.overdue.items.push(task);
        return;
      }
      if (task.dueInDays <= 7) {
        buckets.week.items.push(task);
        return;
      }
      if (task.dueInDays <= 30) {
        buckets.month.items.push(task);
        return;
      }
      if (task.dueInDays <= 90) {
        buckets.quarter.items.push(task);
        return;
      }
      buckets.later.items.push(task);
    });

    return Object.values(buckets)
      .map((bucket) => ({
        ...bucket,
        items: bucket.items.sort((a, b) => {
          const aDays = a.dueInDays ?? Number.POSITIVE_INFINITY;
          const bDays = b.dueInDays ?? Number.POSITIVE_INFINITY;
          if (aDays !== bDays) {
            return aDays - bDays;
          }
          const aDate = a.dueDate ?? "";
          const bDate = b.dueDate ?? "";
          if (aDate !== bDate) {
            return aDate.localeCompare(bDate);
          }
          return a.task.localeCompare(b.task);
        }),
      }))
      .filter((bucket) => bucket.items.length > 0);
  }, [upcomingTasks]);

  const updateTaskNote = (id: string, patch: Partial<{ comment: string; complete: boolean }>) => {
    setTaskNotes((prev) => {
      const current = prev[id] ?? { comment: "", complete: false };
      return {
        ...prev,
        [id]: { ...current, ...patch },
      };
    });
  };

  return (
    <div className="relative min-h-[calc(100dvh)] bg-[var(--bg)] text-[var(--fg)] overflow-hidden">
      <motion.div
        className="pointer-events-none absolute -top-44 -left-40 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(255,90,31,0.35),transparent 65%)] blur-3xl opacity-60"
        animate={{ scale: [1, 1.08, 1], rotate: [0, 5, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-[-220px] right-[-120px] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(32,102,255,0.22),transparent 60%)] blur-3xl opacity-70"
        animate={{ scale: [1, 1.04, 0.96, 1], rotate: [0, -10, 6, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="group fixed inset-y-8 left-6 z-30 hidden sm:flex">
        <div className="absolute left-[-2px] top-1/2 h-32 w-[10px] -translate-y-1/2 cursor-pointer rounded-r-3xl bg-white/0 transition-colors duration-500 group-hover:bg-white/[0.08]" />
        <aside className="relative flex w-72 flex-col rounded-3xl border border-[var(--ring)] bg-[rgba(3,4,7,0.92)] backdrop-blur-2xl shadow-[0_0_90px_rgba(4,6,12,0.75)] transition-transform duration-500 ease-out -translate-x-[76%] group-hover:translate-x-0">
          <div className="flex items-center gap-3 border-b border-white/5 px-4 py-4 sm:px-5">
            <div className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 shadow-inner shadow-white/5 flex items-center justify-center">
              <Sparkles size={18} style={{ color: BRAND.ACCENT }} />
            </div>
            <div className="leading-tight">
              <div className="text-xs text-[var(--muted)] font-mono tracking-[0.25em] uppercase">open people</div>
              <div className="text-sm font-semibold tracking-wide uppercase text-white/90">Mission Control</div>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto space-y-2 p-4 pr-5">
            {visibleTabs.map(({ id, name, icon: Icon }) => (
              <motion.button
                key={id}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-all duration-300 ${
                  activeTab === id ? "text-white shadow-[0_0_35px_rgba(255,90,31,0.35)]" : "text-[var(--fg)]/80"
                }`}
                style={{
                  background: activeTab === id ? "rgba(255,90,31,0.16)" : "rgba(12,14,20,0.75)",
                  borderColor: activeTab === id ? BRAND.ACCENT : "rgba(255,255,255,0.05)",
                }}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {name}
                </span>
                {activeTab === id && <span className="text-xs font-mono uppercase tracking-[0.3em]">active</span>}
              </motion.button>
            ))}
          </nav>
          <div className="px-4 py-4 sm:px-5 border-t border-white/5 text-xs text-[var(--muted)]">© 2025 Snow White Laundry</div>
        </aside>
      </div>

      <main className="relative z-10 w-full px-4 pb-16 pt-14 sm:px-8 sm:pt-16 lg:px-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:gap-10">
          <header className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-[0.35em] text-[var(--muted)]">Snow White Laundry</p>
            <h1 className="text-2xl font-euro font-semibold text-white sm:text-3xl">Operations OS</h1>
            <p className="max-w-2xl text-sm text-[var(--muted)]">
              Live telemetry across build, launch readiness, and finance—engineered for the Open People mission deck.
            </p>
          </header>
          <div className="sm:hidden">
            <label className="text-xs uppercase tracking-[0.4em] text-[var(--muted)] font-mono">View</label>
            <select
              value={activeTab}
              onChange={(event) => setActiveTab(event.target.value as TabId)}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-[rgba(12,14,20,0.85)] px-4 py-3 text-sm text-[var(--fg)] focus:border-[var(--accent)] focus:outline-none transition"
            >
              {visibleTabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.name}
                </option>
              ))}
            </select>
          </div>

          {activeTab === "build" && (
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="space-y-5 sm:space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-wide uppercase">Build Dashboard</h2>
                    <p className="text-sm text-[var(--muted)]">
                      Track permits, licenses, inspections, and pre-opening milestones.
                    </p>
                  </div>
                  <Button
                    style={{ background: BRAND.ACCENT, borderColor: BRAND.ACCENT, color: "#fff" }}
                    className="font-semibold uppercase tracking-wide"
                  >
                    Export CSV
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-2xl text-center" style={{ borderColor: BRAND.ACCENT }}>
                    <p className="text-2xl font-bold">{overallPercent}%</p>
                    <p className="text-sm text-[var(--muted)]">
                      {completedTasks}/{totalTasks || "—"} Tasks Completed
                    </p>
                  </div>
                  <div className="p-4 border rounded-2xl text-center space-y-2" style={{ borderColor: BRAND.ACCENT }}>
                    <Countdown targetISO={openingISO} />
                    <p className="text-sm text-[var(--muted)] uppercase tracking-wide">Until Opening</p>
                  </div>
                  <div className="p-4 border rounded-2xl text-center" style={{ borderColor: BRAND.ACCENT }}>
                    <p className="text-2xl font-bold">{outstandingCritical}</p>
                    <p className="text-sm text-[var(--muted)]">Critical Path Outstanding</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/40 px-4 py-4 sm:px-5 shadow-inner shadow-black/40">
                  <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-[0.35em] text-[var(--muted)]">Launch Critical</p>
                      <h3 className="text-lg font-euro text-white">Next-Up Tasks</h3>
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      Live sync from <span className="text-white/80">Open People Ops sheet</span>
                    </p>
                  </div>
                  <div className="mt-3 space-y-3">
                    {tasksLoading && (
                      <div className="text-sm text-[var(--muted)]">Syncing latest checklist…</div>
                    )}
                    {!tasksLoading && tasksError && (
                      <div className="text-sm text-amber-300">{tasksError} — showing template tasks for now.</div>
                    )}
                    {!tasksLoading && !tasksError && topTasks.length === 0 && (
                      <div className="text-sm text-[var(--muted)]">No upcoming tasks found.</div>
                    )}
                    {topTasks.map((task) => {
                      const note = taskNotes[task.id];
                      return (
                        <div
                          key={task.id}
                          className="rounded-xl border border-white/5 bg-white/[0.04] px-4 py-3 backdrop-blur"
                        >
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-white">{task.task}</p>
                              <p className="text-xs text-[var(--muted)]">
                                {task.workstream} • {formatDueLabel(task)}{" "}
                                {task.dueDate ? `(${dateFormatter.format(new Date(task.dueDate))})` : ""}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                              <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 uppercase tracking-wide">
                                {task.owner || "Owner TBC"}
                              </span>
                              {task.criticalPath && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(255,90,31,0.15)] px-3 py-1 font-semibold text-[rgba(255,90,31,0.9)]">
                                  <Sparkles className="h-3 w-3" />
                                  Critical Path
                                </span>
                              )}
                              {task.pressing && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(255,255,255,0.1)] px-3 py-1 text-[var(--fg)]/80">
                                  <AlertTriangle className="h-3 w-3 text-amber-300" />
                                  Pressing
                                </span>
                              )}
                              {note?.complete && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(34,197,94,0.18)] px-3 py-1 text-emerald-300">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Marked Done
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  {tasksLoading && (
                    <div className="rounded-2xl border border-white/5 bg-black/40 px-4 py-4 sm:px-5 text-sm text-[var(--muted)]">
                      Loading section tasks…
                    </div>
                  )}
                  {!tasksLoading &&
                    buildSections.map((section) => {
                      const tasks = section.tasks;
                      const isOpen = openSections[section.id] ?? true;
                      const done = section.completed;
                      const total = section.total;

                      return (
                        <div
                          key={section.id}
                          className="rounded-2xl border border-white/5 bg-black/40"
                        >
                          <button
                            className="w-full flex items-center justify-between px-4 py-3"
                            onClick={() =>
                              setOpenSections((state) => ({
                                ...state,
                                [section.id]: !isOpen,
                              }))
                            }
                          >
                            <div className="flex items-center gap-3">
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                              />
                              <span className="font-medium">{section.title}</span>
                            </div>
                            <SectionProgress done={done} total={total} />
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-4 space-y-3">
                              {tasks.length === 0 ? (
                                <div className="rounded-xl border border-white/5 bg-white/[0.04] px-3 py-3 text-sm text-[var(--muted)]">
                                  No urgent tasks surfaced for this workstream yet.
                                </div>
                              ) : (
                                tasks.map((task) => {
                                  const note = taskNotes[task.id] ?? { comment: "", complete: false };
                                  return (
                                    <div
                                      key={task.id}
                                      className="rounded-xl border border-white/5 bg-white/[0.04] px-4 py-3 backdrop-blur"
                                    >
                                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                        <div>
                                          <p className="text-sm font-semibold text-white">{task.task}</p>
                                          <p className="text-xs text-[var(--muted)]">
                                            {formatDueLabel(task)}
                                            {task.dueDate
                                              ? ` • ${dateFormatter.format(new Date(task.dueDate))}`
                                              : ""}
                                          </p>
                                          {task.dependencies.length > 0 && (
                                            <p className="text-xs text-[var(--muted)]/80">
                                              Dependencies: {task.dependencies.join(", ")}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex flex-col items-start gap-2 md:items-end">
                                          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                                            {task.owner || "Owner TBC"}
                                          </span>
                                          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-[var(--muted)]">
                                            Status: {task.status || "Not Started"}
                                          </span>
                                          <label className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                                            <input
                                              type="checkbox"
                                              checked={note.complete}
                                              onChange={(event) =>
                                                updateTaskNote(task.id, { complete: event.target.checked })
                                              }
                                              className="h-4 w-4 rounded border border-white/30 bg-black/60 accent-[var(--accent)]"
                                            />
                                            Mark Complete
                                          </label>
                                        </div>
                                      </div>
                                      <textarea
                                        value={note.comment}
                                        onChange={(event) =>
                                          updateTaskNote(task.id, { comment: event.target.value })
                                        }
                                        placeholder="Add a note or handoff detail…"
                                        className="mt-3 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
                                      />
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "upcoming" && (
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="space-y-5 sm:space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold tracking-wide uppercase">Upcoming Tasks</h2>
                    <p className="text-sm text-[var(--muted)]">
                      Google Sheet feed filtered by urgency and due date. Add notes and mark items as you close them.
                    </p>
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    Data refreshes when you open this view. Source:{" "}
                    <a
                      href="https://docs.google.com/spreadsheets/d/1Fn7dh3kwvgDaMww7WunkxaOcRiW_qpos/edit"
                      target="_blank"
                      rel="noreferrer"
                      className="text-white/80 underline"
                    >
                      Open People Ops
                    </a>
                  </div>
                </div>

                {tasksLoading && (
                  <div className="rounded-2xl border border-white/5 bg-black/40 px-6 py-8 text-center text-sm text-[var(--muted)]">
                    Syncing the latest checklist…
                  </div>
                )}

                {!tasksLoading && tasksError && (
                  <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-6 py-5 text-sm text-amber-200">
                    {tasksError} Try refreshing the page to resync.
                  </div>
                )}

                {!tasksLoading && !tasksError && upcomingTasks.length === 0 && (
                  <div className="rounded-2xl border border-white/5 bg-black/40 px-6 py-8 text-center text-sm text-[var(--muted)]">
                    No upcoming tasks were returned from the sheet.
                  </div>
                )}

                {!tasksLoading && !tasksError && upcomingTasks.length > 0 && (
                  <div className="space-y-5 sm:space-y-6">
                    {pressingTasks.length > 0 && (
                      <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 sm:px-5">
                        <p className="text-xs font-mono uppercase tracking-[0.35em] text-[var(--muted)]">
                          Focus Queue
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {pressingTasks.map((task) => (
                            <span
                              key={`pressing-${task.id}`}
                              className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,90,31,0.4)] bg-[rgba(255,90,31,0.12)] px-3 py-1 text-xs font-semibold text-[rgba(255,90,31,0.95)]"
                            >
                              <Sparkles className="h-3 w-3" />
                              {task.task}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {groupedUpcoming.map((bucket) => {
                      const open = bucketOpen[bucket.title] ?? true;
                      return (
                        <div
                          key={bucket.title}
                          className="space-y-3 rounded-3xl border border-white/5 bg-black/35 px-4 py-4 sm:px-5"
                        >
                          <button
                            onClick={() =>
                              setBucketOpen((prev) => ({
                                ...prev,
                                [bucket.title]: !open,
                              }))
                            }
                            className="flex w-full items-center justify-between rounded-2xl border border-white/5 bg-white/[0.05] px-4 py-3 transition hover:border-[var(--accent)]"
                          >
                            <div className="text-left">
                              <h3 className="font-euro text-sm text-white/80">{bucket.title}</h3>
                              <p className="text-xs text-[var(--muted)]">{bucket.description}</p>
                            </div>
                            <ChevronDown
                              className={`h-4 w-4 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
                            />
                          </button>

                          {open && (
                            <div className="space-y-4">
                              {bucket.items.map((task) => {
                                const note = taskNotes[task.id] ?? { comment: "", complete: false };
                                return (
                                  <div
                                    key={task.id}
                                    className="rounded-2xl border border-white/5 bg-black/50 px-4 py-4 sm:px-5 backdrop-blur"
                                  >
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="text-base font-semibold text-white">{task.task}</h4>
                                          {task.criticalPath && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(255,90,31,0.15)] px-2.5 py-1 text-[10px] font-semibold tracking-widest text-[rgba(255,90,31,0.95)] uppercase">
                                              Critical Path
                                            </span>
                                          )}
                                          {task.pressing && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold tracking-widest text-amber-200 uppercase">
                                              Pressing
                                            </span>
                                          )}
                                        </div>
                                        <p className="mt-1 text-xs text-[var(--muted)]">
                                          {task.workstream} • {task.mandatoryCategory} • {task.urgency}
                                        </p>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                                        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 uppercase tracking-[0.25em]">
                                          {task.owner || "Owner TBC"}
                                        </div>
                                        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                                          {formatDueLabel(task)}
                                          {task.dueDate ? ` • ${dateFormatter.format(new Date(task.dueDate))}` : ""}
                                        </div>
                                      </div>
                                    </div>
                                    {task.dependencies.length > 0 && (
                                      <p className="mt-2 text-xs text-[var(--muted)]">
                                        Dependencies: {task.dependencies.join(", ")}
                                      </p>
                                    )}
                                    <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                                      <textarea
                                        value={note.comment}
                                        onChange={(event) =>
                                          updateTaskNote(task.id, { comment: event.target.value })
                                        }
                                        placeholder="Add a quick comment or update for the crew…"
                                        className="min-h-[88px] w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
                                      />
                                      <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                                        <input
                                          type="checkbox"
                                          checked={note.complete}
                                          onChange={(event) =>
                                            updateTaskNote(task.id, { complete: event.target.checked })
                                          }
                                          className="h-4 w-4 rounded border border-white/30 bg-black/60 accent-[var(--accent)]"
                                        />
                                        Mark Complete
                                      </label>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        {activeTab === "countdown" && (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="space-y-5 sm:space-y-6">
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-[var(--accent)]/40 bg-[linear-gradient(135deg,rgba(255,90,31,0.25),rgba(0,0,0,0.2))] p-5 text-white shadow-[0_15px_60px_rgba(255,90,31,0.16)] sm:p-6">
                  <p className="text-xs uppercase tracking-[0.4em] text-white/70">Launch Window</p>
                  <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-4xl font-semibold sm:text-5xl">{timeLeft.days}d</p>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/70">Days Remaining</p>
                    </div>
                    <div className="text-2xl font-mono sm:text-3xl">
                      {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.mins).padStart(2, "0")}:{String(timeLeft.secs).padStart(2, "0")}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-black/45 p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Today’s Focus</h3>
                    <span className="text-xs text-[var(--muted)] uppercase tracking-[0.3em]">Top Priorities</span>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm">
                    {focusTasks.map((item) => (
                      <li key={item} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "financial" && (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="space-y-5 sm:space-y-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-wide uppercase">Financial Snapshot</h2>
                  <p className="text-sm text-[var(--muted)]">Synchronized from the Open People finance workbook.</p>
                </div>
                <a
                  href="https://docs.google.com/spreadsheets/d/1kxuhSGNjXuYehIA0wQeYlgynwL9Pa2wx8DT5jKIsKHU/edit"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[var(--muted)] underline"
                >
                  View finance source sheet ↗
                </a>
              </div>

              {financeLoading && (
                <div className="rounded-2xl border border-white/5 bg-black/40 px-6 py-8 text-center text-sm text-[var(--muted)]">
                  Pulling latest finance telemetry…
                </div>
              )}

              {!financeLoading && financeError && (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-6 py-5 text-sm text-amber-200">
                  {financeError} Try refreshing the view to resync.
                </div>
              )}

              {!financeLoading && !financeError && (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="border p-4 rounded-2xl text-center" style={{ borderColor: BRAND.ACCENT }}>
                      <p className="text-2xl font-bold">{formatCurrency(capitalRemaining)}</p>
                      <p className="text-sm text-[var(--muted)]">Capital Remaining</p>
                    </div>
                    <div className="border p-4 rounded-2xl text-center" style={{ borderColor: BRAND.ACCENT }}>
                      <p className="text-2xl font-bold">{formatCurrency(Math.abs(last30Burn))}</p>
                      <p className="text-sm text-[var(--muted)]">Spent (Last 30 Days)</p>
                    </div>
                    <div className="border p-4 rounded-2xl text-center" style={{ borderColor: BRAND.ACCENT }}>
                      <p className="text-2xl font-bold">{formatCurrency(Math.abs(avgDailyBurn), { precise: true })}</p>
                      <p className="text-sm text-[var(--muted)]">Avg Daily Burn</p>
                    </div>
                    <div className="border p-4 rounded-2xl text-center" style={{ borderColor: BRAND.ACCENT }}>
                      <p className="text-2xl font-bold">{runwayDays} days</p>
                      <p className="text-sm text-[var(--muted)]">Runway</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-start">
                    <div className="md:col-span-2 rounded-2xl border p-4" style={{ borderColor: BRAND.ACCENT }}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">30-Day Spend Trend</h3>
                        <span className="text-xs text-[var(--muted)]">Live expenses by day</span>
                      </div>
                      <div className="h-48">
                        {spendTrendData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={spendTrendData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                              <defs>
                                <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={BRAND.ACCENT} stopOpacity={0.5} />
                                  <stop offset="95%" stopColor={BRAND.ACCENT} stopOpacity={0.05} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.1)" />
                              <XAxis dataKey="label" stroke="rgba(255,255,255,.6)" />
                              <YAxis stroke="rgba(255,255,255,.6)" />
                              <Tooltip
                                contentStyle={{
                                  background: "#0f1116",
                                  borderColor: BRAND.ACCENT,
                                  borderRadius: 12,
                                  color: "var(--fg)",
                                }}
                                formatter={(value: number) => [formatCurrency(value, { precise: true }), "Spend"]}
                                labelFormatter={(value) => value as string}
                                cursor={{ stroke: "rgba(255,255,255,.3)" }}
                              />
                              <Area type="monotone" dataKey="amount" stroke={BRAND.ACCENT} fill="url(#spendGradient)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
                            Waiting for expense activity in the last 30 days.
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border p-4" style={{ borderColor: BRAND.ACCENT }}>
                      <h3 className="font-semibold mb-2">Recent Expenses</h3>
                      {recentExpenses.length > 0 ? (
                        <ul className="space-y-2 text-sm">
                          {recentExpenses.map((expense, index) => (
                            <li
                              key={`${expense.payee}-${expense.date ?? index}`}
                              className="flex items-center justify-between gap-3 rounded bg-white/5 px-3 py-2"
                            >
                              <span className="text-[var(--muted)] font-mono">{expense.label || "—"}</span>
                              <span className="flex-1 truncate text-left">{expense.payee}</span>
                              <span className="font-semibold">{formatCurrency(expense.total, { precise: true })}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[var(--muted)]">No expenses recorded yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border border-white/5 bg-black/40 p-4 text-sm">
                      <p className="text-[var(--muted)]">Opening Capital</p>
                      <p className="text-lg font-semibold text-white">{formatCurrency(openingCapital)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-black/40 p-4 text-sm">
                      <p className="text-[var(--muted)]">Spend to Date</p>
                      <p className="text-lg font-semibold text-white">{formatCurrency(Math.abs(currentSpendToDate), { precise: true })}</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-black/40 p-4 text-sm">
                      <p className="text-[var(--muted)]">Income to Date</p>
                      <p className="text-lg font-semibold text-white">{formatCurrency(incomeToDate, { precise: true })}</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-black/40 p-4 text-sm">
                      <p className="text-[var(--muted)]">Net Cash Out</p>
                      <p className="text-lg font-semibold text-white">{formatCurrency(netCashOut, { precise: true })}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "transactions" && (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="space-y-5 sm:space-y-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-wide uppercase">Transactions</h2>
                  <p className="text-sm text-[var(--muted)]">Pulled directly from the finance workbook’s transaction ledger.</p>
                </div>
                <span className="text-xs text-[var(--muted)]">{financeTransactions.length} records</span>
              </div>

              {financeLoading && (
                <div className="rounded-2xl border border-white/5 bg-black/40 px-6 py-8 text-center text-sm text-[var(--muted)]">
                  Syncing transactions…
                </div>
              )}

              {!financeLoading && financeError && (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-6 py-5 text-sm text-amber-200">
                  {financeError} Try refreshing the view.
                </div>
              )}

              {!financeLoading && !financeError && (
                <div className="space-y-4">
                  {financeTransactions.length === 0 && (
                    <div className="rounded-2xl border border-white/5 bg-black/40 px-4 py-4 sm:px-5 text-sm text-[var(--muted)]">
                      No transactions have been recorded yet.
                    </div>
                  )}

                  {financeTransactions.map((tx) => {
                    const dateLabel = tx.date ? dateFormatter.format(new Date(tx.date)) : "Date TBC";
                    const total = tx.total ?? tx.amount ?? 0;
                    const isPositive = (total ?? 0) >= 0;
                    return (
                      <div
                        key={`${tx.id}-${tx.date ?? "na"}`}
                        className="rounded-2xl border border-white/5 bg-black/40 px-4 py-4 sm:px-5"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-white">
                              {tx.payee || tx.memo || "Unnamed Transaction"}
                            </p>
                            <p className="text-xs text-[var(--muted)]">
                              {dateLabel} • {tx.category || "Uncategorised"}
                              {tx.subcategory ? ` / ${tx.subcategory}` : ""}
                            </p>
                            {tx.memo && (
                              <p className="text-xs text-[var(--muted)]/80">Memo: {tx.memo}</p>
                            )}
                            <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">
                              {tx.account && <span className="rounded-full border border-white/10 px-3 py-1">{tx.account}</span>}
                              {tx.type && <span className="rounded-full border border-white/10 px-3 py-1">{tx.type}</span>}
                              {tx.status && <span className="rounded-full border border-white/10 px-3 py-1">{tx.status}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-lg font-semibold ${isPositive ? "text-emerald-300" : "text-white"}`}
                            >
                              {formatCurrency(total, { precise: true })}
                            </p>
                            {tx.gstHst !== null && tx.gstHst !== undefined && tx.gstHst !== 0 && (
                              <p className="text-xs text-[var(--muted)]">GST/HST: {formatCurrency(tx.gstHst, { precise: true })}</p>
                            )}
                            {tx.tip !== null && tx.tip !== undefined && tx.tip !== 0 && (
                              <p className="text-xs text-[var(--muted)]">Tip: {formatCurrency(tx.tip, { precise: true })}</p>
                            )}
                          </div>
                        </div>

                        {tx.notes && (
                          <p className="mt-3 text-xs text-[var(--muted)]/80">Notes: {tx.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "attachments" && (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="space-y-5 sm:space-y-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-wide uppercase">Receipts & Attachments</h2>
                  <p className="text-sm text-[var(--muted)]">Drive links harvested from the finance ingest pipeline.</p>
                </div>
                <span className="text-xs text-[var(--muted)]">{financeAttachments.length} files tracked</span>
              </div>

              {financeLoading && (
                <div className="rounded-2xl border border-white/5 bg-black/40 px-6 py-8 text-center text-sm text-[var(--muted)]">
                  Loading attachment log…
                </div>
              )}

              {!financeLoading && financeError && (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-6 py-5 text-sm text-amber-200">
                  {financeError} Try refreshing the view.
                </div>
              )}

              {!financeLoading && !financeError && (
                <div className="space-y-4">
                  {financeAttachments.length === 0 && (
                    <div className="rounded-2xl border border-white/5 bg-black/40 px-4 py-4 sm:px-5 text-sm text-[var(--muted)]">
                      No attachments saved yet.
                    </div>
                  )}

                  {financeAttachments.map((attachment, index) => {
                    const savedLabel = attachment.savedAt
                      ? dateFormatter.format(new Date(attachment.savedAt))
                      : "Time TBC";
                    const href = buildAttachmentHref(attachment);
                    return (
                      <div
                        key={`${attachment.fileName}-${attachment.emailId}-${index}`}
                        className="rounded-2xl border border-white/5 bg-black/40 px-4 py-4 sm:px-5"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">{attachment.fileName || "Unnamed file"}</p>
                            <p className="text-xs text-[var(--muted)]">Saved {savedLabel}</p>
                            {attachment.vendorGuess && (
                              <p className="text-xs text-[var(--muted)]/80">Vendor: {attachment.vendorGuess}</p>
                            )}
                            {attachment.parsedAmount !== null && (
                              <p className="text-xs text-[var(--muted)]/80">
                                Amount: {formatCurrency(Math.abs(attachment.parsedAmount), { precise: true })}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-xs text-[var(--muted)]">
                            {attachment.emailId && <p>Email ID: {attachment.emailId}</p>}
                            {attachment.threadId && <p>Thread ID: {attachment.threadId}</p>}
                          </div>
                        </div>
                        {attachment.notes && (
                          <p className="mt-2 text-xs text-[var(--muted)]/80">Notes: {attachment.notes}</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[var(--fg)] hover:border-[var(--accent)]"
                            >
                              Open in Drive
                            </a>
                          ) : (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[var(--muted)]">
                              {attachment.drivePath || "Drive path unavailable"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "vendors" && (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="space-y-5 sm:space-y-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-wide uppercase">Vendor Rules</h2>
                  <p className="text-sm text-[var(--muted)]">
                    Heuristic tagging rules applied during finance ingestion.
                  </p>
                </div>
                <span className="text-xs text-[var(--muted)]">{vendorRules.length} rules</span>
              </div>

              {financeLoading && (
                <div className="rounded-2xl border border-white/5 bg-black/40 px-6 py-8 text-center text-sm text-[var(--muted)]">
                  Loading vendor rules…
                </div>
              )}

              {!financeLoading && financeError && (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-6 py-5 text-sm text-amber-200">
                  {financeError} Try refreshing the view.
                </div>
              )}

              {!financeLoading && !financeError && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {vendorRules.length === 0 && (
                    <div className="rounded-2xl border border-white/5 bg-black/40 px-4 py-4 sm:px-5 text-sm text-[var(--muted)]">
                      No vendor rules defined.
                    </div>
                  )}

                  {vendorRules.map((rule, index) => (
                    <div
                      key={`${rule.vendorContains}-${index}`}
                      className="rounded-2xl border border-white/5 bg-black/40 px-4 py-4 sm:px-5 text-sm"
                    >
                      <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                        Vendor Match
                      </p>
                      <p className="text-base font-semibold text-white">{rule.vendorContains}</p>
                      <div className="mt-3 space-y-1 text-xs text-[var(--muted)]">
                        <p>
                          Category: <span className="text-white/80">{rule.assignCategory || "—"}</span>
                        </p>
                        <p>
                          Subcategory: <span className="text-white/80">{rule.assignSubcategory || "—"}</span>
                        </p>
                        <p>
                          Tag: <span className="text-white/80">{rule.tag || "—"}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!visibleTabIds.includes(activeTab) && (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-10 text-center text-[var(--muted)] space-y-2">
              <p>
                This is a visual placeholder for the <span className="font-semibold uppercase tracking-wide">{activeTab}</span> tab.
              </p>
              <p>Add charts, tables, or embeds from Google Sheets when you’re ready.</p>
            </CardContent>
          </Card>
        )}
        </div>
      </main>
    </div>
  );
}
