"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, Ticket, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { authApi, extractError } from "@/lib/api";
import { ShakeError } from "@/components/animations";
import toast from "react-hot-toast";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const [focused, setFocused] = useState<string | null>(null);

  function setField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      setError("Reset token is missing in the URL.");
      setShakeCount((n) => n + 1);
      return;
    }

    if (!form.password || !form.confirmPassword) {
      setError("Please fill in all fields.");
      setShakeCount((n) => n + 1);
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setShakeCount((n) => n + 1);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      setShakeCount((n) => n + 1);
      return;
    }

    setLoading(true);
    setError("");

    const res = await authApi.resetPassword({
      token,
      password: form.password,
    });
    setLoading(false);

    if (!res.success) {
      setError(extractError(res));
      setShakeCount((n) => n + 1);
      return;
    }

    toast.success("Password reset successful!");
    setSuccess(true);
    setTimeout(() => {
      router.push("/login");
    }, 3000);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16 bg-[#060f17]">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-[#ff5a5f]/6 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl bg-[#112240] border border-white/8 overflow-hidden shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-white/6">
            <Link href="/" className="flex items-center gap-2 w-fit mb-6">
              <div className="w-8 h-8 rounded-lg bg-[#ff5a5f] flex items-center justify-center shadow-[0_0_14px_rgba(255,90,95,0.4)]">
                <Ticket className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-lg tracking-tight">
                Event<span className="text-[#ff5a5f]">Nest</span>
              </span>
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1">
              Set new password
            </h1>
            <p className="text-white/45 text-sm">
              Please enter your new password below.
            </p>
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {!success ? (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  {/* Error banner with shake */}
                  {error && (
                    <ShakeError shake={shakeCount}>
                      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    </ShakeError>
                  )}

                  {/* Password */}
                  <div>
                    <label className="text-white/55 text-xs font-medium mb-1.5 block">
                      New password
                    </label>
                    <div className="relative">
                      <div
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
                        style={{ color: focused === "password" ? "#ff5a5f" : "rgba(255,255,255,0.3)" }}
                      >
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPw ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setField("password", e.target.value)}
                        onFocus={() => setFocused("password")}
                        onBlur={() => setFocused(null)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#060f17] border text-white placeholder-white/20 text-sm focus:outline-none transition-all duration-200"
                        style={{
                          borderColor: focused === "password" ? "rgba(255,90,95,0.5)" : "rgba(255,255,255,0.1)",
                          boxShadow: focused === "password" ? "0 0 0 3px rgba(255,90,95,0.08)" : "none",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                        tabIndex={-1}
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="text-white/55 text-xs font-medium mb-1.5 block">
                      Confirm new password
                    </label>
                    <div className="relative">
                      <div
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
                        style={{ color: focused === "confirmPassword" ? "#ff5a5f" : "rgba(255,255,255,0.3)" }}
                      >
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPw ? "text" : "password"}
                        value={form.confirmPassword}
                        onChange={(e) => setField("confirmPassword", e.target.value)}
                        onFocus={() => setFocused("confirmPassword")}
                        onBlur={() => setFocused(null)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#060f17] border text-white placeholder-white/20 text-sm focus:outline-none transition-all duration-200"
                        style={{
                          borderColor: focused === "confirmPassword" ? "rgba(255,90,95,0.5)" : "rgba(255,255,255,0.1)",
                          boxShadow: focused === "confirmPassword" ? "0 0 0 3px rgba(255,90,95,0.08)" : "none",
                        }}
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={!loading ? { scale: 1.015 } : {}}
                    whileTap={!loading ? { scale: 0.975 } : {}}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#ff5a5f] text-white font-bold text-sm
                      shadow-[0_0_18px_rgba(255,90,95,0.35)]
                      hover:shadow-[0_0_28px_rgba(255,90,95,0.5)]
                      disabled:opacity-60 disabled:cursor-not-allowed
                      transition-shadow duration-200 mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving password…
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </motion.button>
                </motion.form>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">Password reset successful</h3>
                  <p className="text-white/45 text-sm leading-relaxed">
                    Your password has been successfully updated. Redirecting you to the sign-in page in a few seconds…
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#ff5a5f] animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
