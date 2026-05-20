"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Lock, Eye, EyeOff, Ticket, AlertCircle,
  Loader2, Users, Calendar,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { ShakeError } from "@/components/animations";
import Script from "next/script";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "attendee" | "organizer";

const ROLE_OPTIONS: { value: Role; label: string; desc: string; icon: typeof Users }[] = [
  { value: "attendee",  label: "Attendee",  desc: "Discover and book events", icon: Users    },
  { value: "organizer", label: "Organizer", desc: "Create and sell tickets",  icon: Calendar },
];

// ─── Password strength ────────────────────────────────────────────────────────

function getStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw.length) return { level: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8)            score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw))  score++;
  if (score <= 1) return { level: score, label: "Weak",   color: "bg-red-500"   };
  if (score === 2) return { level: score, label: "Fair",   color: "bg-amber-400" };
  if (score === 3) return { level: score, label: "Good",   color: "bg-blue-400"  };
  return              { level: score, label: "Strong", color: "bg-[#ff5a5f]" };
}

// ─── Field error ──────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1.5 mt-1.5 text-xs text-red-400"
    >
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {msg}
    </motion.p>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function SignupForm() {
  const router   = useRouter();
  const params   = useSearchParams();
  const redirectParam = params.get("redirect");
  const redirect = (redirectParam && !redirectParam.startsWith("/login") && !redirectParam.startsWith("/signup"))
    ? redirectParam
    : "/";
  const { signup, loginWithGoogle, isAuthenticated, user, isLoading: authLoading } = useAuth();

  const [form, setForm]           = useState({ name: "", email: "", password: "", role: "attendee" as Role });
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [shakeCount, setShakeCount]   = useState(0);
  const [focused, setFocused]         = useState<string | null>(null);

  async function handleGoogleCredentialResponse(credential: string) {
    setLoading(true);
    setGlobalError("");
    const { ok, error: err } = await loginWithGoogle(credential);
    setLoading(false);
    if (!ok) {
      setGlobalError(err ?? "Google registration failed.");
      setShakeCount((n) => n + 1);
      return;
    }
    toast.success("Welcome back (Google Auth)!");
    // The redirect will be handled by the useEffect automatically
  }

  function initGoogleSignIn() {
    if (typeof window === "undefined" || !(window as any).google) return;
    try {
      (window as any).google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "mock-client-id",
        callback: (res: any) => handleGoogleCredentialResponse(res.credential),
      });
      (window as any).google.accounts.id.renderButton(
        document.getElementById("google-signup-btn"),
        { theme: "outline", size: "large", width: 380, text: "signup_with" }
      );
    } catch (err) {
      console.warn("[Google Auth] Could not render Google signup button:", err);
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).google) {
      initGoogleSignIn();
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (redirect === "/") {
        if (user.role === "admin") {
          router.replace("/admin");
        } else if (user.role === "organizer") {
          router.replace("/dashboard");
        } else {
          router.replace("/");
        }
      } else {
        router.replace(redirect);
      }
    }
  }, [isAuthenticated, authLoading, user, router, redirect]);

  function setField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((e) => { const n = { ...e }; delete n[field]; return n; });
    setGlobalError("");
  }

  const strength = getStrength(form.password);

  function validateClient(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!form.name.trim())          e.name = "Full name is required.";
    else if (form.name.trim().length < 2) e.name = "Name must be at least 2 characters.";
    if (!form.email.trim())         e.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address.";
    if (!form.password)             e.password = "Password is required.";
    else if (form.password.length < 8) e.password = "Must be at least 8 characters.";
    else if (!/[A-Z]/.test(form.password)) e.password = "Must contain an uppercase letter.";
    else if (!/[0-9]/.test(form.password)) e.password = "Must contain a number.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clientErrs = validateClient();
    if (Object.keys(clientErrs).length) {
      setFieldErrors(clientErrs);
      setShakeCount((n) => n + 1);
      return;
    }
    setLoading(true);
    setGlobalError("");
    setFieldErrors({});
    const result = await signup(form);
    setLoading(false);
    if (!result.ok) {
      if (result.fieldErrors && Object.keys(result.fieldErrors).length) {
        setFieldErrors(result.fieldErrors);
        if (result.error && !Object.values(result.fieldErrors).includes(result.error ?? ""))
          setGlobalError(result.error ?? "");
      } else {
        setGlobalError(result.error ?? "Signup failed. Please try again.");
      }
      setShakeCount((n) => n + 1);
      return;
    }
    toast.success("Account created! Welcome aboard.");
    router.push(redirect);
  }

  // Shared input border/ring helper
  function inputStyle(field: string) {
    if (fieldErrors[field]) return "border-red-500/50 ring-1 ring-red-500/20";
    if (focused === field)  return "border-[#ff5a5f]/50 ring-1 ring-[#ff5a5f]/12";
    return "border-white/10";
  }

  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#060f17]">
        <Loader2 className="w-8 h-8 text-[#ff5a5f] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16 bg-[#060f17]">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[#ff5a5f]/6 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0,  filter: "blur(0px)" }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl bg-[#112240] border border-white/8 overflow-hidden shadow-2xl shadow-black/50">

          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-white/6">
            <Link href="/" className="flex items-center gap-2 w-fit mb-6">
              <motion.div
                whileHover={{ scale: 1.1, rotate: -5 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="w-8 h-8 rounded-lg bg-[#ff5a5f] flex items-center justify-center shadow-[0_0_14px_rgba(255,90,95,0.4)]"
              >
                <Ticket className="w-5 h-5 text-white" />
              </motion.div>
              <span className="text-white font-bold text-lg tracking-tight">
                Event<span className="text-[#ff5a5f]">Nest</span>
              </span>
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1">
              Create your account
            </h1>
            <p className="text-white/45 text-sm">Free forever. No credit card required.</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">

            {/* Global error with shake */}
            <AnimatePresence>
              {globalError && (
                <ShakeError shake={shakeCount}>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{globalError}</span>
                  </motion.div>
                </ShakeError>
              )}
            </AnimatePresence>

            {/* Role selector */}
            <div>
              <label className="text-white/55 text-xs font-medium mb-2 block">I want to…</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map(({ value, label, desc, icon: Icon }) => {
                  const active = form.role === value;
                  return (
                    <motion.button
                      key={value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, role: value }))}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className={`flex flex-col items-start gap-1 p-3.5 rounded-xl border text-left transition-colors duration-200 ${
                        active
                          ? "border-[#ff5a5f]/50 bg-[#ff5a5f]/8 shadow-[inset_0_0_0_1px_rgba(255,90,95,0.15)]"
                          : "border-white/8 bg-[#060f17] hover:border-white/18"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <motion.div
                          animate={{ color: active ? "#ff5a5f" : "rgba(255,255,255,0.35)" }}
                          transition={{ duration: 0.2 }}
                        >
                          <Icon className="w-4 h-4" />
                        </motion.div>
                        <span className={`text-sm font-semibold transition-colors ${active ? "text-[#ff5a5f]" : "text-white/65"}`}>
                          {label}
                        </span>
                        {active && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto w-3.5 h-3.5 rounded-full bg-[#ff5a5f] flex items-center justify-center"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-[#112240]" />
                          </motion.div>
                        )}
                      </div>
                      <span className="text-white/35 text-xs leading-tight">{desc}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-white/55 text-xs font-medium mb-1.5 block">Full name</label>
              <div className="relative">
                <motion.div
                  animate={{ color: focused === "name" ? "#ff5a5f" : fieldErrors.name ? "#f87171" : "rgba(255,255,255,0.3)" }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                >
                  <User className="w-4 h-4" />
                </motion.div>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  onFocus={() => setFocused("name")}
                  onBlur={() => setFocused(null)}
                  placeholder="Jane Smith"
                  autoComplete="name"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-[#060f17] border text-white placeholder-white/20 text-sm focus:outline-none transition-all duration-200 ${inputStyle("name")}`}
                />
              </div>
              <FieldError msg={fieldErrors.name} />
            </div>

            {/* Email */}
            <div>
              <label className="text-white/55 text-xs font-medium mb-1.5 block">Email address</label>
              <div className="relative">
                <motion.div
                  animate={{ color: focused === "email" ? "#ff5a5f" : fieldErrors.email ? "#f87171" : "rgba(255,255,255,0.3)" }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                >
                  <Mail className="w-4 h-4" />
                </motion.div>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-[#060f17] border text-white placeholder-white/20 text-sm focus:outline-none transition-all duration-200 ${inputStyle("email")}`}
                />
              </div>
              <FieldError msg={fieldErrors.email} />
            </div>

            {/* Password */}
            <div>
              <label className="text-white/55 text-xs font-medium mb-1.5 block">Password</label>
              <div className="relative">
                <motion.div
                  animate={{ color: focused === "password" ? "#ff5a5f" : fieldErrors.password ? "#f87171" : "rgba(255,255,255,0.3)" }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                >
                  <Lock className="w-4 h-4" />
                </motion.div>
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  autoComplete="new-password"
                  className={`w-full pl-10 pr-11 py-3 rounded-xl bg-[#060f17] border text-white placeholder-white/20 text-sm focus:outline-none transition-all duration-200 ${inputStyle("password")}`}
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  whileTap={{ scale: 0.85 }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </motion.button>
              </div>
              <FieldError msg={fieldErrors.password} />

              {/* Strength bar */}
              <AnimatePresence>
                {form.password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 overflow-hidden"
                  >
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map((lvl) => (
                        <motion.div
                          key={lvl}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.3, delay: (lvl - 1) * 0.05 }}
                          style={{ originX: 0 }}
                          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                            lvl <= strength.level ? strength.color : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs transition-colors duration-300 ${strength.level >= 3 ? "text-[#ff5a5f]" : "text-white/40"}`}>
                      {strength.label}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={!loading ? { scale: 1.015 } : {}}
              whileTap={!loading ? { scale: 0.975 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#ff5a5f] text-white font-bold text-sm
                shadow-[0_0_18px_rgba(255,90,95,0.35)]
                hover:shadow-[0_0_28px_rgba(255,90,95,0.5)]
                disabled:opacity-60 disabled:cursor-not-allowed
                transition-shadow duration-200 mt-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                : "Create Account"
              }
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-3 pt-3">
              <div className="h-px bg-white/6 flex-1" />
              <span className="text-white/20 text-xs uppercase tracking-wider font-semibold">Or</span>
              <div className="h-px bg-white/6 flex-1" />
            </div>

            {/* Google Signup Button */}
            <div className="flex flex-col gap-2.5">
              <div id="google-signup-btn" className="w-full flex justify-center mt-1" />
            </div>

            <p className="text-white/25 text-xs text-center pt-2">
              By signing up you agree to our{" "}
              <Link href="#" className="text-white/45 hover:underline">Terms</Link>
              {" "}and{" "}
              <Link href="#" className="text-white/45 hover:underline">Privacy Policy</Link>
            </p>
          </form>
          <Script
            src="https://accounts.google.com/gsi/client"
            strategy="afterInteractive"
            onLoad={initGoogleSignIn}
          />

          <div className="px-8 pb-8 text-center">
            <p className="text-white/35 text-sm">
              Already have an account?{" "}
              <Link
                href={`/login${redirect !== "/" ? `?redirect=${redirect}` : ""}`}
                className="text-[#ff5a5f] font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 px-4 py-3 rounded-2xl bg-[#112240]/60 border border-white/6 text-center"
        >
          <p className="text-white/25 text-xs">
            Backend must be running on{" "}
            <code className="text-white/45 font-mono">:5000</code>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#ff5a5f] animate-spin" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
