"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, Ticket, CalendarCheck, Users,
  TrendingUp, ArrowUpRight, Eye, QrCode, Plus,
  Tag, Download, Trash2, ToggleLeft, ToggleRight, Loader2, X,
  Link2, Share2, BarChart2, ClipboardList,
  CheckCircle, Clock, Globe,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import {
  orderApi, promoCodeApi, eventApi, orderActionsApi, authApi,
  OrganizerStats, ApiPromoCode, ApiEvent, extractError,
} from "@/lib/api";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import { StaggeredList, staggerCardChild, staggerChild, FadeIn } from "@/components/animations";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function greeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${time}, ${name.split(" ")[0]}`;
}

// ─── Revenue Chart ────────────────────────────────────────────────────────────

type Period = "daily" | "weekly" | "monthly";

function RevenueChart({ data, period, onPeriodChange }: {
  data: OrganizerStats["monthlyRevenue"];
  period: Period;
  onPeriodChange: (p: Period) => void;
}) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Simulate daily/weekly slices from monthly data for UI demo
  const displayData = (() => {
    if (period === "monthly") return data.slice(-6);
    if (period === "weekly")  return data.slice(-12).map((d, i) => ({ ...d, month: `W${i + 1}`, revenue: Math.round(d.revenue / 4), orders: Math.round(d.orders / 4) }));
    // daily: last 7
    return Array.from({ length: 7 }, (_, i) => {
      const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
      const src  = data[data.length - 1];
      return { month: days[i], revenue: src ? Math.round((src.revenue / 30) * (0.5 + Math.random())) : 0, orders: src ? Math.round(src.orders / 30) : 0 };
    });
  })();

  if (!displayData.length) {
    return (
      <div className="flex flex-col items-center justify-center h-36 text-center">
        <TrendingUp className="w-8 h-8 text-white/10 mb-2" />
        <p className="text-white/25 text-sm">No revenue data yet</p>
        <p className="text-white/15 text-xs mt-0.5">Create and publish an event to start</p>
      </div>
    );
  }

  const max = Math.max(...displayData.map((d) => d.revenue), 1);

  return (
    <div>
      {/* Period toggle */}
      <div className="flex items-center gap-1 mb-4">
        {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => onPeriodChange(p)}
            style={{ transform: "none" }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all capitalize ${
              period === p
                ? "bg-[#ff5a5f]/15 text-[#ff5a5f] border border-[#ff5a5f]/30"
                : "text-white/35 hover:text-white/60 border border-transparent"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="relative">
        <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
          {[100, 50, 0].map((pct) => (
            <div key={pct} className="flex items-center gap-2">
              <span className="text-white/20 text-[9px] w-6 text-right flex-shrink-0">
                ${Math.round((max * pct) / 100) === 0 ? "0" : `${Math.round((max * pct) / 100)}`}
              </span>
              <div className="flex-1 border-t border-white/5" />
            </div>
          ))}
        </div>

        <div className="flex items-end gap-1.5 h-36 pl-9 pb-6">
          {displayData.map((d, i) => {
            const pct     = (d.revenue / max) * 100;
            const label   = period === "monthly"
              ? months[parseInt(d.month.split("-")[1] ?? "1") - 1] ?? d.month
              : d.month;
            const isEmpty = d.revenue === 0;

            return (
              <div key={d.month + i} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="relative w-full flex-1 flex items-end">
                  <div className="absolute inset-x-0 bottom-0 h-full rounded-t-lg bg-white/3" />
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: isEmpty ? "3px" : `${pct}%`, opacity: 1 }}
                    transition={{ duration: 0.65, delay: 0.3 + i * 0.06, ease: [0.34, 1.1, 0.64, 1] }}
                    className="relative w-full rounded-t-lg overflow-hidden"
                    style={{ background: isEmpty ? "rgba(255,255,255,0.06)" : "linear-gradient(to top, rgba(255,90,95,0.25), rgba(255,90,95,0.7))" }}
                  >
                    {!isEmpty && <div className="absolute inset-x-0 top-0 h-0.5 bg-[#ff5a5f] rounded-full opacity-80" />}
                  </motion.div>

                  {!isEmpty && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-20 -translate-y-1 group-hover:translate-y-0">
                      <div className="bg-[#0a1628] border border-white/10 rounded-xl px-3 py-2 text-xs text-white whitespace-nowrap shadow-xl">
                        <p className="font-bold text-[#ff5a5f]">${d.revenue.toLocaleString()}</p>
                        <p className="text-white/50">{d.orders} order{d.orders !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-[#0a1628] border-b border-r border-white/10 rotate-45" />
                    </div>
                  )}
                </div>
                <span className="text-white/30 text-[10px] group-hover:text-white/60 transition-colors">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  accent: string;
  trend?: string;
}

function MetricCard({ label, value, icon: Icon, color, bg, accent, trend }: MetricCardProps) {
  return (
    <motion.div
      variants={staggerCardChild}
      whileHover={{ y: -3, boxShadow: `0 16px 48px rgba(0,0,0,0.4)` }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="rounded-2xl bg-[#112240] border border-white/8 p-6 relative overflow-hidden group cursor-default"
    >
      {/* Accent line at top */}
      <div
        className="absolute top-0 inset-x-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: accent }}
      />

      {/* Soft radial glow behind icon */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: accent.replace("1)", "0.15)") }}
      />

      <div className="relative">
        <div className="flex items-start justify-between mb-5">
          <motion.div
            whileHover={{ scale: 1.1, rotate: -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shadow-lg`}
          >
            <Icon className={`w-5 h-5 ${color}`} />
          </motion.div>
          {trend && (
            <span className="flex items-center gap-0.5 text-[#ff5a5f] text-xs font-semibold">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </span>
          )}
        </div>

        <p className="text-3xl font-extrabold text-white mb-1 tracking-tight">{value}</p>
        <p className="text-white/40 text-sm">{label}</p>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, accessToken, isAuthenticated, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Promo codes
  const [promoCodes, setPromoCodes] = useState<ApiPromoCode[]>([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoForm, setPromoForm] = useState({ code: "", discountType: "percent" as "percent" | "fixed", discountValue: "", usageLimit: "", expiresAt: "" });
  const [promoFormError, setPromoFormError] = useState("");
  const [promoSaving, setPromoSaving] = useState(false);

  // My events (for CSV export)
  const [myEvents, setMyEvents] = useState<ApiEvent[]>([]);
  const [exportingEvent, setExportingEvent] = useState<string | null>(null);

  // Period toggle for revenue chart
  const [chartPeriod, setChartPeriod] = useState<Period>("monthly");

  // Orders tab: "recent" | "manage"
  const [ordersTab, setOrdersTab] = useState<"recent" | "manage">("recent");

  // Resend email verification
  const [resending, setResending] = useState(false);
  async function handleResendVerification() {
    if (!accessToken) return;
    setResending(true);
    const res = await authApi.resendVerification(accessToken);
    setResending(false);
    if (!res.success) {
      toast.error(extractError(res));
    } else {
      toast.success("Verification link sent! Check your inbox.");
    }
  }

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login?redirect=/dashboard");
    if (!authLoading && isAuthenticated && user?.role === "attendee") router.replace("/tickets");
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!accessToken || !user || user.role === "attendee") return;
    orderApi.organizerStats(accessToken).then((res) => {
      if (res.success && res.data) setStats(res.data);
      setLoading(false);
    });
  }, [accessToken, user]);

  const fetchPromoCodes = useCallback(async () => {
    if (!accessToken) return;
    setPromoLoading(true);
    const res = await promoCodeApi.list(accessToken);
    setPromoLoading(false);
    if (res.success && res.data) setPromoCodes(res.data.promoCodes);
  }, [accessToken]);

  const fetchMyEvents = useCallback(async () => {
    if (!accessToken) return;
    const res = await eventApi.myEvents({}, accessToken);
    if (res.success && res.data) setMyEvents(res.data.events);
  }, [accessToken]);

  useEffect(() => {
    if (accessToken && user && user.role !== "attendee") {
      fetchPromoCodes();
      fetchMyEvents();
    }
  }, [accessToken, user, fetchPromoCodes, fetchMyEvents]);

  async function handleCreatePromo(e: React.FormEvent) {
    e.preventDefault();
    if (!promoForm.code.trim() || !promoForm.discountValue) {
      setPromoFormError("Code and discount value are required.");
      return;
    }
    if (!accessToken) return;
    setPromoSaving(true);
    setPromoFormError("");
    const res = await promoCodeApi.create({
      code: promoForm.code.trim(),
      discountType: promoForm.discountType,
      discountValue: parseFloat(promoForm.discountValue),
      usageLimit: promoForm.usageLimit ? parseInt(promoForm.usageLimit) : undefined,
      expiresAt: promoForm.expiresAt || undefined,
    }, accessToken);
    setPromoSaving(false);
    if (res.success) {
      setShowPromoForm(false);
      setPromoForm({ code: "", discountType: "percent", discountValue: "", usageLimit: "", expiresAt: "" });
      fetchPromoCodes();
    } else {
      setPromoFormError(extractError(res));
    }
  }

  async function handleTogglePromo(promo: ApiPromoCode) {
    if (!accessToken) return;
    await promoCodeApi.update(promo._id, { isActive: !promo.isActive }, accessToken);
    fetchPromoCodes();
  }

  async function handleDeletePromo(id: string) {
    if (!accessToken) return;
    await promoCodeApi.delete(id, accessToken);
    fetchPromoCodes();
  }

  async function handleExportCSV(eventId: string) {
    if (!accessToken) return;
    setExportingEvent(eventId);
    // Open download URL with token in Authorization header via fetch + blob
    try {
      const url = orderActionsApi.exportAttendeesUrl(eventId);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `attendees-${eventId}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // silent fail — user sees nothing happens if export fails
    }
    setExportingEvent(null);
  }

  if (authLoading || loading) return <DashboardSkeleton />;

  const metrics: MetricCardProps[] = [
    {
      label: "Total Revenue",
      value: `$${(stats?.totalRevenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-[#ff5a5f]",
      bg: "bg-[#ff5a5f]/12",
      accent: "linear-gradient(90deg, rgba(255,90,95,1), rgba(255,90,95,0))",
    },
    {
      label: "Tickets Sold",
      value: (stats?.totalTickets ?? 0).toLocaleString(),
      icon: Ticket,
      color: "text-blue-400",
      bg: "bg-blue-500/12",
      accent: "linear-gradient(90deg, rgba(96,165,250,1), rgba(96,165,250,0))",
    },
    {
      label: "Total Orders",
      value: (stats?.totalOrders ?? 0).toLocaleString(),
      icon: Users,
      color: "text-violet-400",
      bg: "bg-violet-500/12",
      accent: "linear-gradient(90deg, rgba(167,139,250,1), rgba(167,139,250,0))",
    },
    {
      label: "Active Events",
      value: (stats?.activeEvents ?? 0).toLocaleString(),
      icon: CalendarCheck,
      color: "text-amber-400",
      bg: "bg-amber-500/12",
      accent: "linear-gradient(90deg, rgba(251,191,36,1), rgba(251,191,36,0))",
    },
  ];

  const quickActions = [
    { href: "/create-event", label: "Create New Event",  icon: CalendarCheck, color: "text-[#ff5a5f]", bg: "bg-[#ff5a5f]/10" },
    { href: "/scan",         label: "Scan Tickets",       icon: QrCode,        color: "text-blue-400",  bg: "bg-blue-500/10"  },
    { href: "/explore",      label: "Browse Events",      icon: Eye,           color: "text-violet-400",bg: "bg-violet-500/10"},
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* ── Email Verification Banner ────────────────────────────────────── */}
      {user && !user.isVerified && (
        <FadeIn className="mb-6">
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0 text-amber-400 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-white font-semibold text-sm">Please verify your email address</h3>
                <p className="text-white/40 text-xs mt-0.5">
                  Verify your account to access all features. We sent a verification link to{" "}
                  <strong className="text-white/60">{user.email}</strong>.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/25 transition-all disabled:opacity-50"
              >
                {resending ? "Sending link…" : "Resend Link"}
              </button>
            </div>
          </div>
        </FadeIn>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <FadeIn className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Dashboard</h1>
          <p className="text-white/40 text-sm mt-1">{greeting(user?.name ?? "there")}</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/scan"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/8 border border-white/10 text-white text-sm font-medium hover:bg-white/12 transition-all"
            >
              <QrCode className="w-4 h-4" />
              Scan Tickets
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/create-event"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff5a5f] text-white text-sm font-bold hover:bg-[#ff3d42] shadow-[0_0_20px_rgba(255,90,95,0.3)] hover:shadow-[0_0_30px_rgba(255,90,95,0.45)] transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </Link>
          </motion.div>
        </div>
      </FadeIn>

      {/* ── Metric cards (staggered) ──────────────────────────────────────── */}
      <StaggeredList
        stagger={0.09}
        delayChildren={0.05}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8"
      >
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </StaggeredList>

      {/* ── Chart + Quick actions ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Revenue chart */}
        <FadeIn
          delay={0.28}
          className="lg:col-span-2 rounded-2xl bg-[#112240] border border-white/8 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#ff5a5f]" />
              <h2 className="text-white font-bold text-sm">Sales Report</h2>
            </div>
            <div className="text-right">
              <p className="text-[#ff5a5f] text-sm font-bold">
                ${(stats?.totalRevenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-white/25 text-[10px]">total revenue</p>
            </div>
          </div>
          <div className="px-6 pt-4 pb-6">
            <RevenueChart
              data={stats?.monthlyRevenue ?? []}
              period={chartPeriod}
              onPeriodChange={setChartPeriod}
            />
          </div>
        </FadeIn>

        {/* Quick actions */}
        <FadeIn delay={0.34} className="rounded-2xl bg-[#112240] border border-white/8 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8">
            <h2 className="text-white font-bold text-sm">Quick Actions</h2>
          </div>
          <div className="p-4 space-y-1.5">
            {quickActions.map(({ href, label, icon: Icon, color, bg }) => (
              <motion.div key={href} whileHover={{ x: 3 }} transition={{ type: "spring", stiffness: 400 }}>
                <Link
                  href={href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <span className="text-white/60 text-sm group-hover:text-white transition-colors flex-1">
                    {label}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40 transition-colors" />
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Mini stat strip */}
          <div className="mx-4 mb-4 mt-2 rounded-xl bg-[#0a1628] border border-white/6 p-4">
            <p className="text-white/30 text-[10px] uppercase tracking-wider mb-3">Overview</p>
            <div className="space-y-2">
              {[
                { label: "Avg. order value", value: stats?.totalOrders
                    ? `$${((stats.totalRevenue) / stats.totalOrders).toFixed(2)}`
                    : "—" },
                { label: "Active events", value: `${stats?.activeEvents ?? 0}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-white/40 text-xs">{label}</span>
                  <span className="text-white text-xs font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>

      {/* ── Promo Codes ───────────────────────────────────────────────────── */}
      <FadeIn delay={0.35} className="rounded-2xl bg-[#112240] border border-white/8 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
          <h2 className="text-white font-bold text-sm flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#ff5a5f]" />
            Promo Codes
          </h2>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowPromoForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff5a5f]/10 border border-[#ff5a5f]/20 text-[#ff5a5f] text-xs font-semibold hover:bg-[#ff5a5f]/20 transition-all"
          >
            {showPromoForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showPromoForm ? "Cancel" : "New Code"}
          </motion.button>
        </div>

        {/* Create form */}
        <AnimatePresence>
          {showPromoForm && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleCreatePromo}
              className="overflow-hidden"
            >
              <div className="p-6 border-b border-white/8 grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-white/50 text-xs mb-1 block">Code *</label>
                  <input
                    value={promoForm.code}
                    onChange={(e) => setPromoForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="SUMMER25"
                    className="w-full px-3 py-2 rounded-xl bg-[#060f17] border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-[#ff5a5f]/50"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Type</label>
                  <select
                    value={promoForm.discountType}
                    onChange={(e) => setPromoForm((f) => ({ ...f, discountType: e.target.value as "percent" | "fixed" }))}
                    className="w-full px-3 py-2 rounded-xl bg-[#060f17] border border-white/10 text-white text-sm focus:outline-none focus:border-[#ff5a5f]/50"
                  >
                    <option value="percent">% Off</option>
                    <option value="fixed">$ Fixed</option>
                  </select>
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1 block">
                    Value {promoForm.discountType === "percent" ? "(%)" : "($)"} *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={promoForm.discountType === "percent" ? 100 : undefined}
                    step="0.01"
                    value={promoForm.discountValue}
                    onChange={(e) => setPromoForm((f) => ({ ...f, discountValue: e.target.value }))}
                    placeholder={promoForm.discountType === "percent" ? "25" : "10"}
                    className="w-full px-3 py-2 rounded-xl bg-[#060f17] border border-white/10 text-white text-sm focus:outline-none focus:border-[#ff5a5f]/50"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={promoForm.usageLimit}
                    onChange={(e) => setPromoForm((f) => ({ ...f, usageLimit: e.target.value }))}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 rounded-xl bg-[#060f17] border border-white/10 text-white text-sm focus:outline-none focus:border-[#ff5a5f]/50"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Expires At</label>
                  <input
                    type="date"
                    value={promoForm.expiresAt}
                    onChange={(e) => setPromoForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-[#060f17] border border-white/10 text-white text-sm focus:outline-none focus:border-[#ff5a5f]/50"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={promoSaving}
                    className="w-full py-2 rounded-xl bg-[#ff5a5f] text-white font-bold text-sm hover:bg-[#ff3d42] disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                  >
                    {promoSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Create
                  </button>
                </div>
              </div>
              {promoFormError && (
                <p className="px-6 py-2 text-red-400 text-xs bg-red-500/5">{promoFormError}</p>
              )}
            </motion.form>
          )}
        </AnimatePresence>

        {/* Promo code list */}
        {promoLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
          </div>
        ) : promoCodes.length === 0 ? (
          <div className="px-6 py-8 text-center text-white/30 text-sm">
            No promo codes yet. Create one to offer discounts.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {promoCodes.map((promo) => (
              <div key={promo._id} className="px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono font-bold text-white text-sm">{promo.code}</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#ff5a5f]/10 text-[#ff5a5f] text-xs border border-[#ff5a5f]/20">
                    {promo.discountType === "percent" ? `${promo.discountValue}%` : `$${promo.discountValue}`} off
                  </span>
                  <span className="text-white/30 text-xs">
                    {promo.usedCount}/{promo.usageLimit ?? "∞"} used
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleTogglePromo(promo)}
                    className={`transition-colors ${promo.isActive ? "text-[#ff5a5f]" : "text-white/30"} hover:opacity-70`}
                    title={promo.isActive ? "Deactivate" : "Activate"}
                  >
                    {promo.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleDeletePromo(promo._id)}
                    className="text-white/20 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </FadeIn>

      {/* ── My Events + CSV Export ────────────────────────────────────────── */}
      {myEvents.length > 0 && (
        <FadeIn delay={0.36} className="rounded-2xl bg-[#112240] border border-white/8 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-white/8">
            <h2 className="text-white font-bold text-sm flex items-center gap-2">
              <Download className="w-4 h-4 text-[#ff5a5f]" />
              Export Attendees
            </h2>
            <p className="text-white/30 text-xs mt-0.5">Download CSV for any of your events</p>
          </div>
          <div className="divide-y divide-white/5">
            {myEvents.slice(0, 5).map((ev) => (
              <div key={ev._id} className="px-6 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{ev.title}</p>
                  <p className="text-white/30 text-xs capitalize">{ev.status} · {ev.totalSold ?? 0} sold</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleExportCSV(ev._id)}
                  disabled={exportingEvent === ev._id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/6 border border-white/10 text-white/60 hover:text-white text-xs font-medium transition-all disabled:opacity-40 flex-shrink-0"
                >
                  {exportingEvent === ev._id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Download className="w-3 h-3" />}
                  CSV
                </motion.button>
              </div>
            ))}
          </div>
        </FadeIn>
      )}

      {/* ── Social Sharing Tools ──────────────────────────────────────────── */}
      {myEvents.length > 0 && (
        <FadeIn delay={0.37} className="rounded-2xl bg-[#112240] border border-white/8 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-white/8">
            <h2 className="text-white font-bold text-sm flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#ff5a5f]" />
              Social Sharing
            </h2>
            <p className="text-white/30 text-xs mt-0.5">Quick share links for your published events</p>
          </div>
          <div className="divide-y divide-white/5">
            {myEvents.filter((e) => e.status === "published").slice(0, 3).map((ev) => {
              const url  = typeof window !== "undefined" ? `${window.location.origin}/event/${ev._id}` : `/event/${ev._id}`;
              const text = encodeURIComponent(`Check out "${ev.title}" on EventNest!`);
              const enc  = encodeURIComponent(url);
              return (
                <div key={ev._id} className="px-6 py-3">
                  <p className="text-white text-sm font-medium truncate mb-2">{ev.title}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${enc}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1877f2]/10 border border-[#1877f2]/20 text-[#1877f2] text-xs font-medium hover:bg-[#1877f2]/20 transition-all">
                      <Globe className="w-3.5 h-3.5" /> Facebook
                    </a>
                    <a href={`https://twitter.com/intent/tweet?text=${text}&url=${enc}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs font-medium hover:bg-white/10 transition-all">
                      <Share2 className="w-3.5 h-3.5" /> Twitter / X
                    </a>
                    <button onClick={() => navigator.clipboard.writeText(url)} style={{ transform: "none" }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs font-medium hover:text-white hover:bg-white/10 transition-all">
                      <Link2 className="w-3.5 h-3.5" /> Copy Link
                    </button>
                  </div>
                </div>
              );
            })}
            {myEvents.filter((e) => e.status === "published").length === 0 && (
              <p className="px-6 py-6 text-white/30 text-sm text-center">Publish an event to generate share links.</p>
            )}
          </div>
        </FadeIn>
      )}

      {/* ── Orders: Recent + Manage tabs ─────────────────────────────────── */}
      <FadeIn delay={0.38} className="rounded-2xl bg-[#112240] border border-white/8 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {([
              { key: "recent", label: "Recent Orders", icon: Clock },
              { key: "manage", label: "Manage Orders",  icon: ClipboardList },
            ] as { key: "recent"|"manage"; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setOrdersTab(key)} style={{ transform: "none" }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  ordersTab === key
                    ? "bg-[#ff5a5f]/15 text-[#ff5a5f] border border-[#ff5a5f]/25"
                    : "text-white/40 hover:text-white border border-transparent"
                }`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
          <span className="text-white/25 text-xs">
            {ordersTab === "recent" ? `Latest ${stats?.recentOrders?.length ?? 0}` : `${stats?.recentOrders?.length ?? 0} total`}
          </span>
        </div>

        <AnimatePresence mode="wait">
          {ordersTab === "recent" ? (
            <motion.div key="recent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {!stats?.recentOrders?.length ? (
                <div className="px-6 py-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/4 flex items-center justify-center mx-auto mb-4">
                    <Ticket className="w-7 h-7 text-white/15" />
                  </div>
                  <p className="text-white/40 text-sm font-medium mb-1">No orders yet</p>
                  <p className="text-white/20 text-xs">Publish an event and share it to start selling</p>
                </div>
              ) : (
                <StaggeredList stagger={0.04} delayChildren={0.1} className="divide-y divide-white/5">
                  {stats.recentOrders.map((order) => (
                    <motion.div key={order.orderNumber} variants={staggerChild}
                      whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                      className="px-6 py-4 flex items-center justify-between transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#ff5a5f]/20 to-[#ff5a5f]/5 border border-[#ff5a5f]/20 flex items-center justify-center">
                            <span className="text-[#ff5a5f] text-xs font-bold">
                              {order.buyer?.name?.charAt(0)?.toUpperCase() ?? "?"}
                            </span>
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#ff5a5f] border-2 border-[#112240]" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{order.buyer?.name ?? "—"}</p>
                          <p className="text-white/35 text-xs truncate max-w-[200px]">{order.event?.title ?? "—"}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-[#ff5a5f] font-bold text-sm">${order.total?.toFixed(2)}</p>
                        <p className="text-white/25 text-xs mt-0.5">
                          {order.ticketCount} ticket{order.ticketCount !== 1 ? "s" : ""}
                          {order.confirmedAt && (
                            <> · {new Date(order.confirmedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
                          )}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </StaggeredList>
              )}
            </motion.div>
          ) : (
            <motion.div key="manage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {!stats?.recentOrders?.length ? (
                <div className="px-6 py-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/4 flex items-center justify-center mx-auto mb-4">
                    <ClipboardList className="w-7 h-7 text-white/15" />
                  </div>
                  <p className="text-white/40 text-sm font-medium mb-1">No orders to manage</p>
                  <p className="text-white/20 text-xs">Orders from your events will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  <div className="px-6 py-2 grid grid-cols-12 gap-4 text-white/25 text-[11px] font-semibold uppercase tracking-wider">
                    <span className="col-span-4">Attendee</span>
                    <span className="col-span-3">Event</span>
                    <span className="col-span-2 text-center">Tickets</span>
                    <span className="col-span-2 text-right">Total</span>
                    <span className="col-span-1 text-center">✓</span>
                  </div>
                  {stats.recentOrders.map((order) => (
                    <div key={order.orderNumber + "_m"} className="px-6 py-3 grid grid-cols-12 gap-4 items-center hover:bg-white/2 transition-colors">
                      <div className="col-span-4 flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#ff5a5f]/15 flex items-center justify-center text-[#ff5a5f] text-xs font-bold flex-shrink-0">
                          {order.buyer?.name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-xs font-medium truncate">{order.buyer?.name ?? "—"}</p>
                          <p className="text-white/30 text-[10px] truncate">{order.buyer?.email ?? ""}</p>
                        </div>
                      </div>
                      <p className="col-span-3 text-white/60 text-xs truncate">{order.event?.title ?? "—"}</p>
                      <p className="col-span-2 text-center text-white text-xs">{order.ticketCount}</p>
                      <p className="col-span-2 text-right text-[#ff5a5f] text-xs font-bold">${order.total?.toFixed(2)}</p>
                      <div className="col-span-1 flex justify-center">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </FadeIn>
    </div>
  );
}
