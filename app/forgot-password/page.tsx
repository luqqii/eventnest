"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowLeft, Ticket, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { authApi, extractError } from "@/lib/api";
import { ShakeError } from "@/components/animations";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const [focused, setFocused] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      setShakeCount((n) => n + 1);
      return;
    }

    setLoading(true);
    setError("");

    const res = await authApi.forgotPassword(email);
    setLoading(false);

    if (!res.success) {
      setError(extractError(res));
      setShakeCount((n) => n + 1);
      return;
    }

    setSuccess(true);
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
              Reset your password
            </h1>
            <p className="text-white/45 text-sm">
              We will email you a link to reset your password.
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
                  className="space-y-5"
                >
                  {/* Error message */}
                  {error && (
                    <ShakeError shake={shakeCount}>
                      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    </ShakeError>
                  )}

                  {/* Email */}
                  <div>
                    <label className="text-white/55 text-xs font-medium mb-1.5 block">
                      Email address
                    </label>
                    <div className="relative">
                      <div
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
                        style={{ color: focused ? "#ff5a5f" : "rgba(255,255,255,0.3)" }}
                      >
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError("");
                        }}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#060f17] border text-white placeholder-white/20 text-sm focus:outline-none transition-all duration-200"
                        style={{
                          borderColor: focused ? "rgba(255,90,95,0.5)" : "rgba(255,255,255,0.1)",
                          boxShadow: focused ? "0 0 0 3px rgba(255,90,95,0.08)" : "none",
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
                      transition-shadow duration-200"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending link…
                      </>
                    ) : (
                      "Send Reset Link"
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
                  <h3 className="text-white font-bold text-lg mb-2">Check your email</h3>
                  <p className="text-white/45 text-sm leading-relaxed mb-6">
                    We have sent a password reset link to <strong className="text-white/70">{email}</strong>. 
                    Please check your inbox and spam folder.
                  </p>


                </motion.div>
              )}
            </AnimatePresence>

            {/* Back link */}
            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-white/45 hover:text-white text-xs font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
