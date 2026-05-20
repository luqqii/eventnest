"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Calendar, MapPin, Ticket, Image as ImageIcon,
  Send, ChevronRight, ChevronLeft, Plus, Trash2, Check,
  Loader2, AlertCircle, Globe, ExternalLink, Building2,
  Tag, Info, Settings, ShieldCheck, Heart, Sparkles, HelpCircle,
  Eye, Edit3, Lock, Unlock, Percent, CalendarDays, DollarSign,
  Maximize2, Navigation, Compass, Map
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { eventApi, promoCodeApi, TicketTier } from "@/lib/api";
import toast from "react-hot-toast";

// ─── Step config ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Basic Details",   icon: FileText  },
  { id: 2, label: "Tickets Config", icon: Ticket    },
  { id: 3, label: "Advanced",       icon: Settings  },
  { id: 4, label: "Publish",        icon: Send      },
] as const;

const CATEGORIES = ["Music", "Technology", "College", "Sports", "Arts", "Business", "Food", "Other"];
const TIMEZONES  = [
  "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu",
  "Europe/London", "Europe/Paris", "Asia/Karachi", "Asia/Dubai",
];
const TICKET_TYPES = ["general", "vip", "early-bird", "student", "group"] as const;
const REFUND_POLICIES = [
  { value: "no-refund", label: "No Refunds"    },
  { value: "1-day",     label: "1-Day Refund"  },
  { value: "7-days",    label: "7-Day Refund"  },
  { value: "30-days",   label: "30-Day Refund" },
];

interface PromoCodeInput {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  usageLimit?: number;
  expiresAt?: string;
}

interface CustomField {
  label: string;
  type: "text" | "select";
  options: string[];
  required: boolean;
}

// ─── Wizard state shape ───────────────────────────────────────────────────────
interface WizardData {
  // Step 1: Basic Details
  title: string;
  category: string;
  description: string;
  tags: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timezone: string;
  isOnline: boolean;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  venueCountry: string;
  onlineLink: string;
  coverImage: string;
  
  // Step 2: Tickets
  ticketTiers: TicketTier[];
  
  // Step 3: Advanced
  refundPolicy: string;
  isPrivate: boolean;
  promoCodes: PromoCodeInput[];
  customFields: CustomField[];

  // Step 4: Publish
  slug: string;
}

const emptyTier = (name = "General Admission", type: TicketTier["type"] = "general", price = 29.99): TicketTier => ({
  name,
  type,
  price,
  quantity: 100,
  maxPerOrder: 10,
  description: "",
});

const defaultData: WizardData = {
  title: "",
  category: "Music",
  description: "",
  tags: "",
  startDate: "",
  startTime: "19:00",
  endDate: "",
  endTime: "23:00",
  timezone: "America/New_York",
  isOnline: false,
  venueName: "",
  venueAddress: "",
  venueCity: "",
  venueCountry: "US",
  onlineLink: "",
  coverImage: "",
  ticketTiers: [emptyTier("General Admission", "general", 29.99)],
  refundPolicy: "7-days",
  isPrivate: false,
  promoCodes: [],
  customFields: [],
  slug: "",
};

// ─── Input styling tokens ─────────────────────────────────────────────────────
const inputCls = "w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#ff5a5f]/50 focus:ring-1 focus:ring-[#ff5a5f]/20 transition-all font-medium";
const labelCls = "block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2";

export default function CreateEventPage() {
  const router = useRouter();
  const { accessToken, isAuthenticated, user, isLoading, logout } = useAuth();

  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(defaultData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [published, setPublished] = useState(false);
  const [createdEventId, setCreatedEventId] = useState("");
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Advanced Builders Temp State
  const [promoTemp, setPromoTemp] = useState<Partial<PromoCodeInput>>({
    code: "",
    discountType: "percent",
    discountValue: 15,
  });
  const [fieldTemp, setFieldTemp] = useState<Partial<CustomField>>({
    label: "",
    type: "text",
    options: [],
    required: false,
  });
  const [cfOptionInput, setCfOptionInput] = useState("");

  // Publish step preview active view
  const [previewTab, setPreviewTab] = useState<"edit" | "preview">("preview");

  // Auto-fill slug from title if user hasn't edited slug manually
  const isSlugUserEdited = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login?redirect=/create-event");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (data.title && !isSlugUserEdited.current) {
      const generated = data.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 50);
      setData((d) => ({ ...d, slug: generated }));
    }
  }, [data.title]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#ff5a5f] animate-spin mx-auto mb-4" />
          <p className="text-white/60 font-semibold text-sm">Validating session...</p>
        </div>
      </div>
    );
  }

  function set<K extends keyof WizardData>(field: K, value: WizardData[K]) {
    setData((d) => ({ ...d, [field]: value }));
    setErrors((e) => { const n = { ...e }; delete n[field as string]; return n; });
  }

  const handleUpgradeToOrganizer = async () => {
    setIsUpgrading(true);
    try {
      await logout();
      toast.success("Logged out attendee. Redirecting to organizer sign up...");
      router.push("/signup?role=organizer");
    } catch (err) {
      console.error("Logout failed:", err);
      toast.error("Failed to sign out. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  // ─── Step Validation ────────────────────────────────────────────────────────
  function validateStep(): boolean {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!data.title.trim() || data.title.length < 5) {
        e.title = "Event Name must be at least 5 characters";
      }
      if (!data.description.trim() || data.description.length < 20) {
        e.description = "Description must be at least 20 characters";
      }
      if (!data.category) e.category = "Please select a category";
      if (!data.startDate) e.startDate = "Start Date is required";
      if (!data.endDate) e.endDate = "End Date is required";
      if (data.startDate && data.endDate) {
        const start = new Date(`${data.startDate}T${data.startTime}`);
        const end = new Date(`${data.endDate}T${data.endTime}`);
        if (end <= start) {
          e.endDate = "End Date & Time must be after Start Date & Time";
        }
      }
      if (!data.isOnline) {
        if (!data.venueName.trim()) e.venueName = "Venue Name is required";
        if (!data.venueAddress.trim()) e.venueAddress = "Street Address is required";
        if (!data.venueCity.trim()) e.venueCity = "City is required";
      } else {
        if (data.onlineLink && !/^https?:\/\//.test(data.onlineLink)) {
          e.onlineLink = "Must be a valid URL starting with http:// or https://";
        }
      }
    }
    if (step === 2) {
      if (data.ticketTiers.length === 0) {
        e.ticketTiers = "At least one ticket tier is required";
      }
      data.ticketTiers.forEach((tier, i) => {
        if (!tier.name.trim()) e[`tier_${i}_name`] = "Tier name is required";
        if (tier.price < 0) e[`tier_${i}_price`] = "Price cannot be negative";
        if (tier.quantity < 1) e[`tier_${i}_qty`] = "Quantity must be at least 1";
        if (tier.saleStartsAt && tier.saleEndsAt) {
          if (new Date(tier.saleEndsAt) <= new Date(tier.saleStartsAt)) {
            e[`tier_${i}_saleEnds`] = "Sale end date must be after start date";
          }
        }
      });
    }
    if (step === 4) {
      if (!data.slug.trim()) {
        e.slug = "URL slug cannot be empty";
      } else if (!/^[a-z0-9-]+$/.test(data.slug)) {
        e.slug = "Slug must only contain lowercase letters, numbers, and dashes";
      }
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please resolve the highlighted errors before proceeding.");
      return false;
    }
    return true;
  }

  function next() {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, 4));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  
  function prev() {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ─── Event Creation Submission ──────────────────────────────────────────────
  async function handleSubmit(shouldPublish: boolean) {
    if (!validateStep()) return;
    if (!accessToken) {
      toast.error("Organizer authentication required");
      return;
    }
    setSubmitting(true);
    setSubmitError("");

    const startISO = `${data.startDate}T${data.startTime}:00`;
    const endISO   = `${data.endDate}T${data.endTime}:00`;

    const payload = {
      title:       data.title.trim(),
      slug:        data.slug.trim().toLowerCase(),
      description: data.description.trim(),
      category:    data.category,
      tags:        data.tags.split(",").map((t) => t.trim()).filter(Boolean),
      startDate:   startISO,
      endDate:     endISO,
      timezone:    data.timezone,
      venue: {
        name:       data.isOnline ? "Online Event" : data.venueName,
        address:    data.isOnline ? "Internet" : data.venueAddress,
        city:       data.isOnline ? "Virtual" : data.venueCity,
        country:    data.isOnline ? "US" : data.venueCountry,
      },
      isOnline:    data.isOnline,
      onlineLink:  data.onlineLink,
      ticketTiers: data.ticketTiers.map((t) => ({
        name:        t.name.trim(),
        type:        t.type,
        price:       Number(t.price),
        quantity:    Number(t.quantity),
        maxPerOrder: Number(t.maxPerOrder ?? 10),
        description: t.description ?? "",
        saleStartsAt: t.saleStartsAt ? new Date(t.saleStartsAt).toISOString() : undefined,
        saleEndsAt:   t.saleEndsAt ? new Date(t.saleEndsAt).toISOString() : undefined,
      })),
      coverImage:    data.coverImage.trim() || undefined,
      refundPolicy:  data.refundPolicy,
      isPrivate:     data.isPrivate,
      customFields:  data.customFields,
      publish:       shouldPublish,
    };

    const res = await eventApi.create(payload, accessToken);

    if (!res.success || !res.data) {
      setSubmitError(res.error ?? "Failed to create event.");
      setSubmitting(false);
      toast.error("Submission failed: " + (res.error ?? "Unexpected error"));
      return;
    }

    const createdId = res.data.event._id;

    // Create promo codes and link them
    if (data.promoCodes.length > 0) {
      toast.loading("Publishing discount codes...", { id: "promos" });
      for (const promo of data.promoCodes) {
        try {
          await promoCodeApi.create(
            {
              code: promo.code.trim().toUpperCase(),
              eventId: createdId,
              discountType: promo.discountType,
              discountValue: Number(promo.discountValue),
              usageLimit: promo.usageLimit ? Number(promo.usageLimit) : undefined,
              expiresAt: promo.expiresAt ? new Date(promo.expiresAt).toISOString() : undefined,
            },
            accessToken
          );
        } catch (err) {
          console.error("Failed creating promo code", promo.code, err);
        }
      }
      toast.dismiss("promos");
    }

    toast.success(shouldPublish ? "Event is live now!" : "Draft saved successfully!");
    setCreatedEventId(createdId);
    setPublished(shouldPublish);
    setSubmitting(false);
  }

  // ─── Ticket Tier Helpers ────────────────────────────────────────────────────
  function updateTier<K extends keyof TicketTier>(i: number, field: K, value: TicketTier[K]) {
    setData((d) => {
      const tiers = [...d.ticketTiers];
      tiers[i] = { ...tiers[i], [field]: value };
      return { ...d, ticketTiers: tiers };
    });
    setErrors((e) => {
      const n = { ...e };
      delete n[`tier_${i}_${String(field)}`];
      return n;
    });
  }

  function addTier(name = "New Ticket Tier", type: TicketTier["type"] = "general", price = 10) {
    setData((d) => ({
      ...d,
      ticketTiers: [...d.ticketTiers, emptyTier(name, type, price)],
    }));
  }

  function removeTier(i: number) {
    if (data.ticketTiers.length === 1) {
      toast.error("At least one ticket tier is required.");
      return;
    }
    setData((d) => ({ ...d, ticketTiers: d.ticketTiers.filter((_, idx) => idx !== i) }));
  }

  // ─── Promo Codes Helpers ───────────────────────────────────────────────────
  function addPromoCode() {
    if (!promoTemp.code?.trim()) {
      toast.error("Please enter a valid code name");
      return;
    }
    if (Number(promoTemp.discountValue) <= 0) {
      toast.error("Value must be greater than 0");
      return;
    }
    const finalCode = promoTemp.code.trim().toUpperCase();
    if (data.promoCodes.some((p) => p.code === finalCode)) {
      toast.error("Code already exists");
      return;
    }

    const codeObj: PromoCodeInput = {
      code: finalCode,
      discountType: promoTemp.discountType as "percent" | "fixed",
      discountValue: Number(promoTemp.discountValue),
      usageLimit: promoTemp.usageLimit ? Number(promoTemp.usageLimit) : undefined,
      expiresAt: promoTemp.expiresAt,
    };

    setData((d) => ({ ...d, promoCodes: [...d.promoCodes, codeObj] }));
    setPromoTemp({ code: "", discountType: "percent", discountValue: 15 });
    toast.success(`Discount code ${finalCode} added!`);
  }

  function removePromoCode(idx: number) {
    setData((d) => ({ ...d, promoCodes: d.promoCodes.filter((_, i) => i !== idx) }));
  }

  // ─── Custom Fields Helpers ──────────────────────────────────────────────────
  function addCustomFieldQuestion() {
    if (!fieldTemp.label?.trim()) {
      toast.error("Please enter a question name (e.g. T-shirt size)");
      return;
    }
    if (fieldTemp.type === "select" && (!fieldTemp.options || fieldTemp.options.length === 0)) {
      toast.error("Please add at least one select dropdown option");
      return;
    }

    const fieldObj: CustomField = {
      label: fieldTemp.label.trim(),
      type: fieldTemp.type as "text" | "select",
      options: fieldTemp.options || [],
      required: !!fieldTemp.required,
    };

    setData((d) => ({ ...d, customFields: [...d.customFields, fieldObj] }));
    setFieldTemp({ label: "", type: "text", options: [], required: false });
    toast.success(`Registration question "${fieldObj.label}" added!`);
  }

  function removeCustomField(idx: number) {
    setData((d) => ({ ...d, customFields: d.customFields.filter((_, i) => i !== idx) }));
  }

  function addCfOption() {
    if (!cfOptionInput.trim()) return;
    if (fieldTemp.options?.includes(cfOptionInput.trim())) {
      toast.error("Option already exists");
      return;
    }
    setFieldTemp((f) => ({
      ...f,
      options: [...(f.options || []), cfOptionInput.trim()],
    }));
    setCfOptionInput("");
  }

  // ─── Blocker screen for Attendees ──────────────────────────────────────────
  if (!isLoading && isAuthenticated && user?.role === "attendee") {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center pt-20 px-4 text-center">
        <div className="max-w-md w-full rounded-3xl bg-slate-900/50 border border-white/10 p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Background Ambient Glows */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff5a5f]/10 rounded-full filter blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full filter blur-3xl pointer-events-none" />

          <div className="w-16 h-16 rounded-2xl bg-[#ff5a5f]/15 flex items-center justify-center mx-auto mb-6 shadow-inner border border-[#ff5a5f]/30">
            <Building2 className="w-8 h-8 text-[#ff5a5f]" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-3">Host Account Required</h1>
          <p className="text-white/50 text-sm mb-8 leading-relaxed">
            You are currently signed in as an Attendee. To list events, design ticket tiers, manage registrations, and add custom fields, you need an Organizer profile. We will securely log you out so you can sign up as an organizer.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleUpgradeToOrganizer}
              disabled={isUpgrading}
              className="btn-scale w-full py-3.5 rounded-xl bg-gradient-to-r from-[#ff5a5f] to-[#ff3d42] text-white font-bold text-sm shadow-[0_0_18px_rgba(255,90,95,0.35)] hover:shadow-[0_0_28px_rgba(255,90,95,0.55)] transition-all flex items-center justify-center gap-2"
            >
              {isUpgrading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparing upgrade...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Upgrade to Organizer
                </>
              )}
            </button>
            <Link
              href="/explore"
              className="btn-scale w-full py-3 rounded-xl border border-white/10 text-white font-semibold hover:bg-white/5 transition-all text-sm block"
            >
              Browse Public Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Event Creation Success Screen ─────────────────────────────────────────
  if (createdEventId) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4 py-20">
        <div className="max-w-lg w-full text-center rounded-3xl bg-slate-900/50 border border-white/10 p-8 sm:p-10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff5a5f]/10 rounded-full filter blur-3xl pointer-events-none" />
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-20 h-20 rounded-full bg-[#ff5a5f]/15 flex items-center justify-center mx-auto mb-6 border border-[#ff5a5f]/30"
          >
            <Check className="w-10 h-10 text-[#ff5a5f]" />
          </motion.div>
          
          <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
            {published ? "Event is Live!" : "Draft Saved!"}
          </h2>
          <p className="text-white/50 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
            {published
              ? "Awesome! Your event has been published successfully and is now discoverable by attendees."
              : "Saved in drafts! You can finalize and publish your event page anytime from your console dashboard."}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={() => router.push(`/event/${data.slug || createdEventId}`)}
              className="btn-scale flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#ff5a5f] to-[#ff3d42] text-white font-bold text-sm shadow-[0_0_18px_rgba(255,90,95,0.3)]"
            >
              <ExternalLink className="w-4 h-4" /> View Live Page
            </button>
            <button 
              onClick={() => router.push("/dashboard")}
              className="btn-scale flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/15 text-white text-sm font-semibold hover:bg-white/5 transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      {/* Dynamic Background Effects */}
      <div className="absolute top-10 left-1/4 w-80 h-80 bg-[#ff5a5f]/5 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full filter blur-[120px] pointer-events-none" />

      {/* Page Title */}
      <div className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff5a5f]/10 border border-[#ff5a5f]/25 text-[#ff5a5f] text-xs font-bold mb-3">
            <Sparkles className="w-3 h-3" /> EventNest Wizard
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Create an Event
          </h1>
          <p className="text-slate-400 text-sm">
            Launch a beautiful ticketed or free experience in minutes.
          </p>
        </div>
        <div className="px-4 py-2.5 rounded-xl bg-slate-900 border border-white/5 text-right hidden sm:block">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Wizard Progress</span>
          <span className="text-white font-extrabold text-sm">Step {step} of 4</span>
        </div>
      </div>

      {/* ── Step Indicators ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-3 pt-1 scrollbar-none border-b border-white/5">
        {STEPS.map(({ id, label, icon: Icon }, idx) => {
          const done    = step > id;
          const current = step === id;
          return (
            <div key={id} className="flex items-center gap-2 flex-shrink-0">
              <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                current ? "bg-[#ff5a5f]/15 text-[#ff5a5f] border border-[#ff5a5f]/30 shadow-[0_0_12px_rgba(255,90,95,0.15)]"
                : done   ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                         : "bg-slate-950/40 text-slate-500 border border-white/5"
              }`}>
                {done ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
                <span>{label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`w-6 sm:w-12 h-[2px] rounded-full flex-shrink-0 ${done ? "bg-emerald-500/30" : "bg-white/5"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step Content ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
          className="rounded-3xl bg-[#0f172a]/60 border border-white/10 p-6 sm:p-10 mb-8 backdrop-blur-md shadow-2xl relative"
        >

          {/* ── STEP 1: BASIC DETAILS ──────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1.5">Step 1: Basic Details</h2>
                <p className="text-slate-400 text-sm">Tell your attendees about your event title, agenda, location, and dates.</p>
              </div>

              {/* Title, Category & Tags */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className={labelCls}>Event Title *</label>
                  <input 
                    type="text" 
                    value={data.title} 
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="e.g. Neon Pulse Electro Music Festival"
                    className={`${inputCls} ${errors.title ? "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/10" : ""}`} 
                  />
                  {errors.title && <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.title}</p>}
                </div>
                
                <div>
                  <label className={labelCls}>Category *</label>
                  <select 
                    value={data.category} 
                    onChange={(e) => set("category", e.target.value)}
                    className={inputCls}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-slate-900 text-white font-medium">{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className={labelCls}>Description * (min 20 characters)</label>
                <textarea 
                  value={data.description} 
                  onChange={(e) => set("description", e.target.value)}
                  rows={5} 
                  placeholder="Tell people what your event is about, ticket inclusions, schedule, and guest stars..."
                  className={`${inputCls} resize-none leading-relaxed ${errors.description ? "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/10" : ""}`} 
                />
                <div className="flex items-center justify-between mt-2">
                  {errors.description ? (
                    <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.description}</p>
                  ) : <span />}
                  <span className={`text-xs font-semibold ${data.description.length < 20 ? "text-slate-500" : "text-[#ff5a5f]"}`}>
                    {data.description.length} characters
                  </span>
                </div>
              </div>

              {/* Cover Banner URL & Live Preview Card */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
                <div className="md:col-span-3 space-y-4">
                  <div>
                    <label className={labelCls}>Banner Cover Image URL</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <ImageIcon className="h-4 w-4 text-white/25" />
                      </div>
                      <input 
                        type="url" 
                        value={data.coverImage}
                        onChange={(e) => set("coverImage", e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        className={`${inputCls} pl-10`} 
                      />
                    </div>
                    <p className="text-slate-500 text-xs mt-1.5">Provide a high-quality direct image URL. Unsplash URLs work perfectly.</p>
                  </div>
                  
                  <div>
                    <label className={labelCls}>Tags (comma-separated, optional)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Tag className="h-4 w-4 text-white/25" />
                      </div>
                      <input 
                        type="text" 
                        value={data.tags} 
                        onChange={(e) => set("tags", e.target.value)}
                        placeholder="festival, music, tech, dance"
                        className={`${inputCls} pl-10`} 
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <span className={labelCls}>Image Visual Preview</span>
                  {data.coverImage ? (
                    <div className="rounded-2xl overflow-hidden border border-white/10 aspect-video bg-slate-950 relative shadow-lg group">
                      <img 
                        src={data.coverImage} 
                        alt="Cover preview"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                        <span className="px-2 py-1 rounded bg-black/60 text-white/80 text-[10px] font-bold uppercase tracking-wider">Live Preview</span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 aspect-video flex flex-col items-center justify-center gap-3 bg-slate-950/20">
                      <ImageIcon className="w-8 h-8 text-slate-600" />
                      <p className="text-slate-500 text-xs text-center font-medium">Valid cover URL shows here</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Date & Time Picker */}
              <div className="border-t border-white/5 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarDays className="w-5 h-5 text-[#ff5a5f]" />
                  <h3 className="text-md font-bold text-white">Date & Schedule Config</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelCls}>Start Date & Time *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="date" 
                        value={data.startDate} 
                        onChange={(e) => set("startDate", e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className={`${inputCls} [color-scheme:dark] ${errors.startDate ? "border-red-500/40" : ""}`} 
                      />
                      <input 
                        type="time" 
                        value={data.startTime} 
                        onChange={(e) => set("startTime", e.target.value)}
                        className={`${inputCls} [color-scheme:dark]`} 
                      />
                    </div>
                    {errors.startDate && <p className="text-red-400 text-xs mt-1.5">{errors.startDate}</p>}
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className={labelCls}>End Date & Time *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="date" 
                        value={data.endDate} 
                        onChange={(e) => set("endDate", e.target.value)}
                        min={data.startDate || new Date().toISOString().split("T")[0]}
                        className={`${inputCls} [color-scheme:dark] ${errors.endDate ? "border-red-500/40" : ""}`} 
                      />
                      <input 
                        type="time" 
                        value={data.endTime} 
                        onChange={(e) => set("endTime", e.target.value)}
                        className={`${inputCls} [color-scheme:dark]`} 
                      />
                    </div>
                    {errors.endDate && <p className="text-red-400 text-xs mt-1.5">{errors.endDate}</p>}
                  </div>

                  <div className="col-span-1">
                    <label className={labelCls}>Timezone</label>
                    <select 
                      value={data.timezone} 
                      onChange={(e) => set("timezone", e.target.value)}
                      className={inputCls}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz} className="bg-slate-900 text-white font-medium">{tz}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Location Configuration */}
              <div className="border-t border-white/5 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-[#ff5a5f]" />
                  <h3 className="text-md font-bold text-white">Event Venue Location</h3>
                </div>

                <div className="flex items-center gap-3 max-w-sm mb-6 bg-slate-950/40 p-1.5 rounded-2xl border border-white/5">
                  <button 
                    type="button"
                    onClick={() => set("isOnline", false)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      !data.isOnline
                        ? "bg-[#ff5a5f] text-white shadow-md shadow-[#ff5a5f]/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" /> In-Person Venue
                  </button>
                  <button 
                    type="button"
                    onClick={() => set("isOnline", true)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      data.isOnline
                        ? "bg-[#ff5a5f] text-white shadow-md shadow-[#ff5a5f]/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" /> Online Webinar
                  </button>
                </div>

                {data.isOnline ? (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-xl">
                    <div>
                      <label className={labelCls}>Online Streaming Link</label>
                      <input 
                        type="url" 
                        value={data.onlineLink} 
                        onChange={(e) => set("onlineLink", e.target.value)}
                        placeholder="https://zoom.us/j/987654321 or Youtube URL"
                        className={`${inputCls} ${errors.onlineLink ? "border-red-500/40" : ""}`} 
                      />
                      {errors.onlineLink && <p className="text-red-400 text-xs mt-1.5">{errors.onlineLink}</p>}
                      <p className="text-slate-500 text-xs mt-1.5">
                        This URL link will remain protected and will only be displayed to authenticated ticket holders.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                    <div className="lg:col-span-3 space-y-4">
                      <div>
                        <label className={labelCls}>Venue Name *</label>
                        <input 
                          type="text" 
                          value={data.venueName} 
                          onChange={(e) => set("venueName", e.target.value)}
                          placeholder="e.g. Lincoln Center Plaza"
                          className={`${inputCls} ${errors.venueName ? "border-red-500/40" : ""}`} 
                        />
                        {errors.venueName && <p className="text-red-400 text-xs mt-1.5">{errors.venueName}</p>}
                      </div>
                      <div>
                        <label className={labelCls}>Street Address *</label>
                        <input 
                          type="text" 
                          value={data.venueAddress} 
                          onChange={(e) => set("venueAddress", e.target.value)}
                          placeholder="10 Lincoln Center Plaza"
                          className={`${inputCls} ${errors.venueAddress ? "border-red-500/40" : ""}`} 
                        />
                        {errors.venueAddress && <p className="text-red-400 text-xs mt-1.5">{errors.venueAddress}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>City *</label>
                          <input 
                            type="text" 
                            value={data.venueCity} 
                            onChange={(e) => set("venueCity", e.target.value)}
                            placeholder="New York"
                            className={`${inputCls} ${errors.venueCity ? "border-red-500/40" : ""}`} 
                          />
                          {errors.venueCity && <p className="text-red-400 text-xs mt-1.5">{errors.venueCity}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Country</label>
                          <input 
                            type="text" 
                            value={data.venueCountry} 
                            onChange={(e) => set("venueCountry", e.target.value)}
                            placeholder="US"
                            className={inputCls} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Interactive Google Map Mockup Card */}
                    <div className="lg:col-span-2 space-y-2">
                      <span className={labelCls}>Interactive Location Mockup</span>
                      <div className="rounded-2xl border border-white/10 bg-slate-950 p-4 aspect-[4/3] flex flex-col justify-between relative overflow-hidden shadow-inner select-none">
                        
                        {/* Map Grid Background */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                          backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
                          backgroundSize: "24px 24px, 12px 12px, 12px 12px",
                          backgroundPosition: "center center"
                        }} />

                        {/* Search Bar HUD */}
                        <div className="z-10 bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-xl flex items-center justify-between shadow-lg">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Map className="w-3.5 h-3.5 text-[#ff5a5f] flex-shrink-0" />
                            <span className="text-[10px] text-white/80 font-bold truncate">
                              {data.venueCity ? `${data.venueCity}, ${data.venueCountry}` : "Scanning Location..."}
                            </span>
                          </div>
                          <span className="text-[9px] text-[#ff5a5f] font-extrabold flex items-center gap-1.5 uppercase flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a5f] animate-ping" />
                            GPS Active
                          </span>
                        </div>

                        {/* Centered Pulsing Pin */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-[#ff5a5f]/15 border border-[#ff5a5f]/30 absolute -top-6 -left-6 animate-ping pointer-events-none" />
                            <div className="w-8 h-8 rounded-full bg-[#ff5a5f]/20 border border-[#ff5a5f]/40 absolute -top-4 -left-4 animate-pulse pointer-events-none" />
                            <MapPin className="w-7 h-7 text-[#ff5a5f] filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)] transform -translate-y-3 z-10" />
                          </div>
                        </div>

                        {/* Bottom Compass and Zoom Actions */}
                        <div className="z-10 flex items-end justify-between">
                          <div className="bg-slate-900/95 border border-white/8 px-2 py-1.5 rounded-lg flex flex-col gap-1 items-center shadow-md">
                            <button type="button" className="text-slate-400 hover:text-white text-xs font-bold py-0.5 px-1.5 rounded bg-white/5">+</button>
                            <div className="w-full h-px bg-white/5" />
                            <button type="button" className="text-slate-400 hover:text-white text-xs font-bold py-0.5 px-1.5 rounded bg-white/5">-</button>
                          </div>

                          <div className="bg-slate-900/90 border border-white/10 px-3 py-2 rounded-xl text-[10px] text-white/50 text-right backdrop-blur-sm max-w-[70%]">
                            <p className="font-extrabold text-white truncate">{data.venueName || "Insert Venue Name"}</p>
                            <p className="truncate text-[9px] mt-0.5">{data.venueAddress || "Address details will pin here"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2: TICKET CONFIGURATION ───────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1.5">Step 2: Ticket Configuration</h2>
                <p className="text-slate-400 text-sm">Add different tiers of tickets (like Early Bird, General, VIP) to monetize your event.</p>
              </div>

              {/* Predefined Quick Tiers Selector */}
              <div className="bg-slate-950/40 p-5 rounded-2xl border border-white/5">
                <span className={labelCls}>Quick Add Preset Ticket Tiers</span>
                <div className="flex flex-wrap gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => addTier("General Admission", "general", 29.99)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-[#ff5a5f]/10 border border-white/10 hover:border-[#ff5a5f]/30 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> General ($29.99)
                  </button>
                  <button
                    type="button"
                    onClick={() => addTier("VIP Access Pass", "vip", 99.99)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/30 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" /> VIP Pass ($99.99)
                  </button>
                  <button
                    type="button"
                    onClick={() => addTier("Early Bird Discount", "early-bird", 19.99)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" /> Early Bird ($19.99)
                  </button>
                </div>
              </div>

              {/* Custom validation feedback for tiers */}
              {errors.ticketTiers && (
                <div className="p-3 bg-red-500/10 border border-red-500/35 text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {errors.ticketTiers}
                </div>
              )}

              {/* Tiers List */}
              <div className="space-y-6">
                {data.ticketTiers.map((tier, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    key={i} 
                    className="rounded-2xl bg-slate-950/40 border border-white/10 p-6 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-[#ff5a5f]/40 to-transparent" />
                    
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#ff5a5f]/15 text-[#ff5a5f] text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-white font-extrabold text-sm truncate max-w-[150px] sm:max-w-none">
                          {tier.name || `Custom Tier ${i + 1}`}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                          tier.type === "vip"        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          tier.type === "early-bird" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          tier.type === "student"    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"  :
                          tier.type === "group"      ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                          "bg-white/5 text-slate-400 border border-white/5"
                        }`}>
                          {tier.type}
                        </span>
                      </div>
                      
                      <button 
                        type="button" 
                        onClick={() => removeTier(i)}
                        className="p-2 rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Name */}
                      <div className="sm:col-span-2">
                        <label className={labelCls}>Tier Name *</label>
                        <input 
                          type="text" 
                          value={tier.name}
                          onChange={(e) => updateTier(i, "name", e.target.value)}
                          placeholder="General Admission, VIP Lounge Pass..."
                          className={`${inputCls} ${errors[`tier_${i}_name`] ? "border-red-500/40" : ""}`} 
                        />
                        {errors[`tier_${i}_name`] && <p className="text-red-400 text-xs mt-1.5">{errors[`tier_${i}_name`]}</p>}
                      </div>

                      {/* Type */}
                      <div>
                        <label className={labelCls}>Tier Category Type</label>
                        <select 
                          value={tier.type}
                          onChange={(e) => updateTier(i, "type", e.target.value as TicketTier["type"])}
                          className={inputCls}
                        >
                          {TICKET_TYPES.map((t) => (
                            <option key={t} value={t} className="bg-slate-900 text-white font-medium">{t}</option>
                          ))}
                        </select>
                      </div>

                      {/* Price */}
                      <div>
                        <label className={labelCls}>Price (USD) *</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                          <input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            value={tier.price}
                            onChange={(e) => updateTier(i, "price", parseFloat(e.target.value) || 0)}
                            placeholder="0.00 for free"
                            className={`${inputCls} pl-8 ${errors[`tier_${i}_price`] ? "border-red-500/40" : ""}`} 
                          />
                        </div>
                        {errors[`tier_${i}_price`] && <p className="text-red-400 text-xs mt-1.5">{errors[`tier_${i}_price`]}</p>}
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className={labelCls}>Inventory Stock *</label>
                        <input 
                          type="number" 
                          min="1" 
                          value={tier.quantity}
                          onChange={(e) => updateTier(i, "quantity", parseInt(e.target.value) || 0)}
                          placeholder="e.g. 150"
                          className={`${inputCls} ${errors[`tier_${i}_qty`] ? "border-red-500/40" : ""}`} 
                        />
                        {errors[`tier_${i}_qty`] && <p className="text-red-400 text-xs mt-1.5">{errors[`tier_${i}_qty`]}</p>}
                      </div>

                      {/* Max Per Order */}
                      <div>
                        <label className={labelCls}>Max limit per user</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="50"
                          value={tier.maxPerOrder ?? 10}
                          onChange={(e) => updateTier(i, "maxPerOrder", parseInt(e.target.value) || 10)}
                          className={inputCls} 
                        />
                      </div>

                      {/* Sale window */}
                      <div>
                        <label className={labelCls}>Sales Launch Date</label>
                        <input 
                          type="datetime-local" 
                          value={tier.saleStartsAt ?? ""}
                          onChange={(e) => updateTier(i, "saleStartsAt", e.target.value || undefined)}
                          className={`${inputCls} [color-scheme:dark]`} 
                        />
                      </div>

                      <div>
                        <label className={labelCls}>Sales Closure Date</label>
                        <input 
                          type="datetime-local" 
                          value={tier.saleEndsAt ?? ""}
                          onChange={(e) => updateTier(i, "saleEndsAt", e.target.value || undefined)}
                          className={`${inputCls} [color-scheme:dark]`} 
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className={labelCls}>Price Description (Optional)</label>
                      <input 
                        type="text" 
                        value={tier.description ?? ""}
                        onChange={(e) => updateTier(i, "description", e.target.value)}
                        placeholder="e.g. Front row seating, includes full VIP merchandise and premium beverages"
                        className={inputCls} 
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              <button 
                type="button" 
                onClick={() => addTier()}
                className="btn-scale w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-white/10 hover:border-[#ff5a5f]/40 text-slate-400 hover:text-[#ff5a5f] bg-slate-950/20 hover:bg-[#ff5a5f]/5 transition-all text-sm font-bold"
              >
                <Plus className="w-4 h-4" /> Add custom ticket tier
              </button>
            </div>
          )}

          {/* ── STEP 3: ADVANCED SETTINGS ──────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1.5">Step 3: Advanced Settings</h2>
                <p className="text-slate-400 text-sm">Fine-tune event privacy, refund policy rules, dynamic discount codes, and custom attendee forms.</p>
              </div>

              {/* Privacy and Refund policies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelCls}>Refund Policy Window</label>
                  <select 
                    value={data.refundPolicy}
                    onChange={(e) => set("refundPolicy", e.target.value)}
                    className={inputCls}
                  >
                    {REFUND_POLICIES.map((r) => (
                      <option key={r.value} value={r.value} className="bg-slate-900 text-white font-medium">{r.label}</option>
                    ))}
                  </select>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 flex items-center justify-between shadow-inner">
                  <div>
                    <span className="text-white text-sm font-bold flex items-center gap-1.5">
                      {data.isPrivate ? (
                        <><Lock className="w-4 h-4 text-amber-500" /> Private Event</>
                      ) : (
                        <><Unlock className="w-4 h-4 text-emerald-500" /> Public Visibility</>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {data.isPrivate ? "Accessible only to users with the direct link" : "Listed publicly on search engines and explore catalog"}
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => set("isPrivate", !data.isPrivate)}
                    className={`relative w-12 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                      data.isPrivate ? "bg-amber-500" : "bg-slate-800"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full bg-white shadow-lg transform transition-transform ${
                      data.isPrivate ? "translate-x-6" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              </div>

              {/* Promo Code Dynamic Builder */}
              <div className="border-t border-white/5 pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Percent className="w-5 h-5 text-[#ff5a5f]" />
                  <h3 className="text-md font-bold text-white">Promo & Discount Codes Builder</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end bg-slate-950/30 p-5 rounded-2xl border border-white/5">
                  <div className="md:col-span-2">
                    <label className={labelCls}>Discount Code *</label>
                    <input 
                      type="text"
                      value={promoTemp.code ?? ""}
                      onChange={(e) => setPromoTemp(p => ({ ...p, code: e.target.value }))}
                      placeholder="e.g. FLASH30, EARLYBIRD"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Type</label>
                    <select
                      value={promoTemp.discountType}
                      onChange={(e) => setPromoTemp(p => ({ ...p, discountType: e.target.value as "percent" | "fixed" }))}
                      className={inputCls}
                    >
                      <option value="percent" className="bg-slate-900 text-white font-medium">Percent (%)</option>
                      <option value="fixed" className="bg-slate-900 text-white font-medium">Fixed ($)</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>Value *</label>
                    <input 
                      type="number"
                      value={promoTemp.discountValue ?? ""}
                      onChange={(e) => setPromoTemp(p => ({ ...p, discountValue: Math.max(0, parseFloat(e.target.value) || 0) }))}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={addPromoCode}
                      className="btn-scale w-full py-3 rounded-xl bg-white/10 hover:bg-[#ff5a5f] hover:text-white border border-white/5 hover:border-transparent text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Code
                    </button>
                  </div>
                </div>

                {/* Promo Code list */}
                {data.promoCodes.length > 0 && (
                  <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/30">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-slate-950 text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
                          <th className="px-4 py-3">Code</th>
                          <th className="px-4 py-3">Discount</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.promoCodes.map((p, idx) => (
                          <tr key={idx} className="text-xs text-white">
                            <td className="px-4 py-3 font-mono font-bold text-[#ff5a5f]">{p.code}</td>
                            <td className="px-4 py-3 font-medium">
                              {p.discountType === "percent" ? `${p.discountValue}% Off` : `$${p.discountValue} Off`}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button 
                                type="button" 
                                onClick={() => removePromoCode(idx)}
                                className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Attendee Registration Questions Builder */}
              <div className="border-t border-white/5 pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-[#ff5a5f]" />
                  <h3 className="text-md font-bold text-white">Attendee Questions (Custom Fields)</h3>
                </div>

                <div className="bg-slate-950/30 p-5 rounded-2xl border border-white/5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                      <label className={labelCls}>Question Label (e.g. Dietary Restrictions) *</label>
                      <input 
                        type="text"
                        value={fieldTemp.label ?? ""}
                        onChange={(e) => setFieldTemp(f => ({ ...f, label: e.target.value }))}
                        placeholder="e.g. T-shirt size, Dietary restrictions"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Field Input Type</label>
                      <select
                        value={fieldTemp.type}
                        onChange={(e) => setFieldTemp(f => ({ ...f, type: e.target.value as "text" | "select" }))}
                        className={inputCls}
                      >
                        <option value="text" className="bg-slate-900 text-white font-medium">Free Text</option>
                        <option value="select" className="bg-slate-900 text-white font-medium">Dropdown Options</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between pb-3 bg-slate-900/40 p-3 rounded-xl border border-white/5">
                      <span className="text-slate-400 text-xs font-semibold">Required Question?</span>
                      <button
                        type="button"
                        onClick={() => setFieldTemp(f => ({ ...f, required: !f.required }))}
                        className={`relative w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${
                          fieldTemp.required ? "bg-[#ff5a5f]" : "bg-slate-800"
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full bg-white shadow-lg transform transition-transform ${
                          fieldTemp.required ? "translate-x-4" : "translate-x-0"
                        }`} />
                      </button>
                    </div>
                  </div>

                  {fieldTemp.type === "select" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="p-4 bg-slate-950/60 rounded-xl border border-white/5 space-y-3">
                      <span className={labelCls}>Select Options</span>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={cfOptionInput}
                          onChange={(e) => setCfOptionInput(e.target.value)}
                          placeholder="e.g. Small, Medium, Large"
                          className={inputCls}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCfOption();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={addCfOption}
                          className="px-4 rounded-xl bg-white/10 hover:bg-[#ff5a5f] text-white text-xs font-bold transition-all"
                        >
                          Add Option
                        </button>
                      </div>
                      
                      {fieldTemp.options && fieldTemp.options.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {fieldTemp.options.map((opt, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-xs flex items-center gap-1.5 font-medium">
                              {opt}
                              <button 
                                type="button" 
                                onClick={() => setFieldTemp(f => ({ ...f, options: f.options?.filter((_, o) => o !== i) }))}
                                className="text-red-400 hover:text-red-300 font-bold"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  <button
                    type="button"
                    onClick={addCustomFieldQuestion}
                    className="btn-scale w-full py-3 rounded-xl bg-gradient-to-r from-[#ff5a5f]/25 to-[#ff3d42]/25 hover:from-[#ff5a5f] hover:to-[#ff3d42] text-white text-xs font-bold transition-all border border-[#ff5a5f]/40 hover:border-transparent flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Save Registration Question
                  </button>
                </div>

                {/* Field Questions list preview */}
                {data.customFields.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {data.customFields.map((f, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-950/40 border border-white/10 relative overflow-hidden flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                              {f.type === "select" ? "Dropdown Selection" : "Free Text Input"}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                              f.required ? "bg-[#ff5a5f]/10 text-[#ff5a5f]" : "bg-white/5 text-slate-500"
                            }`}>
                              {f.required ? "Required" : "Optional"}
                            </span>
                          </div>
                          
                          <p className="text-white text-sm font-extrabold mb-3">{f.label}</p>
                          
                          {f.type === "select" && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {f.options.map((opt, o) => (
                                <span key={o} className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-white/50 text-[10px]">
                                  {opt}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-right border-t border-white/5 pt-2.5 mt-2">
                          <button 
                            type="button" 
                            onClick={() => removeCustomField(idx)}
                            className="text-red-400/80 hover:text-red-400 text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove Question
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 4: PUBLISH & PREVIEW ──────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1.5">Step 4: Finalize & Publish</h2>
                <p className="text-slate-400 text-sm">Edit your SEO slug, review the interactive preview mockup, and launch your page.</p>
              </div>

              {/* SEO slug editor */}
              <div className="bg-slate-950/40 p-5 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#ff5a5f]" />
                  <span className={labelCls}>SEO-Friendly URL Slug</span>
                </div>
                
                <div className="flex">
                  <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-white/10 bg-slate-900 text-slate-500 text-xs sm:text-sm font-medium">
                    eventnest.com/event/
                  </span>
                  <input 
                    type="text"
                    value={data.slug}
                    onChange={(e) => {
                      isSlugUserEdited.current = true;
                      set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
                    }}
                    placeholder="my-great-experience"
                    className={`${inputCls} rounded-none rounded-r-xl border-l-0 ${errors.slug ? "border-red-500/40" : ""}`}
                  />
                </div>
                {errors.slug && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.slug}</p>}
                <p className="text-slate-500 text-[10px] font-semibold mt-1">Attendees will use this direct unique path to find and purchase tickets to your event.</p>
              </div>

              {/* Live Attendee Details Preview Panel */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-[#ff5a5f]" />
                    <h3 className="text-md font-bold text-white">Attendee Details Page Preview</h3>
                  </div>
                  
                  <div className="flex bg-slate-950/40 border border-white/10 rounded-xl p-1 text-[11px] font-bold">
                    <button 
                      type="button"
                      onClick={() => setPreviewTab("preview")}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        previewTab === "preview" ? "bg-[#ff5a5f] text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Live View Mockup
                    </button>
                    <button 
                      type="button"
                      onClick={() => setPreviewTab("edit")}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        previewTab === "edit" ? "bg-[#ff5a5f] text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Specifications summary
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {previewTab === "preview" ? (
                    <motion.div 
                      key="live-preview"
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }}
                      className="rounded-3xl border border-white/10 bg-[#030712] overflow-hidden shadow-2xl relative"
                    >
                      {/* Browser Header Bar */}
                      <div className="bg-slate-900/90 border-b border-white/5 px-4 py-3 flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                        </div>
                        <div className="flex-1 max-w-sm mx-auto bg-slate-950 border border-white/5 px-3 py-1 rounded-lg text-center text-[10px] text-slate-500 font-mono select-all truncate">
                          https://eventnest.com/event/{data.slug || "your-slug"}
                        </div>
                      </div>

                      {/* Mockup Body Content */}
                      <div className="p-4 sm:p-6 space-y-6 max-h-[500px] overflow-y-auto scrollbar-thin">
                        
                        {/* Event Hero Cover */}
                        <div className="h-44 sm:h-60 rounded-2xl bg-slate-950 border border-white/5 overflow-hidden relative">
                          {data.coverImage ? (
                            <img src={data.coverImage} alt="Preview Hero" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-[#ff5a5f]/20 via-slate-950 to-blue-500/10 flex flex-col items-center justify-center gap-2">
                              <ImageIcon className="w-8 h-8 text-[#ff5a5f]/40" />
                              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold">Cover Image Placeholder</span>
                            </div>
                          )}
                          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/80 border border-white/10 backdrop-blur-md text-[10px] text-[#ff5a5f] font-extrabold uppercase">
                            {data.category}
                          </div>
                        </div>

                        {/* Title & Info grids */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          
                          <div className="md:col-span-2 space-y-5">
                            <div>
                              <h3 className="text-2xl font-extrabold text-white leading-tight">
                                {data.title || "Untiled Beautiful Event"}
                              </h3>
                              <p className="text-white/40 text-[11px] mt-1">Hosted by {user?.name || "Organizer Name"}</p>
                            </div>

                            <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap">
                              {data.description || "Describe your event details under Step 1 to update this preview container."}
                            </p>

                            {/* Geo Location / Stream HUD */}
                            <div className="p-4 rounded-2xl bg-slate-900 border border-white/5">
                              <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block mb-2">Location HUD</span>
                              {data.isOnline ? (
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                                    <Globe className="w-4 h-4 text-emerald-400" />
                                  </div>
                                  <div>
                                    <span className="text-white text-xs font-bold block">Online Virtual Stream</span>
                                    <span className="text-emerald-400 text-[10px] font-semibold mt-0.5 inline-block">Safe URL protected for purchasers</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-4 items-center">
                                  <div className="w-9 h-9 rounded-xl bg-[#ff5a5f]/15 flex items-center justify-center flex-shrink-0">
                                    <MapPin className="w-4 h-4 text-[#ff5a5f]" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-white text-xs font-bold block truncate">{data.venueName || "Lincoln Plaza"}</span>
                                    <span className="text-slate-400 text-[10px] truncate block mt-0.5">{data.venueAddress || "Address details"}</span>
                                  </div>
                                  
                                  {/* Map Micro Mockup */}
                                  <div className="w-16 h-12 rounded-lg bg-slate-950 border border-white/10 hidden sm:flex items-center justify-center overflow-hidden flex-shrink-0">
                                    <Compass className="w-4 h-4 text-[#ff5a5f] animate-spin-slow" />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Attendee Form Custom Questions */}
                            {data.customFields.length > 0 && (
                              <div className="p-4 rounded-2xl border border-white/5 bg-slate-900 space-y-4">
                                <div>
                                  <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">Attendee Registration Fields</span>
                                  <p className="text-slate-400 text-[10px] mt-0.5">Purchasers will be asked to fill these questions at checkout:</p>
                                </div>

                                <div className="space-y-3">
                                  {data.customFields.map((f, i) => (
                                    <div key={i} className="space-y-1.5">
                                      <label className="block text-[11px] font-bold text-white/80">
                                        {f.label} {f.required && <span className="text-[#ff5a5f] font-extrabold">*</span>}
                                      </label>
                                      {f.type === "select" ? (
                                        <select disabled className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white/40 text-xs">
                                          <option>Select an option...</option>
                                          {f.options.map((o, idx) => (
                                            <option key={idx}>{o}</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input type="text" disabled placeholder="Type your response..." className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white/40 text-xs" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Tickets Card Container */}
                          <div className="space-y-4">
                            <div className="rounded-2xl bg-slate-900 border border-white/10 p-4 shadow-xl space-y-4">
                              <span className="text-[10px] text-[#ff5a5f] uppercase tracking-wider font-extrabold block">Ticketing Checkout</span>
                              
                              <div className="space-y-3">
                                {data.ticketTiers.map((tier, i) => (
                                  <div key={i} className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 hover:border-white/10 transition-all flex items-center justify-between">
                                    <div>
                                      <span className="text-white text-xs font-bold block truncate max-w-[100px]">{tier.name || `Tier ${i + 1}`}</span>
                                      <span className="text-[9px] text-[#ff5a5f] font-extrabold">{tier.price === 0 ? "FREE" : `$${tier.price.toFixed(2)}`}</span>
                                    </div>
                                    <button disabled type="button" className="px-2.5 py-1 rounded bg-[#ff5a5f]/15 hover:bg-[#ff5a5f] text-[#ff5a5f] hover:text-white font-bold text-[10px] transition-colors">
                                      Select
                                    </button>
                                  </div>
                                ))}
                              </div>

                              <button disabled type="button" className="w-full py-2.5 rounded-xl bg-[#ff5a5f] text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5">
                                Buy Tickets
                              </button>
                            </div>

                            <div className="rounded-xl bg-slate-900 border border-white/5 p-3.5 text-center text-[10px] text-slate-500 font-semibold space-y-1">
                              <p className="text-white/60">📅 Event Dates</p>
                              <p className="mt-1">{data.startDate ? new Date(data.startDate).toLocaleDateString() : "TBD"} @ {data.startTime}</p>
                            </div>
                          </div>

                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="spec-summary"
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }}
                      className="rounded-3xl border border-white/10 bg-slate-950/30 p-6 space-y-4"
                    >
                      {[
                        { label: "Event Name",       value: data.title },
                        { label: "Category Area",    value: data.category },
                        { label: "Launch Window",      value: `${data.startDate} at ${data.startTime}` },
                        { label: "Closure Window",        value: `${data.endDate} at ${data.endTime}` },
                        { label: "TimeZone Config",    value: data.timezone },
                        { label: "Location Path",    value: data.isOnline ? "Online / Virtual Link" : `${data.venueName}, ${data.venueCity}, ${data.venueCountry}` },
                        { label: "Refund Windows",      value: REFUND_POLICIES.find((r) => r.value === data.refundPolicy)?.label },
                        { label: "Access Controls",    value: data.isPrivate ? "Private Event (Secret URL)" : "Public event" },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between gap-4 py-2.5 border-b border-white/5 text-xs">
                          <span className="text-slate-500 font-bold uppercase tracking-wider">{label}</span>
                          <span className="text-white font-medium text-right">{value || "—"}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit Error banner */}
              {submitError && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/35 text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── Action Nav Footer ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button 
          type="button" 
          onClick={prev} 
          disabled={step === 1 || submitting}
          className="btn-scale flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-white/10 hover:border-white/20 text-slate-400 hover:text-white text-sm font-bold disabled:opacity-20 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        {/* Progress circles */}
        <div className="hidden sm:flex items-center gap-2">
          {STEPS.map(({ id }) => (
            <div key={id} className={`h-1.5 rounded-full transition-all duration-300 ${
              id <= step ? "bg-[#ff5a5f] w-8" : "bg-white/10 w-4"
            }`} />
          ))}
        </div>

        {step < 4 ? (
          <button 
            type="button" 
            onClick={next}
            className="btn-scale flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#ff5a5f] to-[#ff3d42] text-white font-bold text-sm shadow-[0_0_16px_rgba(255,90,95,0.3)] hover:shadow-[0_0_24px_rgba(255,90,95,0.5)] transition-all"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={() => handleSubmit(false)} 
              disabled={submitting}
              className="btn-scale flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-white/10 text-white hover:bg-white/5 font-bold text-sm disabled:opacity-40"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : "Save as Draft"}
            </button>
            
            <button 
              type="button" 
              onClick={() => handleSubmit(true)} 
              disabled={submitting}
              className="btn-scale flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#ff5a5f] to-[#ff3d42] text-white font-bold text-sm shadow-[0_0_20px_rgba(255,90,95,0.4)] hover:shadow-[0_0_30px_rgba(255,90,95,0.6)] disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Publish Now
                </>
              )}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
