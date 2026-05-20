"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Ticket, AlertCircle, Loader2, Sparkles, User, Building, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { ShakeError } from "@/components/animations";
import Script from "next/script";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectParam = params.get("redirect");
  const redirect = (redirectParam && !redirectParam.startsWith("/login") && !redirectParam.startsWith("/signup"))
    ? redirectParam
    : "/";
  const { login, logout, loginWithGoogle, isAuthenticated, user, isLoading: authLoading } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shakeCount, setShakeCount] = useState(0);
  const [focused, setFocused] = useState<string | null>(null);

  // Role Tab state for demo selection and visual theme
  const [activeRole, setActiveRole] = useState<"attendee" | "organizer" | "admin">("attendee");

  const roleConfig = {
    attendee: {
      title: "Attendee Portal",
      subtitle: "Sign in to discover events & book tickets",
      accent: "#ff5a5f",
      glow: "rgba(255,90,95,0.06)",
      shadow: "rgba(255,90,95,0.4)",
      borderFocus: "rgba(255,90,95,0.5)",
      ring: "0 0 0 3px rgba(255,90,95,0.08)",
      autofillBg: "rgba(255,90,95,0.05)",
      autofillBorder: "rgba(255,90,95,0.2)",
      autofillHover: "rgba(255,90,95,0.1)",
    },
    organizer: {
      title: "Organizer Portal",
      subtitle: "Sign in to manage events & track sales",
      accent: "#00d26a",
      glow: "rgba(0,210,106,0.06)",
      shadow: "rgba(0,210,106,0.4)",
      borderFocus: "rgba(0,210,106,0.5)",
      ring: "0 0 0 3px rgba(0,210,106,0.08)",
      autofillBg: "rgba(0,210,106,0.05)",
      autofillBorder: "rgba(0,210,106,0.2)",
      autofillHover: "rgba(0,210,106,0.1)",
    },
    admin: {
      title: "Admin Portal",
      subtitle: "Secure access for platform administration",
      accent: "#a855f7",
      glow: "rgba(168,85,247,0.06)",
      shadow: "rgba(168,85,247,0.4)",
      borderFocus: "rgba(168,85,247,0.5)",
      ring: "0 0 0 3px rgba(168,85,247,0.08)",
      autofillBg: "rgba(168,85,247,0.05)",
      autofillBorder: "rgba(168,85,247,0.2)",
      autofillHover: "rgba(168,85,247,0.1)",
    },
  };

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
    setError("");
  }

  // Role validation helper
  async function validateUserRole(loggedUser: any): Promise<boolean> {
    if (!loggedUser) return true;
    if (activeRole === "admin" && loggedUser.role !== "admin") {
      await logout();
      setError("Access Denied. This account does not have Admin privileges.");
      setShakeCount((n) => n + 1);
      return false;
    }
    if (activeRole === "organizer" && loggedUser.role !== "organizer" && loggedUser.role !== "admin") {
      await logout();
      setError("Access Denied. This account is registered as an Attendee. Please select the Attendee tab.");
      setShakeCount((n) => n + 1);
      return false;
    }
    if (activeRole === "attendee" && loggedUser.role !== "attendee") {
      await logout();
      setError(`Access Denied. This account is registered as an ${loggedUser.role.charAt(0).toUpperCase() + loggedUser.role.slice(1)}. Please select the correct tab.`);
      setShakeCount((n) => n + 1);
      return false;
    }
    return true;
  }

  // Handle Google OAuth Callback
  async function handleGoogleCredentialResponse(credential: string) {
    setLoading(true);
    setError("");
    const result = await loginWithGoogle(credential);
    if (!result.ok) {
      setLoading(false);
      setError(result.error ?? "Google sign-in failed.");
      setShakeCount((n) => n + 1);
      return;
    }
    const isValid = await validateUserRole(result.user);
    setLoading(false);
    if (isValid) {
      toast.success("Welcome back (Google Auth)!");
      // Redirect handled by useEffect
    }
  }

  // Initialize GSI client
  function initGoogleSignIn() {
    if (typeof window === "undefined" || !(window as any).google) return;
    try {
      (window as any).google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "mock-client-id",
        callback: (res: any) => handleGoogleCredentialResponse(res.credential),
      });
      (window as any).google.accounts.id.renderButton(
        document.getElementById("google-login-btn"),
        { theme: "outline", size: "large", width: 380, text: "continue_with" }
      );
    } catch (err) {
      console.warn("[Google Auth] Could not render real Google Button:", err);
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).google) {
      initGoogleSignIn();
    }
  }, []);

  // Form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please fill in all fields.");
      setShakeCount((n) => n + 1);
      return;
    }
    setLoading(true);
    const result = await login(form.email, form.password);
    if (!result.ok) {
      setLoading(false);
      setError(result.error ?? "Login failed. Please check your credentials.");
      setShakeCount((n) => n + 1);
      return;
    }
    const isValid = await validateUserRole(result.user);
    setLoading(false);
    if (isValid) {
      toast.success("Welcome back!");
      // Redirect handled by useEffect
    }
  }

  // Trigger autofill & auto login for demo purposes
  async function handleAutofillLogin(role: typeof activeRole) {
    let email = "attendee@eventnest.dev";
    let password = "password123";

    if (role === "organizer") {
      email = "organizer@eventnest.dev";
    } else if (role === "admin") {
      email = "admin@eventnest.dev";
    }

    setForm({ email, password });
    setError("");

    setLoading(true);
    const result = await login(email, password);
    if (!result.ok) {
      setLoading(false);
      setError(result.error ?? `Could not autofill login for ${role}.`);
      setShakeCount((n) => n + 1);
      return;
    }
    const isValid = await validateUserRole(result.user);
    setLoading(false);
    if (isValid) {
      toast.success(`Logged in as Demo ${role.charAt(0).toUpperCase() + role.slice(1)}!`);
      // Redirect handled by useEffect
    }
  }

  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#060f17]">
        <Loader2 className="w-8 h-8 text-[#ff5a5f] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16 bg-[#060f17] overflow-hidden relative">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initGoogleSignIn}
      />

      {/* Background glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[100px] pointer-events-none transition-all duration-500"
        style={{ backgroundColor: roleConfig[activeRole].glow }}
      />

      <motion.div
        initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Card */}
        <div className="rounded-3xl bg-[#112240] border border-white/8 overflow-hidden shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-white/6">
            <Link href="/" className="flex items-center gap-2 w-fit mb-6">
              <motion.div
                whileHover={{ scale: 1.1, rotate: -5 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300"
                style={{
                  backgroundColor: roleConfig[activeRole].accent,
                  boxShadow: `0 0 14px ${roleConfig[activeRole].shadow}`,
                }}
              >
                <Ticket className="w-5 h-5 text-white" />
              </motion.div>
              <span className="text-white font-bold text-lg tracking-tight">
                Event<span className="transition-colors duration-300" style={{ color: roleConfig[activeRole].accent }}>Nest</span>
              </span>
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1 transition-all duration-300">
              {roleConfig[activeRole].title}
            </h1>
            <p className="text-white/45 text-sm transition-all duration-300">
              {roleConfig[activeRole].subtitle}
            </p>
          </div>

          {/* Role selector tabs */}
          <div className="px-8 pt-4">
            <label className="text-white/55 text-xs font-medium mb-1.5 block">
              Login Role Area
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#060f17] border border-white/5">
              {[
                { key: "attendee", label: "Attendee", icon: User },
                { key: "organizer", label: "Organizer", icon: Building },
                { key: "admin", label: "Admin", icon: Shield },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveRole(key as any);
                    setError("");
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    activeRole === key
                      ? "text-white shadow-md"
                      : "text-white/45 hover:text-white hover:bg-white/[0.04]"
                  }`}
                  style={
                    activeRole === key
                      ? {
                          backgroundColor: roleConfig[key as keyof typeof roleConfig].accent,
                          boxShadow: `0 4px 12px ${roleConfig[key as keyof typeof roleConfig].shadow}`,
                        }
                      : {}
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            {/* Error banner with shake */}
            <AnimatePresence>
              {error && (
                <ShakeError shake={shakeCount}>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                </ShakeError>
              )}
            </AnimatePresence>

            {/* Email */}
            <div>
              <label className="text-white/55 text-xs font-medium mb-1.5 block">
                Email address
              </label>
              <div className="relative">
                <motion.div
                  animate={{ color: focused === "email" ? roleConfig[activeRole].accent : "rgba(255,255,255,0.3)" }}
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#060f17] border text-white placeholder-white/20 text-sm focus:outline-none transition-all duration-200"
                  style={{
                    borderColor: focused === "email" ? roleConfig[activeRole].borderFocus : "rgba(255,255,255,0.1)",
                    boxShadow: focused === "email" ? roleConfig[activeRole].ring : "none",
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-white/55 text-xs font-medium">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs hover:underline transition-colors duration-300"
                  style={{ color: roleConfig[activeRole].accent }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <motion.div
                  animate={{ color: focused === "password" ? roleConfig[activeRole].accent : "rgba(255,255,255,0.3)" }}
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
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#060f17] border text-white placeholder-white/20 text-sm focus:outline-none transition-all duration-200"
                  style={{
                    borderColor: focused === "password" ? roleConfig[activeRole].borderFocus : "rgba(255,255,255,0.1)",
                    boxShadow: focused === "password" ? roleConfig[activeRole].ring : "none",
                  }}
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
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={!loading ? { scale: 1.015 } : {}}
              whileTap={!loading ? { scale: 0.975 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm
                disabled:opacity-60 disabled:cursor-not-allowed
                transition-all duration-300 mt-2"
              style={{
                backgroundColor: roleConfig[activeRole].accent,
                boxShadow: `0 4px 18px ${roleConfig[activeRole].shadow}`,
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </motion.button>

            {/* Quick Demo Autofill button */}
            <motion.button
              type="button"
              onClick={() => handleAutofillLogin(activeRole)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-200"
              style={{
                borderColor: roleConfig[activeRole].autofillBorder,
                backgroundColor: roleConfig[activeRole].autofillBg,
                color: roleConfig[activeRole].accent,
              }}
              whileHover={{ backgroundColor: roleConfig[activeRole].autofillHover }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Autofill {activeRole.charAt(0).toUpperCase() + activeRole.slice(1)} Demo Credentials</span>
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-3 pt-3">
              <div className="h-px bg-white/6 flex-1" />
              <span className="text-white/20 text-xs uppercase tracking-wider font-semibold">Or</span>
              <div className="h-px bg-white/6 flex-1" />
            </div>

            {/* Google OAuth Login containers */}
            <div className="flex flex-col gap-2.5">
              <div id="google-login-btn" className="w-full flex justify-center mt-1" />
            </div>
          </form>

          {/* Footer */}
          <div className="px-8 pb-8 text-center">
            <p className="text-white/35 text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href={`/signup${redirect !== "/" ? `?redirect=${redirect}` : ""}`}
                className="font-medium hover:underline transition-colors duration-300"
                style={{ color: roleConfig[activeRole].accent }}
              >
                Create one free
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center animate-pulse">
        <Loader2 className="w-8 h-8 text-[#ff5a5f] animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
