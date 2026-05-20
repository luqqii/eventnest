"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, ArrowLeft, Lock, User,
  Loader2, AlertCircle, QrCode, CreditCard, Zap, Tag, X, Check,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  eventApi, orderApi, paymentApi, promoCodeApi, extractError,
  ApiEvent, ApiTicket,
} from "@/lib/api";

const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

function CheckoutForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, accessToken, isAuthenticated, isLoading: authLoading } = useAuth();

  const eventId = params.get("eventId") ?? "";
  const tierId = params.get("tierId") ?? "";
  const qty = parseInt(params.get("qty") ?? "1", 10);

  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);

  // Promo code
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoResult, setPromoResult] = useState<{
    code: string;
    discountAmount: number;
    discountType: "percent" | "fixed";
    discountValue: number;
  } | null>(null);
  const [promoError, setPromoError] = useState("");

  // Success state (direct/free orders only — Stripe goes to /checkout/success)
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderNumber: string;
    total: number;
    tickets: ApiTicket[];
  } | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(
        `/login?redirect=/checkout?eventId=${eventId}&tierId=${tierId}&qty=${qty}`
      );
    }
  }, [authLoading, isAuthenticated, router, eventId, tierId, qty]);

  // Pre-fill form from user profile
  useEffect(() => {
    if (user) {
      setForm((f) => ({ ...f, name: user.name ?? "", email: user.email ?? "" }));
    }
  }, [user]);

  // Fetch event
  useEffect(() => {
    if (!eventId) return;
    setEventLoading(true);
    eventApi.get(eventId).then((res) => {
      if (res.success && res.data) setEvent(res.data.event);
      else setGlobalError("Event not found.");
      setEventLoading(false);
    });
  }, [eventId]);

  const selectedTier = event?.ticketTiers?.find((t) => t._id === tierId) ?? event?.ticketTiers?.[0];
  const unitPrice = selectedTier?.price ?? 0;
  const subtotal = unitPrice * qty;
  const fee = Math.round(subtotal * 0.08 * 100) / 100;
  const discount = promoResult?.discountAmount ?? 0;
  const total = Math.max(0, Math.round((subtotal + fee - discount) * 100) / 100);

  // Use Stripe when key is configured AND tickets are not free
  const useStripe = Boolean(STRIPE_KEY) && total > 0;

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!selectedTier?._id || !eventId || !accessToken) return;

    setLoading(true);
    setGlobalError("");

    const lines = [{ tierId: selectedTier._id, quantity: qty }];
    const billingInfo = { name: form.name, email: form.email, phone: form.phone };
    const promoCode = promoResult?.code;

    // ── Stripe path ──────────────────────────────────────────────────────────
    if (useStripe) {
      const res = await paymentApi.createSession(
        { eventId, lines, billingInfo, ...(promoCode ? { promoCode } : {}) } as Parameters<typeof paymentApi.createSession>[0],
        accessToken
      );
      setLoading(false);
      if (!res.success || !res.data) {
        setGlobalError(extractError(res));
        return;
      }
      // Redirect to Stripe Checkout
      window.location.href = res.data.url;
      return;
    }

    // ── Direct/free path ─────────────────────────────────────────────────────
    const res = await orderApi.create({ eventId, lines, billingInfo, ...(promoCode ? { promoCode } : {}) } as Parameters<typeof orderApi.create>[0], accessToken);
    setLoading(false);

    if (!res.success || !res.data) {
      setGlobalError(extractError(res));
      return;
    }

    setConfirmedOrder({
      orderNumber: res.data.order.orderNumber,
      total: res.data.order.total,
      tickets: res.data.tickets as ApiTicket[],
    });
  }

  // ── Success screen (direct/free bookings) ─────────────────────────────────
  if (confirmedOrder) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="max-w-xl mx-auto"
      >
        <div className="rounded-3xl bg-[#112240] border border-[#ff5a5f]/25 p-8 shadow-2xl">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 220, delay: 0.15 }}
            className="w-20 h-20 rounded-full bg-[#ff5a5f]/15 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-10 h-10 text-[#ff5a5f]" />
          </motion.div>

          <h2 className="text-2xl font-extrabold text-white text-center mb-1">
            Booking Confirmed!
          </h2>
          <p className="text-white/45 text-center text-sm mb-6">
            Order{" "}
            <span className="text-white font-mono">{confirmedOrder.orderNumber}</span>
            {confirmedOrder.total > 0 && ` · $${confirmedOrder.total.toFixed(2)} paid`}
            {confirmedOrder.total === 0 && " · Free"}
          </p>

          {/* Tickets with QR codes */}
          <div className="space-y-4 mb-6">
            {confirmedOrder.tickets.map((ticket, i) => (
              <motion.div
                key={ticket.ticketCode}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="rounded-2xl bg-[#060f17] border border-white/8 overflow-hidden"
              >
                <div className="flex items-start gap-4 p-4">
                  <div className="flex-shrink-0">
                    <img
                      src={ticket.qrPayload}
                      alt="QR Code"
                      className="w-24 h-24 rounded-xl"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#ff5a5f] font-mono text-sm font-bold mb-1">
                      {ticket.ticketCode}
                    </p>
                    <p className="text-white font-semibold text-sm truncate">
                      {ticket.tierSnapshot?.name ?? "Ticket"}
                    </p>
                    <p className="text-white/40 text-xs mt-1">
                      {form.name} · {form.email}
                    </p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-[#ff5a5f]/10 text-[#ff5a5f] text-xs font-semibold">
                      Valid
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/tickets"
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#ff5a5f] text-[white] font-bold text-sm hover:bg-[#ff5a5f]/90 transition-all"
            >
              <QrCode className="w-4 h-4" />
              View All My Tickets
            </Link>
            <Link
              href="/explore"
              className="py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium text-center hover:bg-white/8 transition-all"
            >
              Explore More Events
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (authLoading || eventLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#ff5a5f] animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <p className="text-white/50">Event not found.</p>
        <Link href="/explore" className="text-[#ff5a5f] text-sm mt-2 inline-block hover:underline">
          Browse events
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/event/${event._id}`}
        className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Event
      </Link>

      <h1 className="text-3xl font-extrabold text-white mb-1">Checkout</h1>
      <p className="text-white/40 text-sm mb-8">Complete your booking below</p>

      <AnimatePresence>
        {globalError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm mb-6"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{globalError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ── Form ─────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex-1 space-y-5">
          {/* Personal info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl bg-[#112240] border border-white/8 p-6"
          >
            <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
              <User className="w-4 h-4 text-[#ff5a5f]" />
              Personal Information
            </h2>

            {[
              { key: "name", label: "Full Name *", type: "text", placeholder: "Jane Smith" },
              { key: "email", label: "Email Address *", type: "email", placeholder: "jane@example.com" },
              { key: "phone", label: "Phone (optional)", type: "tel", placeholder: "+1 (555) 000-0000" },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key} className="mb-4 last:mb-0">
                <label className="text-white/60 text-xs font-medium mb-1.5 block">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, [key]: e.target.value }));
                    setErrors((er) => ({ ...er, [key]: "" }));
                    setGlobalError("");
                  }}
                  placeholder={placeholder}
                  className={`w-full px-4 py-3 rounded-xl bg-[#060f17] border text-white placeholder-white/20 text-sm focus:outline-none transition-all ${
                    errors[key]
                      ? "border-red-500/50 focus:border-red-400"
                      : "border-white/10 focus:border-[#ff5a5f]/50"
                  }`}
                />
                {errors[key] && <p className="text-red-400 text-xs mt-1">{errors[key]}</p>}
              </div>
            ))}
          </motion.div>

          {/* Promo Code section */}
          {subtotal > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="rounded-2xl bg-[#112240] border border-white/8 p-6"
            >
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#ff5a5f]" />
                Promo Code
              </h2>

              {promoResult ? (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#ff5a5f]/8 border border-[#ff5a5f]/25">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#ff5a5f]" />
                    <span className="text-[#ff5a5f] font-mono font-bold text-sm">{promoResult.code}</span>
                    <span className="text-white/50 text-xs">
                      — {promoResult.discountType === "percent"
                        ? `${promoResult.discountValue}% off`
                        : `$${promoResult.discountValue} off`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPromoResult(null); setPromoInput(""); setPromoError(""); }}
                    className="text-white/40 hover:text-white/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                    placeholder="Enter promo code"
                    className={`flex-1 px-4 py-3 rounded-xl bg-[#060f17] border text-white placeholder-white/20 text-sm font-mono focus:outline-none transition-all ${
                      promoError ? "border-red-500/50" : "border-white/10 focus:border-[#ff5a5f]/50"
                    }`}
                  />
                  <button
                    type="button"
                    disabled={!promoInput.trim() || promoLoading}
                    onClick={async () => {
                      if (!promoInput.trim() || !accessToken) return;
                      setPromoLoading(true);
                      setPromoError("");
                      const res = await promoCodeApi.validate(
                        { code: promoInput.trim(), eventId, subtotal },
                        accessToken
                      );
                      setPromoLoading(false);
                      if (res.success && res.data) {
                        setPromoResult({
                          code: res.data.code,
                          discountAmount: res.data.discountAmount,
                          discountType: res.data.discountType,
                          discountValue: res.data.discountValue,
                        });
                      } else {
                        setPromoError(extractError(res));
                      }
                    }}
                    className="px-5 py-3 rounded-xl bg-[#ff5a5f]/15 border border-[#ff5a5f]/25 text-[#ff5a5f] font-semibold text-sm hover:bg-[#ff5a5f]/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                  >
                    {promoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                  </button>
                </div>
              )}
              {promoError && <p className="text-red-400 text-xs mt-2">{promoError}</p>}
            </motion.div>
          )}

          {/* Payment section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl bg-[#112240] border border-white/8 p-6"
          >
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#ff5a5f]" />
              Payment
            </h2>

            {useStripe ? (
              <div className="rounded-xl bg-[#060f17] border border-[#635bff]/25 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#635bff]/15 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-[#635bff]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">Secure payment via Stripe</p>
                    <p className="text-white/40 text-xs">You'll be redirected to Stripe Checkout</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                  <Lock className="w-3 h-3 text-white/30" />
                  <span className="text-white/30 text-xs">
                    256-bit SSL · Visa · Mastercard · Amex · Apple Pay
                  </span>
                </div>
              </div>
            ) : total === 0 ? (
              <div className="rounded-xl bg-[#ff5a5f]/5 border border-[#ff5a5f]/15 p-4 flex items-center gap-3">
                <Zap className="w-4 h-4 text-[#ff5a5f]" />
                <div>
                  <p className="text-[#ff5a5f] text-sm font-semibold">Free Event</p>
                  <p className="text-white/40 text-xs">No payment required — confirm to get your ticket</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-red-500/10 border border-red-500/25 p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3 text-red-400 font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">Payment gateway not configured</span>
                </div>
                <p className="text-white/40 text-xs">
                  Stripe is not configured in this environment. Paid ticket checkout is currently unavailable.
                </p>
              </div>
            )}
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            type="submit"
            disabled={loading || (total > 0 && !STRIPE_KEY)}
            className="w-full py-4 rounded-xl bg-[#ff5a5f] text-[white] font-bold text-sm
              shadow-[0_0_20px_rgba(255,90,95,0.3)] hover:shadow-[0_0_30px_rgba(255,90,95,0.45)]
              disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />
                {useStripe ? "Redirecting to Stripe…" : "Processing…"}
              </>
            ) : useStripe ? (
              <><CreditCard className="w-4 h-4" /> Pay ${total.toFixed(2)} with Stripe</>
            ) : total === 0 ? (
              <><CheckCircle className="w-4 h-4" /> Confirm Free Booking</>
            ) : (
              <><Lock className="w-4 h-4" /> Checkout Disabled</>
            )}
          </motion.button>

          <p className="text-white/25 text-xs text-center">
            By completing this booking you agree to our Terms of Service
          </p>
        </form>

        {/* ── Order summary ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="lg:w-72 flex-shrink-0"
        >
          <div className="rounded-2xl bg-[#112240] border border-white/8 overflow-hidden sticky top-24">
            {event.coverImage && (
              <div className="h-32 overflow-hidden relative">
                <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#112240] to-transparent" />
              </div>
            )}
            <div className="p-5">
              <h3 className="text-white font-bold text-sm mb-1 line-clamp-2">{event.title}</h3>
              <p className="text-white/40 text-xs mb-5">{event.venue?.city}, {event.venue?.country}</p>

              <div className="rounded-xl bg-[#060f17] border border-white/8 px-3 py-2 mb-4">
                <p className="text-white/50 text-xs mb-0.5">Ticket</p>
                <p className="text-white text-sm font-semibold">{selectedTier?.name ?? "General"}</p>
                <p className="text-white/40 text-xs">Qty: {qty}</p>
              </div>

              <div className="space-y-2 text-sm">
                {subtotal > 0 ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-white/50">${unitPrice.toFixed(2)} × {qty}</span>
                      <span className="text-white">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Service fee (8%)</span>
                      <span className="text-white">${fee.toFixed(2)}</span>
                    </div>
                    {promoResult && (
                      <div className="flex justify-between text-[#ff5a5f]">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {promoResult.code}
                        </span>
                        <span>−${promoResult.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                ) : null}
                <div className="flex justify-between font-bold border-t border-white/8 pt-2.5 mt-1">
                  <span className="text-white">Total</span>
                  <span className="text-[#ff5a5f] text-base">
                    {total === 0 ? "Free" : `$${total.toFixed(2)}`}
                  </span>
                </div>
              </div>

              {useStripe && (
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-white/20" />
                  <span className="text-white/25 text-xs">Powered by Stripe</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#ff5a5f] animate-spin" />
        </div>
      }>
        <CheckoutForm />
      </Suspense>
    </div>
  );
}
